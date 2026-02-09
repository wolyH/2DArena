import type { MapManager } from "../../MapManager";
import { Hex } from "../../Hex";
import type { GameInputHandler } from "../../input/GameInputHandler";
import type { MenuInputHandler } from "../../input/MenuInputHandler";
import type { NetworkManager } from "../../NetworkManager";
import type { RoomState } from "../../RoomState";
import type { UiManager } from "../../ui/UiManager";
import type { UnitManager } from "../../unit/UnitManager";
import type { EventBus } from "../../utils";
import type { AllEvents } from "../events";
import type { MovementManager } from "../../MovementManager";
import type { PathPreviewManager } from "../../PathPreviewManager";
import type { FovManager } from "../../FovManager";

export class GameActionEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager
    readonly #networkManager: NetworkManager;
    readonly #mapManager: MapManager;
    readonly #gameInputHandler: GameInputHandler;
    readonly #menuInputHandler: MenuInputHandler;
    readonly #unitManager: UnitManager;
    readonly #pathPreviewManager: PathPreviewManager
    readonly #movementManager: MovementManager;
    readonly #fovManager: FovManager;
    readonly #roomState: RoomState;

    constructor(
        eventBus: EventBus<AllEvents>,
        uiManager: UiManager,
        networkManager: NetworkManager,
        mapManager: MapManager,
        gameInputHandler: GameInputHandler,
        menuInputHandler: MenuInputHandler,
        unitManager: UnitManager,
        pathPreviewManager: PathPreviewManager,
        movementManager: MovementManager,
        fovManager: FovManager,
        roomState: RoomState,
    ) {
        this.#eventBus = eventBus;
        this.#uiManager = uiManager;
        this.#networkManager = networkManager;
        this.#mapManager = mapManager;
        this.#gameInputHandler = gameInputHandler;
        this.#menuInputHandler = menuInputHandler;
        this.#unitManager = unitManager;
        this.#pathPreviewManager = pathPreviewManager;
        this.#movementManager = movementManager;
        this.#fovManager = fovManager;
        this.#roomState = roomState;
    }

    setup() {
        this.#eventBus.on("unit_attack_requested", (hex) => {
            const payload = {
                type: "UNIT_ATTACK", 
                unitIdx: this.#unitManager.unitIdx, 
                goal: {q: hex.q, r: hex.r}
            };

            this.#networkManager.sendGameAction(
                this.#roomState.room.roomId, 
                payload, 
                "unit-action"
            );
        });

        this.#eventBus.on("unit_attack", (data) => {
            if(data.attackerIdx !== this.#unitManager.unitIdx) {
                throw new Error("Unit cannot attack");
            }
            const hex = this.#mapManager.getHex(
                Hex.hashCode(
                    data.targetCoords.q, 
                    data.targetCoords.r
                )
            );

            if (!hex || !hex.unit) {
                throw new Error("Target hex or unit not found");
            }

            const activeUnit = this.#unitManager.getActiveUnit();

            if (!this.#unitManager.canBeAttacked(hex, activeUnit)) {
                throw new Error("Hex cannot be attacked");
            }

            const dx = hex!.unit!.x - activeUnit.x;
            this.#unitManager.updateUnitDirection(activeUnit, dx);
            activeUnit.strike();
            hex.unit.die();
            this.#fovManager.setFov(data.fov);
        });

        this.#eventBus.on("unit_move_requested", (hex) => {
            const payload = {
                type: "UNIT_MOVE", 
                unitIdx: this.#unitManager.unitIdx, 
                goal: {q: hex.q, r: hex.r}
            };
            this.#networkManager.sendGameAction(
                this.#roomState.room.roomId, 
                payload, 
                "unit-action"
            );
        });

        this.#eventBus.on("unit_move", (data) => {
            if(data.unitIdx !== this.#unitManager.unitIdx) {
                throw new Error("Unit cannot move");
            }
            if (data.path.length < 2) {
                throw new Error("Path length should be > 2");
            }

            const path: Array<Hex> = [];

            for (let i = 0 ; i < data.path.length ; i++) {
                const hex = this.#mapManager.getHex(
                    Hex.hashCode(data.path[i].q, data.path[i].r)
                ); 
                if(!hex) {
                    throw new Error(`Hex number ${i} on path is undefined`);
                }
                path.push(hex);
            }

            this.#movementManager.setMovement(path, data.pathFov);
            this.#unitManager.getActiveUnit().move();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("turn_change", (nextUnitIdx) => {
            if (nextUnitIdx < 0 || nextUnitIdx > this.#unitManager.units.length) {
                throw new Error (`next unit id ${nextUnitIdx} is uncorrect`);
            }
            this.#unitManager.setUnitIdx(nextUnitIdx);
        });

        this.#eventBus.on("turn_skip_requested", () => {
            this.#networkManager.sendGameAction(
                this.#roomState.room.roomId,  
                this.#unitManager.unitIdx, 
                "turn-skip"
            );
        });

        this.#eventBus.on("map_shrink", (shrinklevel, deadUnits, fov) => {
            this.#mapManager.shrink(shrinklevel);
            for (const idx of deadUnits) {
                if (idx < 0 || idx > this.#unitManager.units.length) {
                    throw new Error (`next unit id ${idx} is uncorrect`);
                }
                this.#unitManager.units[idx].die();
            }
            this.#fovManager.setFov(fov);
        });

        this.#eventBus.on("game_over", (winner) => {
            this.#gameInputHandler.removeEventListeners();
            this.#menuInputHandler.setupEventListeners();
            this.#uiManager.showEnd(winner === this.#roomState.username);
        });
    }
}
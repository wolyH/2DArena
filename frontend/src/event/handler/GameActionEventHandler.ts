import type { MapManager } from "../../MapManager";
import { Hex } from "../../model/Hex";
import type { GameInputHandler } from "../../input/GameInputHandler";
import type { MenuInputHandler } from "../../input/MenuInputHandler";
import type { NetworkManager } from "../../NetworkManager";
import type { RoomState } from "../../RoomState";
import type { UnitManager } from "../../UnitManager";
import type { AllEvents } from "../events";
import type { PathPreviewManager } from "../../PathPreviewManager";
import type { FovManager } from "../../FovManager";
import type { EventBus } from "../../utils/EvenBus";
import type { UiManager } from "../../UiManager";
import type { MovementState } from "../../MovementState";
import type { LayoutManager } from "../../LayoutManager";

export class GameActionEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager
    readonly #networkManager: NetworkManager;
    readonly #mapManager: MapManager;
    readonly #gameInputHandler: GameInputHandler;
    readonly #menuInputHandler: MenuInputHandler;
    readonly #unitManager: UnitManager;
    readonly #pathPreviewManager: PathPreviewManager
    readonly #movementState: MovementState ;
    readonly #fovManager: FovManager;
    readonly #layoutManager: LayoutManager;
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
        movementManager: MovementState ,
        fovManager: FovManager,
        layoutManager: LayoutManager,
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
        this.#movementState = movementManager;
        this.#fovManager = fovManager;
        this.#layoutManager = layoutManager;
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
                "unit-action",
                payload
            );
        });

        this.#eventBus.on("unit_attack", (data) => {
            if(data.attackerIdx !== this.#unitManager.unitIdx) {
                throw new Error("Unit is not active");
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
            const hexPos = hex.unit.getWorldPos();

            if(hexPos.x === undefined || hexPos.y === undefined) {
                throw new Error("Target unit not visible");
            }

            const activeUnit = this.#unitManager.getActiveUnit();
            const activeUnitPos = activeUnit.getWorldPos();

            if(activeUnitPos.x === undefined || activeUnitPos.y === undefined) {
                throw new Error("active unit not visible");
            }

            if (!this.#unitManager.canBeAttacked(hex, activeUnit)) {
                throw new Error("Hex cannot be attacked");
            }

            const dx = hexPos.x - activeUnitPos.x;
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
                "unit-action",
                payload
            );
        });

        this.#eventBus.on("ally_move", (data) => {
            if(data.unitIdx !== this.#unitManager.unitIdx) {
                throw new Error("Unit is not active");
            }
            if (data.path.length < 1) {
                throw new Error("Path length should be >= 1");
            }

            const path: Array<Hex> = [];
            const enemyLocationSnapshots: Array<Map<number, Hex>> = [];

            for (let i = 0 ; i < data.path.length ; i++) {
                const hex = this.#mapManager.getHex(
                    Hex.hashCode(data.path[i].q, data.path[i].r)
                ); 
                if(!hex) {
                    throw new Error(`Hex number ${i} on path is undefined`);
                }
                path.push(hex);
                 
                const unitIdxByHex: Map<number, Hex> = new Map();
                for (const unitCoords of data.visibleUnitsAlongPath[i]) {
                    const unitHex = this.#mapManager.getHex(
                        Hex.hashCode(unitCoords.q, unitCoords.r)
                    );
                    if(!unitHex) {
                        throw new Error(
                            `Enemy location snapshot number ${i} contains an undefined hex location`
                        );
                    }
                    unitIdxByHex.set(unitCoords.idx, unitHex);
                }
                enemyLocationSnapshots.push(unitIdxByHex);
            }

            this.#movementState.set(path, data.pathFov, enemyLocationSnapshots);
            this.#unitManager.getActiveUnit().move();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("enemy_move", (data) => {
            if(data.unitIdx !== this.#unitManager.unitIdx) {
                throw new Error("Unit cannot move");
            }
            if(data.path.length === 0) {
                return;
            }

            const path: Array<Hex> = [];
            const start = this.#mapManager.getHex(
                Hex.hashCode(data.path[0].q, data.path[0].r)
            );

            if(!start) {
                throw new Error(`Path start is undefined`);
            }
                
            for (let i = 1 ; i < data.path.length ; i++) {
                const hex = this.#mapManager.getHex(
                    Hex.hashCode(data.path[i].q, data.path[i].r)
                ); 
                if(!hex) {
                    throw new Error(`Hex number ${i} on path is undefined`);
                }
                path.push(hex);   
            }
            const activeUnit = this.#unitManager.getActiveUnit()

            if(!activeUnit.isVisible()) {
                const [goalX, goalY] = this.#layoutManager.hexToWorld(start);
                activeUnit.setWorldPos(goalX, goalY);
            }

            this.#movementState.set(path);
            activeUnit.move();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("turn_change", (nextUnitIdx) => {
            if(this.#unitManager.isDead(nextUnitIdx)) {
                throw new Error("Next active unit is dead");
            }
            this.#unitManager.setUnitIdx(nextUnitIdx);
        });

        this.#eventBus.on("turn_skip_requested", () => {
            const activeUnit = this.#unitManager.getActiveUnit();
            if (activeUnit.player === this.#roomState.username && activeUnit.is("Idle")) {
                this.#networkManager.sendGameAction(  
                    "turn-skip",
                    this.#unitManager.unitIdx
                );
            }
        });

        this.#eventBus.on("map_shrink", (shrinklevel, deadUnits, fov) => {
            this.#mapManager.shrink(shrinklevel);
            this.#unitManager.killOutOfMapUnits(deadUnits);
            this.#fovManager.setFov(fov);
        });

        this.#eventBus.on("game_over", (winner) => {
            this.#gameInputHandler.removeEventListeners();
            this.#menuInputHandler.setupEventListeners();
            this.#uiManager.showEnd(winner === this.#roomState.username);
        });

        this.#eventBus.on("forfeit_game",() => {
            this.#networkManager.sendGameAction("game-forfeit")
        })
    }
}
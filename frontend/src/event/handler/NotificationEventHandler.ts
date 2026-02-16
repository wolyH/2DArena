import type { NotificationManager } from "../../NotificationManager";
import type { RoomState } from "../../RoomState";
import type { AllEvents } from "../events";
import type { EventBus } from "../../utils/EvenBus";
import type { UiManager } from "../../UiManager";
import type { PathPreviewManager } from "../../PathPreviewManager";
import type { FovManager } from "../../FovManager";
import type { LayoutManager } from "../../LayoutManager";
import type { ActionValidator } from "../../ActionValidator";
import type { MapManager } from "../../MapManager";
import type { GameInputHandler } from "../../input/GameInputHandler";
import type { MenuInputHandler } from "../../input/MenuInputHandler";
import type { UnitManager } from "../../UnitManager";
import type { MovementState } from "../../MovementState";

export class NotificationEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager;
    readonly #notificationManager: NotificationManager;
    readonly #roomState: RoomState;
    readonly #pathPreviewManager: PathPreviewManager
    readonly #movementState: MovementState;
    readonly #unitManager: UnitManager;
    readonly #fovManager: FovManager;
    readonly #layoutManager: LayoutManager;
    readonly #actionValidator: ActionValidator;
    readonly #mapManager: MapManager;
    readonly #gameInputHandler: GameInputHandler;
    readonly #menuInputHandler: MenuInputHandler;
    
    constructor(
        eventBus: EventBus<AllEvents>, 
        uiManager: UiManager,
        notificationManager: NotificationManager,
        roomState: RoomState,
        pathPreviewManager: PathPreviewManager,
        movementState: MovementState,
        unitManager: UnitManager,
        fovManager: FovManager,
        layoutManager: LayoutManager,
        actionValidator: ActionValidator,
        mapManager: MapManager,
        gameInputHandler: GameInputHandler,
        menuInputHandler: MenuInputHandler
    ) {
        this.#eventBus = eventBus;
        this.#uiManager = uiManager;
        this.#notificationManager = notificationManager;
        this.#roomState = roomState;
        this.#pathPreviewManager = pathPreviewManager;
        this.#movementState = movementState;
        this.#unitManager = unitManager;
        this.#fovManager  = fovManager;
        this.#layoutManager = layoutManager;
        this.#actionValidator = actionValidator;
        this.#mapManager = mapManager;
        this.#gameInputHandler = gameInputHandler,
        this.#menuInputHandler = menuInputHandler;
    }

    setup(): void {
        this.#eventBus.on("server_notification", (notification) => {
            this.#notificationManager.add(notification);
        });

        this.#eventBus.on("PLAYER_JOIN", (data) => {
            this.#roomState.setOpponent(data.username);
            this.#uiManager.showRoom(true, this.#roomState.username, this.#roomState.opponent);
        });

        this.#eventBus.on("PLAYER_LEAVE", (data) => {
            if (this.#roomState.opponent !== data.username) {
                throw new Error(
                    `Room State mismatch: Expected opponent ${this.#roomState.opponent} to leave, but got ${data.username}`);
            }
            this.#roomState.removeOpponent();
            this.#uiManager.showRoom(true, this.#roomState.username, undefined);
        });

        this.#eventBus.on("UNIT_ATTACK", (data) => {
            const {attacker, target} = this.#actionValidator.validateAttack(
                data.attackerIdx,
                data.targetCoords
            );

            const attackerPos = attacker.getWorldPos();
            const targetPos = target.getWorldPos();

            const dx = targetPos.x! - attackerPos.x!;
            this.#unitManager.updateUnitDirection(attacker, dx);
            attacker.strike();
            target.die();
            this.#fovManager.setFov(data.fov);
        });

        this.#eventBus.on("ALLY_MOVE", (data) => { 
            const {path, enemyLocationSnapshots} = this.#actionValidator.validateAllyMove(
                data.unitIdx, 
                data.path, 
                data.visibleUnitsAlongPath
            );

            this.#movementState.set(path, data.pathFov, enemyLocationSnapshots);
            this.#unitManager.getActiveUnit().move();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("ENEMY_MOVE", (data) => {
            const result = this.#actionValidator.validateEnemyMove(
                data.unitIdx,
                data.path
            );

            if (result === undefined) {
                return;
            }

            const { path, startHex } = result;
            const activeUnit = this.#unitManager.getActiveUnit();

            if(!activeUnit.isVisible()) {
                const [goalX, goalY] = this.#layoutManager.hexToWorld(startHex);
                activeUnit.setWorldPos(goalX, goalY);
            }

            this.#movementState.set(path);
            activeUnit.move();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("TURN_CHANGE", (data) => {
            if(this.#unitManager.isDead(data.nextUnitIdx)) {
                throw new Error("Next active unit is dead");
            }
            this.#unitManager.setUnitIdx(data.nextUnitIdx);
        });

        this.#eventBus.on("MAP_SHRINK", (data) => {
            this.#mapManager.shrink(data.shrinkLevel);
            this.#unitManager.killOutOfMapUnits(data.deadUnits);
            this.#fovManager.setFov(data.fov);
        });

        this.#eventBus.on("GAME_START", (data) => {
            this.#mapManager.fill();
            this.#gameInputHandler.clearHoverState();
            this.#fovManager.setFov(data.fov);
            this.#unitManager.spawnUnits(data.player1, data.player2);
            this.#menuInputHandler.removeEventListeners();
            this.#gameInputHandler.setupEventListeners();
            this.#uiManager.showGame();
        });

        this.#eventBus.on("GAME_OVER", (data) => {
            this.#gameInputHandler.removeEventListeners();
            this.#menuInputHandler.setupEventListeners();
            this.#uiManager.showEnd(data.winner === this.#roomState.username);
        });

        this.#eventBus.on("ROOM_DELETE", (_) => {
            this.#eventBus.emit("leave_room");
        });
    }
}
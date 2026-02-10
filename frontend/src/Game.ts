import type { CameraManager } from "./CameraManager";
import type { GameActionEventHandler } from "./event/handler/GameActionEventHandler";
import type { GameScreenEventHandler } from "./event/handler/GameScreenEventHandler";
import type { InputEventHandler } from "./event/handler/InputEventHandler";
import type { MenuEventHandler } from "./event/handler/MenuEventHandler";
import type { NotificationEventHandler } from "./event/handler/NotificationEventHandler";
import type { FovManager } from "./FovManager";
import { Hex } from "./Hex";
import type { MenuInputHandler } from "./input/MenuInputHandler";
import type { Layout } from "./Layout";
import type { MapManager } from "./MapManager";
import type { MovementManager } from "./MovementManager";
import type { NotificationManager } from "./NotificationManager";
import type { GameRenderer } from "./rendering/GameRenderer";
import { UiManager } from "./ui/UiManager";
import type { Unit } from "./unit/Unit";
import type { UnitManager } from "./unit/UnitManager";

export class Game {
    #gameActionEventHandler: GameActionEventHandler;
    #gameScreenEventHandler: GameScreenEventHandler;
    #inputEventHandler: InputEventHandler;
    #menuEventHandler: MenuEventHandler;
    #notificationEventHandler: NotificationEventHandler;
    #menuInputHandler: MenuInputHandler;
    #gameRenderer: GameRenderer;
    #uiManager: UiManager;
    #cameraManager: CameraManager;
    #unitManager: UnitManager;
    #movementManager: MovementManager;
    #layout: Layout;
    #mapManager: MapManager;
    #notificationManager: NotificationManager;
    #fovManager: FovManager;

    #previousTime: number = 0;

    readonly #targetFrameTime = 1000 / 60;

    constructor (
        gameActionEventHandler: GameActionEventHandler,
        gameScreenEventHandler: GameScreenEventHandler,
        inputEventHandler: InputEventHandler,
        menuEventHandler: MenuEventHandler,
        notificationEventHandler: NotificationEventHandler,
        menuInputHandler: MenuInputHandler,
        gameRenderer: GameRenderer,
        uiManager: UiManager,
        cameraManager: CameraManager,
        unitManager: UnitManager,
        movementManager: MovementManager,
        layout: Layout,
        mapManager: MapManager,
        notificationManager: NotificationManager,
        fovManager: FovManager
    ) {
        this.#gameActionEventHandler = gameActionEventHandler;
        this.#gameScreenEventHandler = gameScreenEventHandler;
        this.#inputEventHandler = inputEventHandler;
        this.#menuEventHandler = menuEventHandler;
        this.#notificationEventHandler = notificationEventHandler;
        this.#menuInputHandler = menuInputHandler;
        this.#gameRenderer = gameRenderer;
        this.#uiManager = uiManager
        this.#cameraManager = cameraManager;
        this.#unitManager = unitManager;
        this.#movementManager = movementManager;
        this.#layout = layout;
        this.#mapManager = mapManager;
        this.#notificationManager = notificationManager;
        this.#fovManager = fovManager;
    }

    start(): void {
        this.#gameActionEventHandler.setup();
        this.#gameScreenEventHandler.setup();
        this.#inputEventHandler.setup();
        this.#menuEventHandler.setup();
        this.#notificationEventHandler.setup();
        this.#menuInputHandler.setupEventListeners();
        this.loop();
    }

    //Main game loop
    private loop = (currentTime: number = 0): void => {

        const elapsed = currentTime - this.#previousTime;

        if (elapsed < this.#targetFrameTime) {
            requestAnimationFrame(this.loop);
            return;
        }

        this.#previousTime = currentTime - (elapsed % this.#targetFrameTime);
        const delta = this.#targetFrameTime / 1000;

        this.#gameRenderer.clear();
        switch (this.#uiManager.state) {
            case "MENU":
                this.#notificationManager.process();
                this.#gameRenderer.drawUi();
                break;
            case "GAME":
                if(this.#unitManager.getActiveUnit().is("Idle")) {
                    this.#notificationManager.process();
                }
                this.updateGame(delta);
                this.#gameRenderer.drawGame();
                this.#gameRenderer.drawUi();
                break;
        }
        requestAnimationFrame(this.loop);
    }

    private updateGame(delta: number): void {
        this.#cameraManager.updateCamera(delta);
        this.updateAll(delta);
    }

    private updateAll(delta: number): void {
        this.#unitManager.forEachAliveUnit(unit => {
            if (unit.is("Moving") && !this.#movementManager.isMoving()) {
                unit.idle();
                if(!unit.isVisible()) {
                    unit.clearWorldPos();
                }
            }
            if(unit.is("Moving") && this.#movementManager.isMoving()) {
                this.moveUnitTowardGoal(unit, delta);
            }
            unit.update();
        });
    }
        
    private moveUnitTowardGoal(unit: Unit, delta: number): void {
        const nextGoal = this.#movementManager.getNextGoal();
        const [goalX, goalY] = this.#layout.hexToWorld(nextGoal);
        const isGoalVisible = this.#fovManager.isVisible(nextGoal);
        
        const {x, y} = unit.getWorldPos();

        if(x === undefined || y === undefined) {
            throw new Error("Unit not in world")
        }

        const dx = goalX - x;
        const dy = goalY - y;  

        this.#unitManager.updateUnitDirection(unit, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        const isTooClose = distance < unit.speed * delta;

        const newX = isTooClose ? goalX : x + (dx / distance) * unit.speed * delta;
        const newY = isTooClose ? goalY : y + (dy / distance) * unit.speed * delta;
        unit.setWorldPos(newX, newY);

        const [preQ, prevR, prevS] = this.#layout.worldToHex({x: x, y: y});
        const prevAdjacentHex = this.#mapManager.getHex(Hex.hashCode(preQ, prevR));

        const [newQ, newR, newS] = this.#layout.worldToHex({x: newX, y: newY});
        const newAdjacentHex = this.#mapManager.getHex(Hex.hashCode(newQ, newR));

        if (prevAdjacentHex === undefined || newAdjacentHex === undefined) {
            throw new Error("unit not on map");
        }

        if(!isGoalVisible) {
            this.clearUnitHex(unit, prevAdjacentHex, newAdjacentHex);
        }
        else {
            this.updateUnitHex(unit, prevAdjacentHex, newAdjacentHex);
        }

        if (isTooClose) {
           this.#movementManager.shifPath(); 
        }
    }

    private updateUnitHex(unit: Unit, prevAdjacentHex: Hex, newAdjacentHex: Hex): void {
        if (prevAdjacentHex.hashCode !== newAdjacentHex.hashCode) {
            const {currentFov, currentLocation} = this.#movementManager.getCurrentFovAndLocation();
            this.#movementManager.shiftFovAndLocation();
            if(currentFov && currentLocation) {
                this.#fovManager.setFov(currentFov);
                this.#unitManager.setEnemyLocation(currentLocation);
            }
            unit.setHex(newAdjacentHex);
        }
    }

    private clearUnitHex(unit: Unit, prevAdjacentHex: Hex, newAdjacentHex: Hex): void {
        if (prevAdjacentHex.hashCode !== newAdjacentHex.hashCode) {
            this.#movementManager.shiftFovAndLocation();
            unit.setHex(undefined);
        }
    }
}
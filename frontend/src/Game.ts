import type { CameraManager } from "./CameraManager";
import type { GameActionEventHandler } from "./event/handler/GameActionEventHandler";
import type { RenderingEventHandler } from "./event/handler/RenderingEventHandler";
import type { InputEventHandler } from "./event/handler/InputEventHandler";
import type { HttpEventHandler } from "./event/handler/HttpEventHandler";
import type { NotificationEventHandler } from "./event/handler/NotificationEventHandler";
import type { MenuInputHandler } from "./input/MenuInputHandler";
import type { MovementManager } from "./MovementManager";
import type { NotificationManager } from "./NotificationManager";
import type { GameRenderer } from "./rendering/GameRenderer";
import type { UiManager } from "./UiManager";

import type { UnitManager } from "./UnitManager";

export class Game {
    #gameActionEventHandler: GameActionEventHandler;
    #renderingEventHandler: RenderingEventHandler;
    #inputEventHandler: InputEventHandler;
    #httpEventHandler: HttpEventHandler;
    #notificationEventHandler: NotificationEventHandler;
    #menuInputHandler: MenuInputHandler;
    #gameRenderer: GameRenderer;
    #uiManager: UiManager;
    #cameraManager: CameraManager;
    #unitManager: UnitManager;
    #movementManager: MovementManager;
    #notificationManager: NotificationManager;

    #previousTime: number = 0;

    //Here 60 frame per second is one frame every 1000/60 milliseconds
    readonly #targetFrameTime = 1000 / 60;

    constructor (
        gameActionEventHandler: GameActionEventHandler,
        renderingEventHandler: RenderingEventHandler,
        inputEventHandler: InputEventHandler,
        httpEventHandler: HttpEventHandler,
        notificationEventHandler: NotificationEventHandler,
        menuInputHandler: MenuInputHandler,
        gameRenderer: GameRenderer,
        uiManager: UiManager,
        cameraManager: CameraManager,
        unitManager: UnitManager,
        movementManager: MovementManager,
        notificationManager: NotificationManager,

    ) {
        this.#gameActionEventHandler = gameActionEventHandler;
        this.#renderingEventHandler = renderingEventHandler;
        this.#inputEventHandler = inputEventHandler;
        this.#httpEventHandler = httpEventHandler;
        this.#notificationEventHandler = notificationEventHandler;
        this.#menuInputHandler = menuInputHandler;
        this.#gameRenderer = gameRenderer;
        this.#uiManager = uiManager
        this.#cameraManager = cameraManager;
        this.#unitManager = unitManager;
        this.#movementManager = movementManager;
        this.#notificationManager = notificationManager;
    }

    start(): void {
        this.#gameActionEventHandler.setup();
        this.#renderingEventHandler.setup();
        this.#inputEventHandler.setup();
        this.#httpEventHandler.setup();
        this.#notificationEventHandler.setup();
        
        this.#menuInputHandler.setupEventListeners();
        this.loop();
    }

    //Main game loop
    private loop = (currentTime: number = 0): void => {
        const elapsed = currentTime - this.#previousTime;

        if (elapsed >= this.#targetFrameTime) {
            this.#previousTime = currentTime - (elapsed % this.#targetFrameTime);

            //player speed and camera speed now depends on window width and FPS 
            const delta = (window.innerWidth / 1000) * (this.#targetFrameTime / 1000);

            switch (this.#uiManager.state) {
                case "MENU":
                    this.#notificationManager.process();
                    break;
                case "GAME":
                    if (this.#unitManager.getActiveUnit().is("Idle")) {
                        this.#notificationManager.process();
                    }
                    this.updateGame(delta);
                    break;
            }
        }

        this.#gameRenderer.clear();
        switch (this.#uiManager.state) {
            case "MENU":
                this.#gameRenderer.drawUi();
                break;
            case "GAME":
                this.#gameRenderer.drawGame();
                this.#gameRenderer.drawUi();
                break;
        }

        requestAnimationFrame(this.loop);
    }

    private updateGame(delta: number): void {
        this.#cameraManager.updateCamera(delta);
        this.#movementManager.updateActiveUnit(delta);
        this.#unitManager.forEachAliveUnit(unit => {
            unit.update();
        });
    }
}
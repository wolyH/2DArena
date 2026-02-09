import type { CameraManager } from "../../CameraManager";
import type { FovManager } from "../../FovManager";
import type { Hex } from "../../Hex";
import type { GameInputHandler } from "../../input/GameInputHandler";
import type { Layout } from "../../Layout";
import type { PathPreviewManager } from "../../PathPreviewManager";
import type { RoomState } from "../../RoomState";
import type { UiManager } from "../../ui/UiManager";
import type { UnitManager } from "../../unit/UnitManager";
import type { EventBus } from "../../utils";
import type { AllEvents } from "../events";

export class InputEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager;
    readonly #layout: Layout;
    readonly #gameInputHandler: GameInputHandler;
    readonly #unitManager: UnitManager;
    readonly #cameraManager: CameraManager;
    readonly #pathPreviewManager: PathPreviewManager;
    readonly #fovManager: FovManager;
    readonly #roomState: RoomState;

    constructor(
        notifier: EventBus<AllEvents>,
        uiManager: UiManager,
        layout: Layout,
        gameInputHandler: GameInputHandler,
        unitManager: UnitManager,
        cameraManager: CameraManager,
        pathPreviewManager: PathPreviewManager,
        fovManager: FovManager,
        roomState: RoomState
    ) {
        this.#eventBus = notifier;
        this.#uiManager = uiManager;
        this.#layout = layout;
        this.#gameInputHandler = gameInputHandler;
        this.#unitManager = unitManager;
        this.#cameraManager = cameraManager;
        this.#pathPreviewManager = pathPreviewManager;
        this.#fovManager = fovManager;
        this.#roomState = roomState;
    }

    setup(): void {
        this.#eventBus.on("hex_clicked", (hex) => {
            this.startUnitAction(hex);
        });
        
        this.#eventBus.on("hex_hovered", (hex) => {
            this.updatePathPreview(hex);
        });

        this.#eventBus.on("hex_unhovered", () => {
           this.#pathPreviewManager.clearPathPreview();
           this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("button_hovered", (button) => {
            button.hover();
            this.#pathPreviewManager.clearPathPreview();
            this.#gameInputHandler.clearHoverState();
        });

        this.#eventBus.on("button_clicked", (button) => {
            const activeUnit = this.#unitManager.getActiveUnit();
            const state = this.#uiManager.state;
            if (state === "MENU" || 
                (state === "GAME" && 
                 activeUnit.player === this.#roomState.username && 
                 activeUnit.is("Idle")
                )
               ) {
                button.trigger();
            }
        });

        this.#eventBus.on("camera_key_changed", (direction, isPressed) => { 
            this.#cameraManager.setCameraDirection(direction, isPressed);
        });

        this.#eventBus.on("window_resized", (x, y) => {
            this.#layout.updateOrigin(x, y);
            this.#eventBus.emit("map_size_changed");
            this.#uiManager.update();
        });
    }

    private startUnitAction(hex: Hex): void {
        const activeUnit = this.#unitManager.getActiveUnit();  

        if (!this.#unitManager.canActiveUnitActs()) {
            return;
        }

        if(hex.isTraversable() && this.#fovManager.isVisible(hex)) {
            this.#eventBus.emit("unit_move_requested", hex);
            return;
        }

        if (this.#unitManager.canAttack(activeUnit, hex)) {
            this.#eventBus.emit("unit_attack_requested", hex);
        }
    }

    private updatePathPreview(hex: Hex): void {
        const activeUnit = this.#unitManager.getActiveUnit();
        this.#pathPreviewManager.clearPathPreview();
        this.#gameInputHandler.clearHoverState();

        if (!hex.isTraversable() || !this.#fovManager.isVisible(hex) || !this.#unitManager.canActiveUnitActs()) {
            return;
        }

        const traversableGoals = this.#pathPreviewManager.searchPath(activeUnit.hex, hex);
        if (traversableGoals.length > 1) {
            this.#pathPreviewManager.setPathPreview(traversableGoals, true);
            return;
        }

        const nonTraversableGoals = this.#pathPreviewManager.searchPath(activeUnit.hex, hex, false);
        if (nonTraversableGoals.length > 1) {
            this.#pathPreviewManager.setPathPreview(nonTraversableGoals, false);
        }
    }
}
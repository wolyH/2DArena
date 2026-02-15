import type { Hex } from "../../model/Hex";
import type { CameraManager } from "../../CameraManager";
import type { FovManager } from "../../FovManager";
import type { GameInputHandler } from "../../input/GameInputHandler";
import type { PathPreviewManager } from "../../PathPreviewManager";
import type { UnitManager } from "../../UnitManager";
import type { EventBus } from "../../utils/EvenBus";
import type { AllEvents } from "../events";
import type { UiManager } from "../../UiManager";
import type { LayoutManager } from "../../LayoutManager";

export class InputEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager;
    readonly #layoutManager: LayoutManager;
    readonly #gameInputHandler: GameInputHandler;
    readonly #unitManager: UnitManager;
    readonly #cameraManager: CameraManager;
    readonly #pathPreviewManager: PathPreviewManager;
    readonly #fovManager: FovManager;

    constructor(
        notifier: EventBus<AllEvents>,
        uiManager: UiManager,
        layoutManager: LayoutManager,
        gameInputHandler: GameInputHandler,
        unitManager: UnitManager,
        cameraManager: CameraManager,
        pathPreviewManager: PathPreviewManager,
        fovManager: FovManager,
    ) {
        this.#eventBus = notifier;
        this.#uiManager = uiManager;
        this.#layoutManager = layoutManager;
        this.#gameInputHandler = gameInputHandler;
        this.#unitManager = unitManager;
        this.#cameraManager = cameraManager;
        this.#pathPreviewManager = pathPreviewManager;
        this.#fovManager = fovManager;
    }

    setup(): void {
        this.#eventBus.on("hex_clicked", (hex) => {
            if (this.#fovManager.isVisible(hex)) {
                this.startUnitAction(hex);
            }
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
            button.trigger();
        });

        this.#eventBus.on("camera_key_changed", (direction, isPressed) => { 
            this.#cameraManager.setCameraDirection(direction, isPressed);
        });

        this.#eventBus.on("window_resized", (x, y) => {
            this.#layoutManager.updateOrigin(x, y);
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
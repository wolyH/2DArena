import { InputHandler } from "./InputHandler";
import { MapManager } from "../MapManager";
import type { AllEvents } from "../event/events";
import type { GameRenderer } from "../rendering/GameRenderer";
import type { EventBus } from "../utils/EvenBus";
import { Hex } from "../model/Hex";
import type { UiManager } from "../UiManager";
import type { LayoutManager } from "../LayoutManager";

export class GameInputHandler  extends InputHandler {
    readonly #layoutManager: LayoutManager;
    readonly #mapManager: MapManager;

    #lastHoveredHex?: string;

    constructor(
        mapManager: MapManager,
        gameRenderer: GameRenderer, 
        layoutManager: LayoutManager, 
        ui: UiManager, 
        eventBus: EventBus<AllEvents>
    ) {
        super(gameRenderer, ui, eventBus);
        this.#layoutManager = layoutManager;
        this.#mapManager = mapManager;
    }

    setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('click', this.handleMouseClick);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    removeEventListeners(): void {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('click', this.handleMouseClick);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        this.clearHoverState();
    }

    clearHoverState(): void {
        this.#lastHoveredHex = undefined;
    }

    private handleResize = () => {
        const x = window.innerWidth / 2; 
        const y = window.innerHeight / 2;
        this.eventBus.emit("window_resized", x, y);
    };

    private handleMouseClick = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.eventBus.emit("button_clicked", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (hex) {
            this.eventBus.emit("hex_clicked", hex);
        }
    };

    private handleMouseMove = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event);
        
        if (button && !button.isHovered()) {
            this.eventBus.emit("button_hovered", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (!hex && this.#lastHoveredHex) {
            this.eventBus.emit("hex_unhovered");
            return;
        }
        else if (!hex){
            return;
        }

        if (this.#lastHoveredHex === hex.hashCode) {
            return;
        }
        this.#lastHoveredHex = hex.hashCode;
        this.eventBus.emit("hex_hovered", hex);
    };

    private getHexFromEvent(event: MouseEvent): Hex | undefined {
        const rect = this.gameRenderer.getGameCanvasOffset();

        const [q,r,_] = this.#layoutManager.screenToHex({
                x: event.clientX - rect.x, 
                y: event.clientY - rect.y
            });

        return this.#mapManager.getHex(Hex.hashCode(q,r));
    }

    private handleKeyDown = (event: KeyboardEvent) => {
       this.handleKey(event, true);
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        this.handleKey(event, false);
    };

    private handleKey(event: KeyboardEvent, isPressed: boolean): void {
        const key = event.key.toLowerCase();
        if (key === 'w') {
           this.eventBus.emit("camera_key_changed", "up", isPressed);
        }
        if (key === 's') {
            this.eventBus.emit("camera_key_changed", "down", isPressed);
        }
        if (key === 'a') {
            this.eventBus.emit("camera_key_changed", "left", isPressed);
        }
        if (key === 'd') {
            this.eventBus.emit("camera_key_changed", "right", isPressed);
        }
    }
}
import { InputHandler } from "./InputHandler";
import { Grid } from "../grid";
import { Layout } from "../layout";
import { Renderer } from "../renderer";
import { UiManager } from "../ui/UiManager";
import type { Notifier } from "../utils";
import type { AllEvents } from "../game";
import { Hex } from "../hex";

export class GameInputHandler  extends InputHandler {
    readonly #layout: Layout;
    readonly #grid: Grid;

    #lastHoveredHex?: string;

    constructor(
        grid: Grid, 
        renderer: Renderer, 
        layout: Layout, 
        ui: UiManager, 
        notifier: Notifier<AllEvents>
    ) {
        super(renderer, ui, notifier)
        this.#layout = layout;
        this.#grid = grid;
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
        this.notifier.emit("window_resized", x, y);
    };

    private handleMouseClick = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.notifier.emit("button_clicked", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (hex && hex.isVisible) {
            this.notifier.emit("hex_clicked", hex);
        }
    };

    private handleMouseMove = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event);
        
        if (button && !button.isHovered()) {
            this.notifier.emit("button_hovered", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (!hex && this.#lastHoveredHex) {
            this.notifier.emit("hex_unhovered");
            return;
        }
        else if (!hex){
            return;
        }

        if (this.#lastHoveredHex === hex.hashCode) {
            return;
        }
        this.#lastHoveredHex = hex.hashCode;
        this.notifier.emit("hex_hovered", hex);
    };

    private getHexFromEvent(event: MouseEvent): Hex | undefined {
        const rect = this.renderer.gameCanvas.getBoundingClientRect();

        const [q,r,_] = this.#layout.screenToHex({
                x: event.clientX - rect.left, 
                y: event.clientY - rect.top
            });

        return this.#grid.getHex(Hex.hashCode(q,r));
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
           this.notifier.emit("camera_key_changed", "up", isPressed);
        }
        if (key === 's') {
            this.notifier.emit("camera_key_changed", "down", isPressed);
        }
        if (key === 'a') {
            this.notifier.emit("camera_key_changed", "left", isPressed);
        }
        if (key === 'd') {
            this.notifier.emit("camera_key_changed", "right", isPressed);
        }
    }
}
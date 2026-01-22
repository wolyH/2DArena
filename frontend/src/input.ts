import type { Notifier } from "./utils.ts";
import type { GameEvent, UIEvent } from "./game.ts";
import { Grid } from "./grid.ts";
import { UI, UIButton } from "./ui.ts";
import { Renderer } from "./renderer.ts";
import { Hex } from "./hex.ts";
import type { Layout } from "./layout.ts";

abstract class InputHandler {
    protected readonly renderer: Renderer;
    protected readonly ui: UI;
    protected readonly notifier: Notifier<GameEvent & UIEvent>; 

    constructor(
        renderer: Renderer, 
        ui: UI, 
        notifier: Notifier<GameEvent & UIEvent>
    ) {
        this.renderer = renderer;
        this.ui = ui;
        this.notifier = notifier;
    }

    abstract setupEventListeners(): void;
    abstract removeEventListeners(): void;

    protected getButtonFromEvent(event: MouseEvent): UIButton | undefined {
        const rect = this.renderer.uiCanvas.getBoundingClientRect();

        const x = (event.clientX - rect.left) * window.devicePixelRatio;
        const y = (event.clientY - rect.top) * window.devicePixelRatio;
        
        return this.ui.getHoveredButton(x, y);
    }
}

export class MenuInputHandler extends InputHandler {
    setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('click', this.handleMouseClick);
        window.addEventListener('mousemove', this.handleMouseMove);
    }

    removeEventListeners(): void {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('click', this.handleMouseClick);
        window.removeEventListener('mousemove', this.handleMouseMove);
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
    };

    private handleMouseMove = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event);
        
        if (button && !button.isHovered()) {
            this.notifier.emit("button_hovered", button);
            return;
        }
    };
}

export class GameInputHandler  extends InputHandler {
    readonly #layout: Layout;
    readonly #grid: Grid;

    readonly camera = {direction: {up: false, down: false, left: false, right: false}};
    #lastHoveredHex?: string;

    constructor(
        grid: Grid, 
        renderer: Renderer, 
        layout: Layout, 
        ui: UI, 
        notifier: Notifier<GameEvent & UIEvent>
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

    resetCamera(): void {
        this.camera.direction.up = false;
        this.camera.direction.down = false;
        this.camera.direction.left = false;
        this.camera.direction.right = false;
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

    private handleKey(event: KeyboardEvent, pressed: boolean): void {
        const key = event.key.toLowerCase();
        if (key === 'w') {
            this.camera.direction.up = pressed;
        }
        if (key === 's') {
            this.camera.direction.down = pressed;
        }
        if (key === 'a') {
            this.camera.direction.left = pressed;
        }
        if (key === 'd') {
            this.camera.direction.right = pressed;
        }
    }
}
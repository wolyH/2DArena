import { Renderer } from "../renderer";
import { UiManager } from "../ui/UiManager";
import { UiButton } from "../ui/UiButton";
import type { Notifier } from "../utils";
import type { AllEvents } from "../game";

export abstract class InputHandler {
    protected readonly renderer: Renderer;
    protected readonly uiManager: UiManager;
    protected readonly notifier: Notifier<AllEvents>; 

    constructor(
        renderer: Renderer, 
        uiManager: UiManager, 
        notifier: Notifier<AllEvents>
    ) {
        this.renderer = renderer;
        this.uiManager = uiManager;
        this.notifier = notifier;
    }

    abstract setupEventListeners(): void;
    abstract removeEventListeners(): void;

    protected getButtonFromEvent(event: MouseEvent): UiButton | undefined {
        const rect = this.renderer.uiCanvas.getBoundingClientRect();

        const x = (event.clientX - rect.left) * window.devicePixelRatio;
        const y = (event.clientY - rect.top) * window.devicePixelRatio;
        
        return this.uiManager.getHoveredButton(x, y);
    }
}
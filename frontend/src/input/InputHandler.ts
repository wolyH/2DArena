import { UiButton } from "../ui/UiButton";
import type { AllEvents } from "../event/events";
import type { GameRenderer } from "../rendering/GameRenderer";
import type { EventBus } from "../utils/EvenBus";
import type { UiManager } from "../UiManager";

export abstract class InputHandler {
    protected readonly gameRenderer: GameRenderer;
    protected readonly uiManager: UiManager;
    protected readonly eventBus: EventBus<AllEvents>; 

    constructor(
        gameRenderer: GameRenderer, 
        uiManager: UiManager, 
        eventBus: EventBus<AllEvents>
    ) {
        this.gameRenderer = gameRenderer;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
    }

    abstract setupEventListeners(): void;
    abstract removeEventListeners(): void;

    protected getButtonFromEvent(event: MouseEvent): UiButton | undefined {
        const rect = this.gameRenderer.getUiCanvasOffset();

        const x = (event.clientX - rect.x) * window.devicePixelRatio;
        const y = (event.clientY - rect.y) * window.devicePixelRatio;
        
        return this.uiManager.getHoveredButton(x, y);
    }
}
import type { GameRenderer } from "../../rendering/GameRenderer";
import type { EventBus } from "../../utils";
import type { AllEvents } from "../events";

export class GameScreenEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #gameRenderer: GameRenderer;
    
    constructor(
        eventBus: EventBus<AllEvents>,
        gameRenderer: GameRenderer,
    ) {
        this.#eventBus = eventBus;
        this.#gameRenderer = gameRenderer;
    }

    setup(): void {
        this.#eventBus.on("fov_changed", () => {
            this.#gameRenderer.invalidateMapCache();
        });

        this.#eventBus.on("map_size_changed", () => {
            this.#gameRenderer.resize();
            this.#gameRenderer.invalidateMapCache();
        });
    }
}
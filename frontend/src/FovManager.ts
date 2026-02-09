import type { AllEvents } from "./event/events";
import { Hex } from "./Hex";
import type { EventBus } from "./utils";

export class FovManager {
    #fov: Set<string> = new Set();
    #eventBus : EventBus<AllEvents>;

    constructor(eventBus : EventBus<AllEvents>) {
        this.#eventBus = eventBus;
    }

    isVisible(hex: Hex) {
        return this.#fov.has(hex.hashCode);
    }
 
    setFov(fov: Array<string> | Set<string>): void {
        this.#fov = new Set(fov);
        this.#eventBus.emit("fov_changed");
    }
}
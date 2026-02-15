import type { AllEvents } from "../event/events.ts";
import type { EventBus } from "../utils/EvenBus.ts";

import { UiButton } from "./UiButton.ts";
import type { UiText } from "./UiText.ts";

export abstract class Ui {
    buttons: Array<UiButton>;
    texts: Array<UiText>
    protected eventBus: EventBus<AllEvents>;

    constructor(eventBus: EventBus<AllEvents>) {
        this.buttons = [];
        this.texts = [];
        this.eventBus = eventBus;
    }

    abstract update(): void

    clear(): void {
        this.buttons = [];
    }
}
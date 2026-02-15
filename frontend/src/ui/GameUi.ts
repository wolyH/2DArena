import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { AllEvents } from "../event/events.ts";
import type { EventBus } from "../utils/EvenBus.ts";


export class GameUi extends Ui {
    constructor(eventBus: EventBus<AllEvents>) {
        super(eventBus);
        this.update();
    }

    update(): void {
        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.12;
        const btnH = h * 0.07;
        const margin = w * 0.02;

        this.buttons.push(new UiButton(
            w - btnW - margin,
            h - btnH - margin,
            btnW,
            btnH,
            "Skip Turn",
            () => this.eventBus.emit("turn_skip_requested")
        ));

        this.buttons.push(new UiButton(
            w - btnW - margin,
            margin,
            btnW,
            btnH,
            "Forfeit",
            () => this.eventBus.emit("forfeit_game")
        ));
    }
}
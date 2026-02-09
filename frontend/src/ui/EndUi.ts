import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { EventBus } from "../utils.ts"
import type { AllEvents } from "../event/events.ts";

export class EndUi extends Ui {
    #gameWon: boolean;
    constructor(eventBus: EventBus<AllEvents>, gameWon: boolean) {
        super(eventBus);
        this.#gameWon = gameWon;
        this.update();
    }

    update(): void {
        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.4;
        const btnH = h * 0.08;
        const centerX = (w - btnW) / 2;
        const centerY = h * 0.5;
        const spacing = h * 0.03;

        const resultString = this.#gameWon ? "You Won" : "You Lost";

        this.buttons.push(new UiButton(
            centerX,
            centerY + btnH + spacing,
            btnW,
            btnH,
            `${resultString} : Leave Game?`, 
            () => this.eventBus.emit("leave_room_requested")
        ));
    }
}
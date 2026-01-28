import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";

export class GameUi extends Ui {
    constructor(notifier: Notifier<AllEvents>) {
        super(notifier)

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
            () => this.notifier.emit("skip_turn_requested")
        ));

        this.buttons.push(new UiButton(
            w - btnW - margin,
            margin,
            btnW,
            btnH,
            "Surrender",
            () => this.notifier.emit("leave_room_requested")
        ));
    }
}
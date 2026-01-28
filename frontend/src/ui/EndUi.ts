import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";

export class EndUi extends Ui {
    constructor(notifier: Notifier<AllEvents>) {
        super(notifier)

        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.4;
        const btnH = h * 0.08;
        const centerX = (w - btnW) / 2;
        const centerY = h * 0.5;
        const spacing = h * 0.03;
        
        this.buttons.push(new UiButton(
            centerX,
            centerY + btnH + spacing,
            btnW,
            btnH,
            "Leave Game", 
            () => this.notifier.emit("leave_room_requested")
        ));
    }
}
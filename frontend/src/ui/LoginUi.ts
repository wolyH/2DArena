import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";

export class LoginUi extends Ui {
    constructor(notifier: Notifier<AllEvents>) {
        super(notifier)

        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.4;
        const btnH = h * 0.08;
        const centerX = (w - btnW) / 2;
        const centerY = (h - btnH) / 2;
        const randomName = "Player_" + Math.floor(Math.random() * 1000);
        
        this.buttons.push(new UiButton(
            centerX,
            centerY,
            btnW,
            btnH,
            "Log in", 
            () => this.notifier.emit("login_requested", randomName)
        ));
    }
}
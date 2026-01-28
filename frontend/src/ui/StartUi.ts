import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";

export class StartUi extends Ui {
    constructor(notifier: Notifier<AllEvents>) {
        super(notifier)

        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.4;      
        const btnH = h * 0.08;
        const centerX = (w - btnW) / 2;
        const centerY = (h - btnH) / 2;
        const spacing = h * 0.03;

        // 1. Create Room Button
        this.buttons.push(new UiButton(
            centerX,
            centerY,
            btnW,
            btnH,
            "Create Room",
            () => this.notifier.emit("create_room_requested") 
        ));

        // 2. Join Room (Browse) Button
        // Positioned exactly one button height + spacing below the first
        this.buttons.push(new UiButton(
            centerX,
            centerY + btnH + spacing,
            btnW,
            btnH,
            "Join Room",
            () => this.notifier.emit("browse_rooms_requested") // Triggers the fetch and UI swap
        ));
        
    }
}
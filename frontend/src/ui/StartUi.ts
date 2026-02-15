import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { AllEvents } from "../event/events.ts";
import type { EventBus } from "../utils/EvenBus.ts";

export class StartUi extends Ui {
    constructor(eventBus: EventBus<AllEvents>) {
        super(eventBus);
        this.update();
    }

    update(): void {
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
            () => this.eventBus.emit("create_room_requested") 
        ));

        // 2. Join Room (Browse) Button
        // Positioned exactly one button height + spacing below the first
        this.buttons.push(new UiButton(
            centerX,
            centerY + btnH + spacing,
            btnW,
            btnH,
            "Join Room",
            () => this.eventBus.emit("browse_rooms_requested") // Triggers the fetch and UI swap
        ));
    }
}
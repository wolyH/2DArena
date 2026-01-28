import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";
import type { RoomResponse } from "../dto/RoomResponse.ts";

export class BrowserUi extends Ui {
    constructor(notifier: Notifier<AllEvents>, rooms: Array<RoomResponse>) {
        super(notifier)

        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.5;
        const btnH = h * 0.08;
        const centerX = (w - btnW) / 2;
        const topMargin = h * 0.05; 
        const spacing = h * 0.02;

        this.buttons.push(new UiButton(
            w * 0.05, topMargin, w * 0.15, btnH, 
            "Cancel", 
            () => this.notifier.emit("cancel_browsing")
        ));

        this.buttons.push(new UiButton(
            w * 0.80, topMargin, w * 0.15, btnH, 
            "Refresh", 
            () => this.notifier.emit("refresh_rooms_requested")
        ));

        const listStartY = h * 0.20;

        rooms.forEach((room, index) => {
            const y = listStartY + (index * (btnH + spacing));
            
            // Only add button if it fits on the screen vertically
            if (y + btnH < h * 0.9) {
                this.buttons.push(new UiButton(
                    centerX, 
                    y, 
                    btnW, 
                    btnH, 
                    `Join ${room.creatorName}`, 
                    () => this.notifier.emit("join_room_requested", room.roomId)
                ));
            }
        });
    }
}
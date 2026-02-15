import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { RoomResponses } from "../dto/RoomResponses.ts";
import type { AllEvents } from "../event/events.ts";
import type { EventBus } from "../utils/EvenBus.ts";

export class BrowserUi extends Ui {
    #rooms: Array<RoomResponses.JoinRoom>;

    constructor(
        eventBus: EventBus<AllEvents>, 
        rooms: Array<RoomResponses.JoinRoom>
    ) {
        super(eventBus);
        this.#rooms = rooms;
        this.update();
    }

    update(): void {
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
            () => this.eventBus.emit("cancel_browsing")
        ));

        this.buttons.push(new UiButton(
            w * 0.80, topMargin, w * 0.15, btnH, 
            "Refresh", 
            () => this.eventBus.emit("refresh_rooms_requested")
        ));

        const listStartY = h * 0.20;

        this.#rooms.forEach((room, index) => {
            const y = listStartY + (index * (btnH + spacing));
            
            // Only add button if it fits on the screen vertically
            if (y + btnH < h * 0.9) {
                this.buttons.push(new UiButton(
                    centerX, 
                    y, 
                    btnW, 
                    btnH, 
                    `Join ${room.creatorName}`, 
                    () => this.eventBus.emit("join_room_requested", room.roomId)
                ));
            }
        });
    }
}
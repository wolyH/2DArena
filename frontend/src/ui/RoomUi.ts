import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import { UiText } from "./UiText.ts";
import type { AllEvents } from "../event/events.ts";
import type { EventBus } from "../utils/EvenBus.ts";

export class RoomUi extends Ui {
    #isCreator: boolean;
    #player: string;
    #opponent: string | undefined;

    constructor(
        eventBus: EventBus<AllEvents>, 
        isCreator: boolean, 
        player: string,
        opponent: string | undefined
    ) {
        super(eventBus);
        this.#isCreator = isCreator;
        this.#player = player;
        this.#opponent = opponent;
        this.update();
    }

    update(): void {
        const dpr = window.devicePixelRatio;
        const w = window.innerWidth * dpr;
        const h = window.innerHeight * dpr;

        const btnW = w * 0.4;
        const btnH = h * 0.08;
        const margin = w * 0.05;
        const centerX = (w - btnW) / 2;
        const centerY = h * 0.5;
        
        this.buttons.push(new UiButton(
            margin,
            margin,
            w * 0.15,
            btnH,
            "Leave",
            () => this.eventBus.emit("leave_room_requested")
        ));

        this.texts.push(new UiText(
            w / 2, 
            h * 0.2, 
            `Player: ${this.#player}`, 
            28, 
            "#FFFFFF"
        ));

        this.texts.push(new UiText(
            w / 2, 
            h * 0.28, 
            this.#opponent ? `Opponent: ${this.#opponent}` : "Waiting for opponent...", 
            24, 
             "#FFFFFF"
        ));

        if (this.#isCreator && this.#opponent) {
            this.buttons.push(new UiButton(
                centerX,
                centerY,
                btnW,
                btnH,
                "Start Game",
                () => this.eventBus.emit("start_game_requested")
            ));
        }
    }
}
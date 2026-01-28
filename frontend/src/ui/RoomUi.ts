import { Ui } from "./Ui";
import { UiButton } from "./UiButton.ts";
import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";
import { UiText } from "./UiText.ts";

export class RoomUi extends Ui {
    constructor(notifier: Notifier<AllEvents>, isCreator: boolean, player: string, opponent: string | undefined) {
        super(notifier)

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
            () => this.notifier.emit("leave_room_requested")
        ));

        this.texts.push(new UiText(
            w / 2, 
            h * 0.2, 
            `Player: ${player}`, 
            28, 
            "#FFFFFF"
        ));

        this.texts.push(new UiText(
            w / 2, 
            h * 0.28, 
            opponent ? `Opponent: ${opponent}` : "Waiting for opponent...", 
            24, 
             "#FFFFFF"
        ));

        if (isCreator && opponent) {
            this.buttons.push(new UiButton(
                centerX,
                centerY,
                btnW,
                btnH,
                "Start Game",
                () => this.notifier.emit("start_game_requested")
            ));
        }
    }
}
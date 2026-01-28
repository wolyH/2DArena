import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";
import { Ui } from "./Ui";
import { LoginUi } from "./LoginUi";
import { StartUi } from "./StartUi.ts";
import { BrowserUi } from "./BrowserUi.ts";
import { EndUi } from "./EndUi.ts";
import { GameUi } from "./GameUi.ts";
import { RoomUi } from "./RoomUi.ts";
import type { RoomResponse } from "../dto/RoomResponse.ts";
import type { UiButton } from "./UiButton.ts";

export class UiManager {
    #currentUi: Ui;
    #notifier: Notifier<AllEvents>;
    #state: "MENU" | "PENDING" | "GAME" = "MENU";

    constructor(notifier: Notifier<AllEvents>) {
        this.#notifier = notifier;
        this.#currentUi = new LoginUi(notifier);
    }

    getHoveredButton(x: number, y: number): UiButton | undefined {
            let hoveredButton = undefined;
            for(const button of this.#currentUi.buttons) {
                if (button.isHit(x, y)) {
                    hoveredButton = button;
                }
                if(button.isHovered()) {
                    button.unhover()
                }
            }
            return hoveredButton;
    }
    
    get buttons() {
        return this.#currentUi.buttons;
    }

    get texts() {
        return this.#currentUi.texts;
    }

    get state() {
        return this.#state;
    }

    showBrowser(rooms: RoomResponse[]) {
        this.#state = "MENU";
        this.#currentUi = new BrowserUi(this.#notifier, rooms);
    }

    showEnd() {
        this.#state = "MENU";
        this.#currentUi = new EndUi(this.#notifier);
    }

    showGame() {
        this.#state = "GAME";
        this.#currentUi = new GameUi(this.#notifier);
    }

    showLogin() {
        this.#state = "MENU";
        this.#currentUi = new LoginUi(this.#notifier);
    }

    showRoom(isCreator: boolean, player: string, opponent: string | undefined) {
        this.#state = "MENU";
        this.#currentUi = new RoomUi(this.#notifier, isCreator,  player, opponent);
    }

    showStart() {
        this.#state = "MENU";
        this.#currentUi = new StartUi(this.#notifier);
    }
}
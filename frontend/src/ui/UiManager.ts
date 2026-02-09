import type { EventBus } from "../utils.ts"
import { Ui } from "./Ui";
import { LoginUi } from "./LoginUi";
import { StartUi } from "./StartUi.ts";
import { BrowserUi } from "./BrowserUi.ts";
import { EndUi } from "./EndUi.ts";
import { GameUi } from "./GameUi.ts";
import { RoomUi } from "./RoomUi.ts";
import type { UiButton } from "./UiButton.ts";
import type { RoomResponses } from "../dto/RoomResponses.ts";
import type { AllEvents } from "../event/events.ts";

export class UiManager {
    #currentUi: Ui;
    #eventBus: EventBus<AllEvents>;
    #state: "MENU" | "PENDING" | "GAME" = "MENU";

    constructor(eventBus: EventBus<AllEvents>) {
        this.#eventBus = eventBus;
        this.#currentUi = new LoginUi(eventBus);
    }

    update(): void {
        this.#currentUi.clear();
        this.#currentUi.update();
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

    showBrowser(rooms: Array<RoomResponses.JoinRoom>) {
        this.#state = "MENU";
        this.#currentUi = new BrowserUi(this.#eventBus, rooms);
    }

    showEnd(gameWon: boolean) {
        this.#state = "MENU";
        this.#currentUi = new EndUi(this.#eventBus, gameWon);
    }

    showGame() {
        this.#state = "GAME";
        this.#currentUi = new GameUi(this.#eventBus);
    }

    showLogin() {
        this.#state = "MENU";
        this.#currentUi = new LoginUi(this.#eventBus);
    }

    showRoom(isCreator: boolean, player: string, opponent: string | undefined) {
        this.#state = "MENU";
        this.#currentUi = new RoomUi(this.#eventBus, isCreator,  player, opponent);
    }

    showStart() {
        this.#state = "MENU";
        this.#currentUi = new StartUi(this.#eventBus);
    }
}
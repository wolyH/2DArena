import type { RoomResponses } from "./dto/RoomResponses";
import type { AllEvents } from "./event/events";
import { BrowserUi } from "./ui/BrowserUi";
import { EndUi } from "./ui/EndUi";
import { GameUi } from "./ui/GameUi";
import { LoginUi } from "./ui/LoginUi";
import { RoomUi } from "./ui/RoomUi";
import { StartUi } from "./ui/StartUi";
import type { Ui } from "./ui/Ui";
import type { UiButton } from "./ui/UiButton";
import type { EventBus } from "./utils/EvenBus";


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
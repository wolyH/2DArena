import type { NotificationManager } from "../../NotificationManager";
import type { RoomState } from "../../RoomState";
import type { AllEvents } from "../events";
import type { EventBus } from "../../utils/EvenBus";
import type { UiManager } from "../../UiManager";

export class NotificationEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager;
    readonly #notificationManager: NotificationManager;
    readonly #roomState: RoomState;

    constructor(
        eventBus: EventBus<AllEvents>, 
        uiManager: UiManager,
        notificationManager: NotificationManager,
        roomState: RoomState
    ) {
        this.#eventBus = eventBus;
        this.#uiManager = uiManager;
        this.#notificationManager = notificationManager;
        this.#roomState = roomState;
    }

    setup(): void {
        this.#eventBus.on("server_notification", (notification) => {
            this.#notificationManager.add(notification);
        });

        this.#eventBus.on("player_joined_room", (username) => {
            this.#roomState.setOpponent(username);
            this.#uiManager.showRoom(true, this.#roomState.username, this.#roomState.opponent);
        });

        this.#eventBus.on("player_left_room", (username) => {
            if (this.#roomState.opponent !== username) {
                throw new Error(`Room State mismatch: Expected opponent ${this.#roomState.opponent} to leave, but got ${username}`);
            }
            this.#roomState.removeOpponent();
            this.#uiManager.showRoom(true, this.#roomState.username, undefined);
        });
    }
}
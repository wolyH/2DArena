import type { GameInputHandler } from "../../input/GameInputHandler";
import type { MenuInputHandler } from "../../input/MenuInputHandler";
import type { NetworkManager } from "../../NetworkManager";
import type { RoomState } from "../../RoomState";
import type { AllEvents } from "../events";
import type { EventBus } from "../../utils/EvenBus";
import type { UiManager } from "../../UiManager";

export class HttpEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #uiManager: UiManager;
    readonly #networkManager: NetworkManager;
    readonly #gameInputHandler: GameInputHandler;
    readonly #menuInputHandler: MenuInputHandler;
    readonly #roomState: RoomState;

    constructor(
        eventBus: EventBus<AllEvents>,
        uiManager: UiManager,
        networkManager: NetworkManager,
        gameInputHandler: GameInputHandler,
        menuInputHandler: MenuInputHandler,
        roomState: RoomState,
    ) {
        this.#eventBus = eventBus;
        this.#uiManager = uiManager;
        this.#networkManager = networkManager;
        this.#gameInputHandler = gameInputHandler;
        this.#menuInputHandler = menuInputHandler;
        this.#roomState = roomState;
    }

    setup(): void {
        this.#eventBus.on("login_requested", (username) => {
            this.#networkManager.login(username);
        });

        this.#eventBus.on("login", (username, token) => {
            this.#roomState.setUsername(username);
            this.#networkManager.setClient(token);
        });

        this.#eventBus.on("connected", () => {
            this.#uiManager.showStart();
        })

        this.#eventBus.on("create_room_requested", () => {
            this.#networkManager.createRoom();
        });

        this.#eventBus.on("create_room", (roomId) => {
            this.#roomState.setRoom(roomId);
            this.#uiManager.showRoom(true, this.#roomState.username, undefined);
        });

        this.#eventBus.on("browse_rooms_requested", () => {
            this.#networkManager.startBrowsing();
        });

        this.#eventBus.on("rooms_list_received", (rooms) => {
            this.#uiManager.showBrowser(rooms);
        });

        this.#eventBus.on("refresh_rooms_requested", () => {
            this.#networkManager.startBrowsing();
        });

        this.#eventBus.on("cancel_browsing", () => {
            this.#uiManager.showStart();
        });

        this.#eventBus.on("join_room_requested", (roomId) => {
            this.#networkManager.joinRoom(roomId);
        });

        this.#eventBus.on("join_room", (roomId, opponent) => {
            this.#roomState.setRoom(roomId);
            this.#roomState.setOpponent(opponent);
            this.#uiManager.showRoom(false, this.#roomState.username, opponent);
        });

        this.#eventBus.on("leave_room_requested", () => {
            this.#networkManager.leaveRoom(this.#roomState.room.roomId);
        });

        this.#eventBus.on("leave_room", () => {
            if(this.#uiManager.state === "GAME") {
                this.#gameInputHandler.removeEventListeners();
                this.#menuInputHandler.setupEventListeners();
            }
            this.#roomState.resetRoom();
            this.#uiManager.showStart();
        });

        this.#eventBus.on("start_game_requested", () => {
            this.#networkManager.startGame(this.#roomState.room.roomId);
        });
    }
}
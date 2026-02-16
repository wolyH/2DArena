import type { AllEvents } from "./event/events.ts";
import { Client, type StompSubscription } from "@stomp/stompjs";
import type { AuthResponse } from "./dto/AuthResponse.ts";
import type { RoomResponses } from "./dto/RoomResponses.ts";
import { RoomState } from "./RoomState.ts";
import type { EventBus } from "./utils/EvenBus.ts";

export class NetworkManager {
    #eventBus: EventBus<AllEvents>;
    #roomState: RoomState;

    #client: Client | undefined = undefined;
    #token: string | undefined  = undefined;
    #currentSub: StompSubscription | undefined = undefined;

    readonly #API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    readonly #WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;

    constructor(eventBus: EventBus<AllEvents>, roomState: RoomState) {
        this.#eventBus = eventBus;
        this.#roomState = roomState;
    }

    async login(username: string): Promise<void> {
        try {
            const response = await fetch(`${this.#API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                throw new Error(`${response.status}`);
            }

            const data: AuthResponse = await response.json();

            if (data && data.isAuthenticated && data.token) {
                this.#eventBus.emit("login", username, data.token);
            }
        } catch (error) {
            throw new Error(`Login request failed: ${error}`);
        }
    }

    setClient(token: string): Client {
        this.#token = token;
        this.#client = new Client({
            brokerURL: this.#WS_BASE_URL,
            connectHeaders: {
                Authorization: `Bearer ${token}` 
            },
            onConnect: () => {
                console.log('ws connection established');
                this.#eventBus.emit("connected");
            },
        });
        this.#client.activate();
        return this.#client;
    }

    private subscribe(roomId: string): void {
        if(!this.#client) {
            throw Error("You must be logged in before creating a room");
        }

        this.#currentSub = this.#client.subscribe(`/user/queue/${roomId}`,
            (msg) => {
                const payload = JSON.parse(msg.body);
                if (Array.isArray(payload)) {
                    for (const notification of payload) {
                    this.#eventBus.emit("server_notification", notification);
                    }
                    return;
                }

                this.#eventBus.emit("server_notification", payload);

            },
        );
    }

    private unsubscribe(): void {
        if(this.#currentSub === undefined) {
            throw new Error("public channel is already undefined");
        }
        this.#currentSub.unsubscribe();
        this.#currentSub = undefined;

        this.#eventBus.emit("leave_room");
    }

    private async request<T>(endpoint: string, method: string): Promise<T> {
        if (!this.#client || !this.#token) {
            throw Error("You must be logged in to perform this action.");
        }

        try {
            const response = await fetch(`${this.#API_BASE_URL}/${endpoint}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.#token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`${response.status}`);
            }
            const text = await response.text();
            if (!text) {
                return undefined as T;
            }
            return JSON.parse(text) as T;
        } catch (error) {
            throw new Error(`Request to ${endpoint} failed: ${error}`);
        }
    }

    async createRoom(): Promise<void> {
        const data = await this.request<RoomResponses.CreateRoom>("room/create", "POST");

        if (data && data.roomId) {
            this.subscribe(data.roomId);
            this.#eventBus.emit("create_room", data.roomId);
        }
    }

    async startBrowsing(): Promise<void> {
        const data = await this.request<Array<RoomResponses.JoinRoom>>("room/available", "GET");
        if (data) {
            this.#eventBus.emit("rooms_list_received", data);
        }
    }
    
    async joinRoom(roomId: string) {
        const data = await this.request<RoomResponses.JoinRoom>(`room/join/${roomId}`, "POST");
        if (data && data.roomId && data.creatorName) {
            this.subscribe(data.roomId);
            this.#eventBus.emit("join_room", data.roomId, data.creatorName);
        }
    }

    async leaveRoom(roomId: string) {
        await this.request<void>(`room/leave/${roomId}`, "DELETE");
        this.unsubscribe();
    }

    async startGame(roomId: string) {
        const data = await this.request<RoomResponses.StartGame>(`room/start/${roomId}`, "POST");

        if (data && data.roomId && data.player1 && data.player2 && data.fov) {
            this.#eventBus.emit("GAME_START", data);
        }
    }

    sendGameAction(destination: string, payload?: any): void {
        if (!this.#client) {
            throw Error("You must be logged in to send a game action");
        }

        this.#client.publish({
            destination: `/app/room/${this.#roomState.room.roomId}/${destination}`,
            body: payload ? JSON.stringify(payload) : "{}"
        });
    }
}
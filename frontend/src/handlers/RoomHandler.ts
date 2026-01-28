import type { Notifier } from "../utils.ts";
import type { AllEvents } from "../game.ts";
import type { RoomResponse } from "../dto/RoomResponse.ts";
import { Client, type StompSubscription } from "@stomp/stompjs";

export class RoomHandler {
    #notifier: Notifier<AllEvents>;
    #client: Client | undefined = undefined;
    #token: string | undefined  = undefined;
    #currentPrivateSub: StompSubscription | undefined = undefined;
    #currentPublicSub: StompSubscription | undefined = undefined;

    readonly #API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    readonly #WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;

    constructor(notifier: Notifier<AllEvents>) {
        this.#notifier = notifier;
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
                this.#notifier.emit("connected");
            },
        });
        this.#client.activate();
        return this.#client;
    }

    private subscribe(roomId: string): void {
        if(!this.#client) {
            throw Error("You must be logged in before creating a room");
        }

        this.#currentPublicSub = this.#client.subscribe(`/topic/room/${roomId}`, (msg) => {
            this.#notifier.emit("server_update", JSON.parse(msg.body));
        });

        this.#currentPrivateSub = this.#client.subscribe(`/user/queue/specific-player`, (msg) => {
            this.#notifier.emit("server_update", JSON.parse(msg.body));
        });
    }

    private unsubscribe(): void {
        this.#currentPublicSub?.unsubscribe();
        this.#currentPublicSub = undefined;
        this.#currentPrivateSub?.unsubscribe();
        this.#currentPrivateSub = undefined;
        this.#notifier.emit("room_left");
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

            return await response.json();
        } catch (error) {
            throw new Error(`Request to ${endpoint} failed: ${error}`);
        }
    }

    async createRoom(): Promise<void> {
        const data = await this.request<RoomResponse>("room/create", "POST");

        if (data.roomId) {
            this.subscribe(data.roomId);
            this.#notifier.emit("room_created", data.roomId);
        }
    }

    async startBrowsing(): Promise<void> {
        const data = await this.request<Array<RoomResponse>>("room/available", "GET");
        if (data) {
            this.#notifier.emit("rooms_list_received", data);
        }
    }
    
    async joinRoom(roomId: string) {
        const data = await this.request<RoomResponse>(`room/join/${roomId}`, "POST");
        if (data.roomId && data.creatorName) {
            this.subscribe(data.roomId);
            this.#notifier.emit("room_joined", data.roomId, data.creatorName);
        }
    }

    async leaveRoom(roomId: string) {
        await this.request<RoomResponse>(`room/leave/${roomId}`, "DELETE");
        this.unsubscribe();
    }

    async startGame(roomId: string) {
        const data = await this.request<RoomResponse>(`room/start/${roomId}`, "POST");

        if (data.creatorName) {
            this.#notifier.emit("game_started", data.creatorName);
        }
        else if (data.guestName) {
            this.#notifier.emit("game_started", data.guestName);
        }
    }
}
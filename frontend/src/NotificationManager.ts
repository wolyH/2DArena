import type { Notification } from "./dto/Notification";
import type { AllEvents } from "./event/events";
import type { RoomState } from "./RoomState";
import type { EventBus } from "./utils";

export class NotificationManager {
    #eventBus: EventBus<AllEvents>;
    #roomState: RoomState;
    #notificationQueue: Array<Notification> = [];

    constructor(
        eventBus: EventBus<AllEvents>,
        roomState: RoomState,
    ) {
        this.#eventBus = eventBus;
        this.#roomState = roomState;
    }

    add(notification: any): void {
        const parsedNotification = this.parseNotification(notification);
        
        if (!parsedNotification) {
            throw new Error("Received an unparsable message from server") ;
        }
        console.log(parsedNotification);
        this.#notificationQueue.push(parsedNotification);
    }

    process(): void {
        const notification = this.#notificationQueue.shift();

        if(notification === undefined) {
            return;
        }
  
        if(this.#roomState.room.roomId !== notification.data.roomId) {
            throw new Error(`Wrong roomId, expected ${this.#roomState.room.roomId} received ${notification.data.roomId}`);
        }

        switch (notification.type) {
            case "PLAYER_JOIN":
                this.#eventBus.emit("player_joined_room", notification.data.username);
                break;
            case "ROOM_DELETE":
                this.#eventBus.emit("leave_room");
                break;
            case "PLAYER_LEAVE":
                this.#eventBus.emit("player_left_room", notification.data.username);
                break; 
            case "GAME_START":
                this.#eventBus.emit("game_start", notification.data.player1, notification.data.player2, notification.data.fov);
                break;
            case "ALLY_MOVE":
                 this.#eventBus.emit("ally_move", notification.data);
                break;
            case "ENEMY_MOVE":
                this.#eventBus.emit("enemy_move", notification.data);
                break;
            case "UNIT_ATTACK":
                this.#eventBus.emit("unit_attack", notification.data);
                break;
            case "TURN_CHANGE":
                this.#eventBus.emit("turn_change", notification.data.nextUnitIdx);
                break;
            case "MAP_SHRINK":
                this.#eventBus.emit("map_shrink", notification.data.shrinkLevel, notification.data.deadUnits, notification.data.fov);
                break;
            case "GAME_OVER":
                this.#eventBus.emit("game_over", notification.data.winner);
        }
    }

    private parseNotification(update: any): Notification | undefined {
        if (!update || typeof update.type !== "string" || !update.data || typeof update.data !== "object") {
            return undefined;
        }
        if (typeof update.data.roomId !== 'string') {
            return undefined;
        }

        const data = update.data;
        switch (update.type) {
            case "PLAYER_JOIN":
            case "PLAYER_LEAVE":
                if (typeof data.username !== 'string') {
                    return undefined;   
                }
                return update
            case "ROOM_DELETE":
                return update;
            case "GAME_START":
                if (typeof data.player1 !== 'string' || typeof data.player2 !== 'string') { 
                    return undefined;
                }
                if (!Array.isArray(data.fov) || !data.fov.every((x: any) => {return (x && typeof x === "string");})) {
                    return undefined;
                }
                return update;
            case "ALLY_MOVE":
                if (typeof data.unitIdx !== 'number') { 
                    return undefined; 
                }
                if (!Array.isArray(data.path) || 
                    !data.path.every(
                        (x: any) => {
                            return (x && typeof x.q === "number" && typeof x.r === "number");
                        }
                    )
                ) { 
                    return undefined; 
                }
                if (!Array.isArray(data.pathFov) ||
                    !data.pathFov.every(
                        (fov: any) => {
                            return Array.isArray(fov) && fov.every(
                                (x: any) => {
                                    return typeof x === "string";
                                }
                            )
                        }
                    )
                ) {
                    return undefined;
                }

                if (!Array.isArray(data.visibleUnitsAlongPath) ||
                    !data.visibleUnitsAlongPath.every(
                        (fov: any) => {
                            return Array.isArray(fov) && fov.every(
                                (x: any) => {
                                    return (x && typeof x.q === "number" && typeof x.r === "number" && typeof x.idx === "number")
                                }
                            )
                        }
                    )
                ) {
                    return undefined;
                }
                
                if (typeof data.unitIdx !== 'number') { 
                    return undefined; 
                }
                return update;
            case "ENEMY_MOVE":
                if (typeof data.unitIdx !== 'number') { 
                    return undefined; 
                }
                if (!Array.isArray(data.path) || 
                    !data.path.every(
                        (x: any) => {
                            return (x && typeof x.q === "number" && typeof x.r === "number");
                        }
                    )
                ) { 
                    return undefined; 
                }
                return update;
            case "UNIT_ATTACK":
                if (!data.targetCoords || typeof data.targetCoords.q !== 'number' || typeof data.targetCoords.r !== 'number') { 
                    return undefined; 
                }
                if (typeof data.attackerIdx !== 'number') { 
                    return undefined; 
                }
                if (!Array.isArray(data.fov) || !data.fov.every((x: any) => {return (x && typeof x === "string");})) {
                    return undefined;
                }
                return update;
            case "TURN_CHANGE":
                if (typeof data.nextUnitIdx !== 'number') { 
                    return undefined; 
                }
                return update;
            case "MAP_SHRINK":
                if (typeof data.shrinkLevel !== 'number') { 
                    return undefined; 
                }
                if (!Array.isArray(data.deadUnits) || !data.deadUnits.every((x: any) => {return typeof x === "number"})) {
                    return undefined;
                }
                if (!Array.isArray(data.fov) || !data.fov.every((x: any) => {return (x && typeof x === "string");})) {
                    return undefined;
                }
                return update;
            case "GAME_OVER":
                if (typeof data.winner !== "string" && data.winner !== null) {
                    return undefined;
                }
                return update;
            default:
                return undefined;
        }
    }
}
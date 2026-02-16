import type { Notification } from "./dto/Notification";
import type { AllEvents } from "./event/events";
import type { RoomState } from "./RoomState";
import type { EventBus } from "./utils/EvenBus";
    
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
            throw new Error(`Received an unparsable message from server: ${notification}`) ;
        }
        this.#notificationQueue.push(parsedNotification);
    }

    process(): void {
        const notification = this.#notificationQueue.shift();

        if(notification === undefined) {
            return;
        }
  
        if(this.#roomState.room.roomId !== notification.data.roomId) {
            throw new Error(
                `Wrong roomId, expected ${this.#roomState.room.roomId} received ${notification.data.roomId}`
            );
        }

        this.#eventBus.emit(notification.type, notification.data);
    }

    private parseNotification(update: any): Notification | undefined {
        if(!this.isUpdateValid(update)) {
            return undefined;
        }

        const data = update.data;
        switch (update.type) {
            case "PLAYER_JOIN":
            case "PLAYER_LEAVE":
                return this.isString(data.username) ? update : undefined;
            case "ROOM_DELETE":
                return update;
            case "GAME_START":
                return this.isString(data.player1) && 
                    this.isString(data.player2) && 
                    this.isStringArray(data.fov) 
                ? update : undefined;
            case "ALLY_MOVE":
                return this.isNumber(data.unitIdx) &&
                   this.isHexCoordsArray(data.path) &&
                   this.isStringArray2D(data.pathFov) &&
                   this.isUnitCoordsArray2D(data.visibleUnitsAlongPath)
                ? update : undefined;
            case "ENEMY_MOVE":
                return this.isNumber(data.unitIdx) &&
                    this.isHexCoordsArray(data.path)
                ? update : undefined;
            case "UNIT_ATTACK":
                return this.isHexCoord(data.targetCoords) &&
                    this.isNumber(data.attackerIdx) &&
                    this.isStringArray(data.fov)
                ? update : undefined;
            case "TURN_CHANGE":
                return this.isNumber(data.nextUnitIdx) ? update : undefined;
            case "MAP_SHRINK":
                return this.isNumber(data.shrinkLevel) &&
                    this.isNumberArray(data.deadUnits) &&
                    this.isStringArray(data.fov)
                ? update : undefined;
            case "GAME_OVER":
                return this.isString(data.winner) ? update : undefined;
            default:
                return undefined;
        }
    }

    private isUpdateValid(update: any): boolean {
        return update && 
            typeof update.type === "string" && 
            update.data && 
            typeof update.data === "object" &&
            typeof update.data.roomId === "string";
    }

    private isString(val: any): boolean {
        return typeof val === "string";
    }

    private isNumber(val: any): boolean {
        return typeof val === "number";
    }

    private isHexCoord(val: any): boolean {
        return val && typeof val.q === "number" && typeof val.r === "number";
    }

    private isNumberArray(arr: any): boolean {
        return Array.isArray(arr) && arr.every(x => typeof x === "number");
    }

    private isStringArray(arr: any): boolean {
        return Array.isArray(arr) && arr.every(x => typeof x === "string");
    }

    private isHexCoordsArray(arr: any): boolean {
        return Array.isArray(arr) && 
            arr.every(x => x && typeof x.q === "number" && typeof x.r === "number");
    }

    private isStringArray2D(arr: any): boolean {
        return Array.isArray(arr) && 
            arr.every(fov => this.isStringArray(fov));
    }

    private isUnitCoordsArray2D(arr: any): boolean {
        return Array.isArray(arr) && 
            arr.every(snapshot => 
                Array.isArray(snapshot) && 
                snapshot.every(x => 
                    x && 
                    typeof x.q === "number" && 
                    typeof x.r === "number" && 
                    typeof x.idx === "number"
                )
            );
    }
}
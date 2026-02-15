export class RoomState {
    #username: string | undefined = undefined;
    #room : {roomId: string, opponent: string | undefined} | undefined = undefined;

    hasUsername(): boolean {
        return this.#username !== undefined;
    }

    get username(): string {
        if (!this.#username) {
            throw new Error("Username not set");
        }
        return this.#username;
    }

    setUsername(username: string): void {
        if(this.#username) {
            throw new Error(`Username already set to ${this.#username}`)
        }
        this.#username = username;
    }

    get room(): {roomId: string, opponent: string | undefined} {
        if (!this.#room) {
            throw new Error("Room not set");
        }
        return this.#room;
    }

    hasOpponent(): boolean {
        if (!this.#room) {
            throw new Error("Room not set");
        }
        return this.#room.opponent !== undefined;
    }

    get opponent(): string {
        if (!this.#room?.opponent) {
            throw new Error("Opponent not set");
        }
        return this.#room.opponent;
    }

    setRoom(roomId: string) {
        if (this.#room) {
            throw new Error("Room already set");
        }
        this.#room = {roomId: roomId, opponent: undefined};
    }

    resetRoom(): void {
        this.#room = undefined;
    }

    setOpponent(opponent: string): void {
        if (!this.#room) {
            throw new Error("Cannot set opponent: Room has not been initialized.");
        }

        if(this.#room.opponent !== undefined) {
            throw new Error(`Opponent already set to ${this.room.opponent}`);
        }
        this.#room.opponent = opponent;
    }

    removeOpponent(): void {
        if (!this.#room) {
            throw new Error("Cannot removed opponent: Room has not been initialized.");
        }
        if(this.#room.opponent === undefined) {
            throw new Error(`Opponent already undefined`);
        }
        this.#room.opponent = undefined;
    }
}
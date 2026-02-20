export namespace RoomResponses {
    export interface CreateRoom {
        roomId: string;
    }

    export interface JoinRoom {
        creatorName: string;
        roomId: string;
    }

    export interface StartGame {
        fov: Array<string>;
        unitSpawns: Array<{idx: number, q: number, r: number}>;
        nb_units: number;
        roomId: string;
    }
}
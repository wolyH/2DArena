export namespace RoomResponses {
    export interface CreateRoom {
        roomId: string;
    }

    export interface JoinRoom {
        creatorName: string;
        roomId: string;
    }

    export interface StartGame {
        player1: string;
        player2: string;
        roomId: string;
        fov: Array<string>;
    }
}
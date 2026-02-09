import type { RoomResponses } from "../dto/RoomResponses";
import type { UnitAttackData, UnitMoveData } from "../dto/Notification";
import type { Hex } from "../Hex";
import type { UiButton } from "../ui/UiButton";

export type AllEvents = GameActionEvent & GameScreenEvent & InputEvent & MenuEvent & NotificationEvent;

export type NotificationEvent = {
    server_notification: (notification: any) => void;

    player_joined_room: (username: string) => void;
    player_left_room: (username: string) => void;
};

export type InputEvent = {
    hex_clicked: (hex: Hex) => void;
    hex_hovered: (hex: Hex) => void;
    hex_unhovered: () => void;
    button_clicked: (button: UiButton) => void;
    button_hovered: (button: UiButton) => void;

    camera_key_changed: (direction: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => void;

    window_resized: (x: number , y: number) => void;
};

export type GameScreenEvent = {
    fov_changed: () => void;
    map_size_changed: () => void;
}

export type GameActionEvent = {
    turn_skip_requested: () => void;

    unit_attack_requested: (hex: Hex) => void;
    unit_attack: (data: UnitAttackData) => void;

    unit_move_requested: (hex: Hex) => void;
    unit_move: (data: UnitMoveData) => void;

    turn_change: (nextUnitIdx: number) => void;
    map_shrink: (shrinkLevel: number, deadUnits: Array<number>, fov :Array<string>) => void;
    game_over: (winner: string) => void;
};

export type MenuEvent = {
    login_requested: (username: string) => void;
    login: (username: string, token: string) => void;
    connected: () => void;

    create_room_requested: () => void;
    create_room: (roomId: string) => void;

    browse_rooms_requested: () => void;
    rooms_list_received: (rooms: Array<RoomResponses.JoinRoom>) => void;
    refresh_rooms_requested: () => void;
    cancel_browsing: () => void;

    join_room_requested: (roomId: string) => void;
    join_room: (roomId: string, opponent: string) => void;

    leave_room_requested: () => void;
    leave_room: () => void;

    delete_room: () => void;

    start_game_requested: () => void;
    game_start: (player1: string, player2: string, fov: Array<string>) => void;
};
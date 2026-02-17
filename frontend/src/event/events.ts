import type { RoomResponses } from "../dto/RoomResponses";
import type { AllyMoveData, EnemyMoveData, GameOverData, GameStartData, MapShrinkData, PlayerJoinData, PlayerLeaveData, RoomDeleteData, TurnChangeData, UnitAttackData } from "../dto/Notification";
import type { UiButton } from "../ui/UiButton";
import type { Hex } from "../model/Hex";

export type AllEvents = NotificationEvent & InputEvent & RenderingEvent & GameActionEvent & HTTPEvent;

export type NotificationEvent = {
    server_notification: (notification: any) => void;

    PLAYER_JOIN: (data: PlayerJoinData) => void;
    PLAYER_LEAVE: (data: PlayerLeaveData) => void;

    ROOM_DELETE: (data: RoomDeleteData) => void;

    UNIT_ATTACK: (data: UnitAttackData) => void;
    ALLY_MOVE: (data: AllyMoveData) => void;
    ENEMY_MOVE: (data: EnemyMoveData) => void;

    TURN_CHANGE: (data: TurnChangeData) => void;
    MAP_SHRINK: (data: MapShrinkData) => void;

    GAME_START: (data: GameStartData) => void;
    GAME_OVER: (data: GameOverData) => void;
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

export type RenderingEvent = {
    fov_changed: () => void;
    map_size_changed: () => void;
    camera_changed: () => void;
}

export type GameActionEvent = {
    turn_skip_requested: () => void;

    unit_attack_requested: (hex: Hex) => void;

    unit_move_requested: (hex: Hex) => void;

    forfeit_game: () => void;
};

export type HTTPEvent = {
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

    start_game_requested: () => void;
};
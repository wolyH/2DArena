export type UnitCoordinates = {idx: number, q: number, r: number};
export type HexCoordinates = {q: number; r: number;}

export type Notification = {type: "PLAYER_JOIN", data: PlayerJoinData} |
    {type: "ROOM_DELETE", data: RoomDeleteData} |
    {type: "PLAYER_LEAVE", data: PlayerLeaveData} |
    {type: "ROOM_DELETE", data: RoomDeleteData} |
    {type: "GAME_START", data: GameStartData} |
    {type: "UNIT_ATTACK", data: UnitAttackData} |
    {type: "ALLY_MOVE", data: AllyMoveData} |
    {type: "ENEMY_MOVE", data: EnemyMoveData} |
    {type: "TURN_CHANGE", data: TurnChangeData} |
    {type: "MAP_SHRINK", data: MapShrinkData} |
    {type: "GAME_OVER", data: GameOverData};

export interface PlayerJoinData {username: string, roomId: string}

export interface RoomDeleteData {roomId: string}

export interface PlayerLeaveData {username: string, roomId: string}

export interface RoomDeleteData {roomId: string}

export interface GameStartData {
    player1: string, 
    player2: string, 
    fov: Array<string>, 
    roomId: string
}
export interface UnitAttackData {
    attackerIdx: number, 
    targetCoords: HexCoordinates, 
    fov: Array<string>, 
    roomId: string
}

export interface AllyMoveData {
    unitIdx: number, 
    path: Array<HexCoordinates>, 
    pathFov: Array<Array<string>>, 
    visibleUnitsAlongPath: Array<Array<UnitCoordinates>>, 
    roomId: string
}

export interface EnemyMoveData {
    unitIdx: number,
    path: Array<HexCoordinates>, 
    roomId: string

}
export interface TurnChangeData {nextUnitIdx: number, roomId: number}

export interface MapShrinkData {
    shrinkLevel: number, 
    deadUnits: Array<number>, 
    fov: Array<string>, 
    roomId: string
}

export interface GameOverData {winner: string, roomId: string}
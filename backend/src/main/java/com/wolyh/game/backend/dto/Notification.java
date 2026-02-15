package com.wolyh.game.backend.dto;

import java.util.List;
import java.util.Set;

import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.UnitCoordinates;

public record Notification <T> (Type type, T data) {

    public static interface RoomEvent {}
    public static interface GameEvent {}

    public static record GameStart(
        String player1, 
        String player2, 
        Set<String> fov, 
        String roomId
    ) implements RoomEvent {}

    public static record PlayerJoin(
        String username, 
        String roomId
     ) implements RoomEvent {}

    public static record PlayerLeave(
        String username, 
        String roomId
    ) implements RoomEvent {}

    public static record RoomDelete(
        String roomId
    ) implements RoomEvent {}

    public static record AllyUnitMove (
        int unitIdx, 
        List<HexCoordinates> path, 
        List<Set<String>> pathFov,
        List<List<UnitCoordinates>> visibleUnitsAlongPath,
        String roomId
    ) implements GameEvent{}

    public static record EnemyUnitMove(
        int unitIdx, 
        List<HexCoordinates> path, 
        String roomId
    ) implements GameEvent {}

    public static record UnitAttack(
        int attackerIdx, 
        HexCoordinates targetCoords, 
        Set<String> fov, 
        String roomId
    ) implements GameEvent {}

    public static record TurnChange(
        int nextUnitIdx, 
        String roomId
    ) implements GameEvent {}

    public static record MapShrink(
        int shrinkLevel, 
        List<Integer> deadUnits, 
        Set<String> fov, 
        String roomId
    ) implements GameEvent {}

    public static record GameOver(
        String winner, 
        String roomId
    ) implements RoomEvent, GameEvent{}
 
    public static enum Type {
        PLAYER_JOIN,
        PLAYER_LEAVE,
        ROOM_DELETE,
        GAME_START,
        ALLY_MOVE,
        ENEMY_MOVE,
        UNIT_ATTACK,
        TURN_CHANGE,
        MAP_SHRINK,
        GAME_OVER
    }
}

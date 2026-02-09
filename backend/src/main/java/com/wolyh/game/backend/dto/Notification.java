package com.wolyh.game.backend.dto;

import java.util.List;
import java.util.Set;

import com.wolyh.game.backend.model.HexCoordinates;

public record Notification <T> (Type type, T data) {

    public static record GameStart(String player1, String player2, Set<String> fov, String roomId) {}
    public static record PlayerJoin(String username, String roomId) {}

    public static interface RoomExitEvent {}
    public static record PlayerLeave(String username, String roomId) implements RoomExitEvent {}
    public static record RoomDelete(String roomId) implements RoomExitEvent {}

    public static interface UnitAction {}
    public static record UnitMove(int unitIdx, List<HexCoordinates> path, List<Set<String>> pathFov, String roomId) implements UnitAction {}
    public static record UnitAttack(int attackerIdx, HexCoordinates targetCoords, Set<String> fov, String roomId) implements UnitAction {}

    public static record TurnChange(int nextUnitIdx, String roomId) {}
    public static record MapShrink(int shrinkLevel, List<Integer> deadUnits, Set<String> fov, String roomId) {}
    public static record GameOver(String winner, String roomId) {}
 
    public static enum Type {
        PLAYER_JOIN,
        PLAYER_LEAVE,
        ROOM_DELETE,
        GAME_START,
        UNIT_MOVE,
        UNIT_ATTACK,
        TURN_CHANGE,
        MAP_SHRINK,
        GAME_OVER
    }
}

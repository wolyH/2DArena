package com.wolyh.game.backend.dto;

import java.util.Set;

public class RoomResponses {
    public static record CreateRoom(String roomId) {}
    public static record JoinRoom(String creatorName, String roomId) {}
    public static record StartGame(String player1, String player2, Set<String> fov, String roomId) {}
}

package com.wolyh.game.backend.dto;

import java.util.List;
import java.util.Set;

import com.wolyh.game.backend.model.UnitCoordinates;

public class RoomResponses {
    public static record CreateRoom(String roomId) {}
    public static record JoinRoom(String creatorName, String roomId) {}
    public static record StartGame(
        Set<String> fov, 
        List<UnitCoordinates> unitSpawns,
        int nb_units,
        String roomId
    ) {}
}

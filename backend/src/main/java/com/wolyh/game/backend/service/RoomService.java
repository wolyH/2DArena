package com.wolyh.game.backend.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.wolyh.game.backend.dto.RoomResponse;
import com.wolyh.game.backend.dto.UpdateMessage;
import com.wolyh.game.backend.model.GameStartedData;
import com.wolyh.game.backend.model.PlayerJoinData;
import com.wolyh.game.backend.model.PlayerLeaveData;
import com.wolyh.game.backend.model.Room;
import com.wolyh.game.backend.model.RoomDeletedData;
import com.wolyh.game.backend.model.RoomStatus;
import com.wolyh.game.backend.model.UpdateType;

@Service
public class RoomService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameService gameService;

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public RoomResponse startGame(String roomId) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return null;
        }

        if(!(room.getStatus() == RoomStatus.FULL)) {
            return null;
        }

        room.setStatus(RoomStatus.PLAYING);
        gameService.addGame(roomId, room.getCreatorName(), room.getGuestName());
        UpdateMessage<GameStartedData> message = 
                    new UpdateMessage<>(UpdateType.GAME_STARTED, new GameStartedData(room.getCreatorName()));
                messagingTemplate.convertAndSendToUser(room.getGuestName(),"/queue/specific-player", message);
        return RoomResponse.builder()
            .creatorName(roomId)
            .build();
    }

    public RoomResponse createRoom(String creatorName) {
        Room newRoom = new Room(creatorName);
        rooms.put(newRoom.getId(), newRoom);

        return RoomResponse.builder()
            .roomId(newRoom.getId())
            .build();
    }

    public List<RoomResponse> getAvailableRooms() {
        return rooms.values().stream()
            .filter(room -> room.getStatus() == RoomStatus.WAITING)
            .map(room -> RoomResponse.builder()
                    .roomId(room.getId())
                    .creatorName(room.getCreatorName())
                    .build())
            .collect(Collectors.toList());
    }

    public RoomResponse joinRoom(String roomId, String username) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return null;
        }

        synchronized (room) {
            if (!username.equals(room.getCreatorName()) && room.getStatus() == RoomStatus.WAITING) {
                room.setGuestName(username);
                room.setStatus(RoomStatus.FULL);

                UpdateMessage<PlayerJoinData> message = 
                    new UpdateMessage<>(UpdateType.PLAYER_JOINED, new PlayerJoinData(room.getGuestName(), roomId));
                messagingTemplate.convertAndSendToUser(room.getCreatorName(),"/queue/specific-player", message);

                return RoomResponse.builder()
                    .roomId(room.getId())
                    .creatorName(room.getCreatorName())
                    .build();
            }
        }

        return null;
    }

    public RoomResponse leaveRoom(String roomId, String username) {
        Room room = rooms.get(roomId);
        if (room == null) {
            return RoomResponse.builder()
                .build();
        }
        
        synchronized (room) {
            switch(room.getStatus()) {
                case RoomStatus.WAITING, RoomStatus.FULL:
                    if (username.equals(room.getCreatorName())) {
                        rooms.remove(roomId);
                        if(room.getGuestName() != null) {
                            UpdateMessage<RoomDeletedData> message = 
                                new UpdateMessage<>(UpdateType.ROOM_DELETED, new RoomDeletedData(room.getId()));
                            messagingTemplate.convertAndSendToUser(room.getGuestName(),"/queue/specific-player", message);

                        }
                        return RoomResponse.builder()
                            .build();
                    }
                    else if (username.equals(room.getGuestName())) {
                        room.setGuestName(null);
                        room.setStatus(RoomStatus.WAITING);

                        UpdateMessage<PlayerLeaveData> message = 
                            new UpdateMessage<>(UpdateType.PLAYER_LEFT, new PlayerLeaveData(username  , roomId));
                        messagingTemplate.convertAndSendToUser(room.getCreatorName(),"/queue/specific-player", message);

                        return RoomResponse.builder()
                            .build();
                    }
                    return RoomResponse.builder()
                        .build();
                case RoomStatus.PLAYING:
                    //TODO handle forfeit
                    return RoomResponse.builder()
                        .build();
                case RoomStatus.FINISHED:
                    if(username.equals(room.getCreatorName())) {
                        room.setCreatorName(null);
                    }
                    else if (username.equals(room.getGuestName())){
                        room.setGuestName(null);
                    }
                    if(room.getCreatorName() == null && room.getGuestName() == null) {
                        //delete the room
                        rooms.remove(roomId);
                    }
                    return RoomResponse.builder()
                        .build();
                default:
                    return RoomResponse.builder()
                        .build();
            }
        }
    }

}

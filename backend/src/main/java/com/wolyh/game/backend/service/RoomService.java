package com.wolyh.game.backend.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.wolyh.game.backend.dto.RoomResponses;
import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameOver;
import com.wolyh.game.backend.dto.Notification.GameStart;
import com.wolyh.game.backend.dto.Notification.PlayerJoin;
import com.wolyh.game.backend.dto.Notification.PlayerLeave;
import com.wolyh.game.backend.dto.Notification.RoomDelete;
import com.wolyh.game.backend.dto.Notification.RoomExitEvent;
import com.wolyh.game.backend.dto.Notification.Type;
import com.wolyh.game.backend.model.Room;
import com.wolyh.game.backend.model.Room.Status;

@Service
public class RoomService {

    @Autowired
    private GameService gameService;

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> playerToRoom = new ConcurrentHashMap<>();
    private final Map<String, Lock> roomLocks = new ConcurrentHashMap<>();

    public static record StartGameResult(
        RoomResponses.StartGame response,
        Notification<GameStart> notification,
        String username
    ) {}

    public static record JoinRoomResult(
        RoomResponses.JoinRoom response,
        Notification<PlayerJoin> notification,
        String username
    ) {}

    public static record LeaveRoomResult(
        Notification<RoomExitEvent> playerLeaveNotif,
        Notification<GameOver> gameOverNotif,
        String username
    ) {}

    public Boolean isPlayerInRoom(String username, String roomId) {
        String playerRoomId = playerToRoom.get(username);
        return playerRoomId == null ? null : playerRoomId.equals(roomId);
    }

    public RoomResponses.CreateRoom createRoom(String creatorName) {
        if (playerToRoom.get(creatorName) != null) {
            return null;
        }
        
        Room room = new Room(creatorName);
        
        String previous = playerToRoom.putIfAbsent(creatorName, room.id);
        if (previous != null) {
            return null;
        }
        
        rooms.computeIfAbsent(room.id, id -> {
            roomLocks.put(id, new ReentrantLock());
            return room;
        });
        
        return new RoomResponses.CreateRoom(room.id);
    }

    public StartGameResult startGame(String roomId) {
        Lock lock = roomLocks.get(roomId);
        if (lock == null) {
            return null;
        }

        lock.lock();
        try {
            Room room = rooms.get(roomId);
            if (room == null || !(room.getStatus() == Status.FULL)) {
                return null;
            }

            room.setStatus(Status.PLAYING);
            gameService.addGame(roomId, room.getCreatorName(), room.getGuestName());

            Set<String> initialFov  = gameService.getGameFov(roomId);

            GameStart data = new GameStart(room.getCreatorName(), room.getGuestName(), initialFov,  roomId);
            
            return new RoomService.StartGameResult(
                new RoomResponses.StartGame(room.getCreatorName(), room.getGuestName(), initialFov, roomId),
                new Notification<GameStart>(Type.GAME_START, data),
                room.getGuestName()
            );
        }finally {
            lock.unlock();
        }
    }

    public List<RoomResponses.JoinRoom> getAvailableRooms() {
        return rooms.values().stream()
            .filter(room -> room.getStatus() == Status.WAITING)
            .map(room -> new RoomResponses.JoinRoom(room.getCreatorName(), room.id))
            .collect(Collectors.toList());
    }

    public JoinRoomResult joinRoom(String roomId, String username) {
        if (playerToRoom.get(username) != null) {
            return null;
        }
        Lock lock = roomLocks.get(roomId);
        if (lock == null) {
            return null;
        }

        lock.lock();
        try {
            Room room = rooms.get(roomId);
            if (room == null) {
                return null;
            }
            if (username.equals(room.getCreatorName()) || room.getStatus() != Status.WAITING) {
                return null;
            }

            room.setGuestName(username);
            room.setStatus(Status.FULL);
            playerToRoom.put(username, roomId);

            PlayerJoin data = new PlayerJoin(username, roomId);

            return new RoomService.JoinRoomResult(
                new RoomResponses.JoinRoom(room.getCreatorName(), roomId),
                new Notification<PlayerJoin>(Type.PLAYER_JOIN, data),
                room.getCreatorName()
            );
        }finally {
            lock.unlock();
        }
    }

    public LeaveRoomResult leaveRoom(String roomId, String username) {
        Lock lock = roomLocks.get(roomId);
        if (lock == null) {
            return null;
        }

        lock.lock();
        try {
            Room room = rooms.get(roomId);
            if (room == null) {
                return null;
            }
            if (room.getStatus() == Status.PLAYING && gameService.isGameOver(roomId)) {
                room.setStatus(Status.FINISHED);
            }
            switch(room.getStatus()) {
                case Status.WAITING, Status.FULL:
                    return handleNotStartedGame(room, username);
                case Status.PLAYING:
                    return handlePlayingGame(room, username);
                case Status.FINISHED:
                    return handleFinishedGame(room, username);
                default:
                    return null;
            }
        }finally {
            lock.unlock();
            if (rooms.get(roomId) == null) {
                roomLocks.remove(roomId);
            }
        }
    }

    private LeaveRoomResult handleNotStartedGame(Room room, String username) {
        if (username.equals(room.getCreatorName())) {
            rooms.remove(room.id);
            playerToRoom.remove(username);
            if (room.getStatus() == Status.WAITING) {
                return new LeaveRoomResult(null, null, null);
            }
            RoomDelete data = new RoomDelete(room.id);
            return new LeaveRoomResult(
                new Notification<RoomExitEvent>(Type.ROOM_DELETE, data),
                null,
                room.getGuestName()
            );
        }
        if (username.equals(room.getGuestName())) {
            room.setGuestName(null);
            room.setStatus(Status.WAITING);
            playerToRoom.remove(username);
            PlayerLeave data = new PlayerLeave(username, room.id);
            return new LeaveRoomResult(
                new Notification<RoomExitEvent>(Type.PLAYER_LEAVE, data),
                null,
                room.getCreatorName()
            );
        }
        return null;
    }

    private LeaveRoomResult handlePlayingGame(Room room, String username) {
        if(!username.equals(room.getCreatorName()) && !username.equals(room.getGuestName())) {
            return null;
        }
        
        String winner = username.equals(room.getCreatorName()) ? room.getGuestName() : room.getCreatorName();

        GameOver gameOverData = new GameOver(winner, room.id);

        RemovePlayerFromRoom(room, username);

        return new LeaveRoomResult(
            null,
            new Notification<GameOver>(Type.GAME_OVER, gameOverData),
            winner
        );
    }

    private LeaveRoomResult handleFinishedGame(Room room, String username) {
        if(!username.equals(room.getCreatorName()) && !username.equals(room.getGuestName())) {
            return null;
        }
        RemovePlayerFromRoom(room, username);

        if(room.getCreatorName() == null && room.getGuestName() == null) {
            rooms.remove(room.id);
            gameService.deleteGame(room.id);
        }
        return new LeaveRoomResult(null, null, null);
    }

    private void RemovePlayerFromRoom(Room room, String username) {
        if(username.equals(room.getCreatorName())) {
            room.setCreatorName(null);
        }
        else if (username.equals(room.getGuestName())) {
            room.setGuestName(null);
        }
        playerToRoom.remove(username);
    }

}

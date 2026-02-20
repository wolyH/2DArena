package com.wolyh.game.backend.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.wolyh.game.backend.dto.RoomResponses;
import com.wolyh.game.backend.game.Result.AddGameResult;
import com.wolyh.game.backend.game.Result.ForfeitResult;
import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameStart;
import com.wolyh.game.backend.dto.Notification.PlayerJoin;
import com.wolyh.game.backend.dto.Notification.PlayerLeave;
import com.wolyh.game.backend.dto.Notification.RoomDelete;
import com.wolyh.game.backend.dto.Notification.RoomEvent;
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
        Notification<RoomEvent> notification,
        String userNotified
    ) {}

    public static record JoinRoomResult(
        RoomResponses.JoinRoom response,
        Notification<RoomEvent> notification,
        String userNotified
    ) {}

    public static record LeaveRoomResult(
        Notification<RoomEvent> notification,
        String userNotified
    ) {}

    public Boolean isPlayerInRoom(String username, String roomId) {
        String playerRoomId = playerToRoom.get(username);
        return playerRoomId == null ? null : playerRoomId.equals(roomId);
    }

    public void markGameAsFinished(String roomId) {
        Lock lock = roomLocks.get(roomId);
        if (lock == null) {
            return;
        }

        lock.lock();

        try {
            Room room = rooms.get(roomId);
            if (room == null || !(room.getStatus() == Status.PLAYING)) {
                return;
            }
            room.setStatus(Status.FINISHED);
        }finally {
            lock.unlock();
        }
    }

    public RoomResponses.CreateRoom createRoom(String creator) {
        if (playerToRoom.get(creator) != null) {
            return null;
        }
        
        Room room = new Room(creator);
        
        String previous = playerToRoom.putIfAbsent(creator, room.id);
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

            String creator = room.getCreator();
            String guest = room.getGuest();
            
            AddGameResult result = gameService.addGame(roomId, creator, guest);

            GameStart data = new GameStart(
                result.player2Fov(),
                result.unitSpawnsPerPlayer().get(guest),
                result.nb_units(),
                roomId
            );
            
            return new RoomService.StartGameResult(
                new RoomResponses.StartGame(
                    result.player1Fov(), 
                    result.unitSpawnsPerPlayer().get(creator),
                    result.nb_units(),
                    roomId
                ),
                new Notification<RoomEvent>(Type.GAME_START, data),
                guest
            );

        }finally {
            lock.unlock();
        }
    }

    public List<RoomResponses.JoinRoom> getAvailableRooms() {
        return rooms.values().stream()
            .filter(room -> room.getStatus() == Status.WAITING)
            .map(room -> new RoomResponses.JoinRoom(room.getCreator(), room.id))
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

            String creator = room.getCreator();

            if (username.equals(creator) || room.getStatus() != Status.WAITING) {
                return null;
            }

            room.setGuest(username);
            room.setStatus(Status.FULL);
            playerToRoom.put(username, roomId);

            PlayerJoin data = new PlayerJoin(username, roomId);

            return new RoomService.JoinRoomResult(
                new RoomResponses.JoinRoom(creator, roomId),
                new Notification<RoomEvent>(Type.PLAYER_JOIN, data),
                creator
            );
        }finally {
            lock.unlock();
        }
    }

    public ForfeitResult processForfeit(String roomId, String username) {
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
            if(room.getStatus() != Status.PLAYING) {
                return null;
            }
            ForfeitResult result = gameService.forfeitGame(roomId, username);
            room.setStatus(Status.FINISHED);
            return result;
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

            switch(room.getStatus()) {
                case Status.WAITING, Status.FULL:
                    return handleNotStartedGame(room, username);
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
        String creator = room.getCreator();
        String guest = room.getGuest();

        if (username.equals(creator)) {
            rooms.remove(room.id);
            playerToRoom.remove(username);

            if (room.getStatus() == Status.WAITING) {
                return new LeaveRoomResult(null, null);
            }

            RoomDelete data = new RoomDelete(room.id);
            return new LeaveRoomResult(
                new Notification<RoomEvent>(Type.ROOM_DELETE, data),
                guest
            );
        }

        if (username.equals(guest)) {
            room.setGuest(null);
            room.setStatus(Status.WAITING);
            playerToRoom.remove(username);

            return new LeaveRoomResult(
                new Notification<RoomEvent>(
                    Type.PLAYER_LEAVE, 
                    new PlayerLeave(username, room.id)
                ),
                creator
            );
        }
        
        return null;
    }

    private LeaveRoomResult handleFinishedGame(Room room, String username) {
        String creator = room.getCreator();
        String guest = room.getGuest();

        if(!username.equals(creator) && !username.equals(guest)) {
            return null;
        }

        removePlayer(room, username);

        if(room.getCreator() == null && room.getGuest() == null) {
            rooms.remove(room.id);
            gameService.deleteGame(room.id);
        }

        return new LeaveRoomResult(null, null);
    }

    private void removePlayer(Room room, String username) {
        if(username.equals(room.getCreator())) {
            room.setCreator(null);
        }
        else if (username.equals(room.getGuest())) {
            room.setGuest(null);
        }
        playerToRoom.remove(username);
    }

}

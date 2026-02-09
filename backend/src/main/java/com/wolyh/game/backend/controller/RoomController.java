package com.wolyh.game.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.RoomResponses;
import com.wolyh.game.backend.dto.RoomResponses.CreateRoom;
import com.wolyh.game.backend.dto.RoomResponses.JoinRoom;
import com.wolyh.game.backend.dto.RoomResponses.StartGame;
import com.wolyh.game.backend.service.RoomService;
import com.wolyh.game.backend.service.RoomService.JoinRoomResult;
import com.wolyh.game.backend.service.RoomService.LeaveRoomResult;
import com.wolyh.game.backend.service.RoomService.StartGameResult;

@RestController
@RequestMapping("/api/room")
public class RoomController {

    @Autowired
    private RoomService roomService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/create")
    public ResponseEntity<CreateRoom> createRoom(Principal principal) {
        CreateRoom response = roomService.createRoom(principal.getName());
        if (response == null) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.ok(response);
    }
      
    @DeleteMapping("/leave/{roomId}")
    public ResponseEntity<Void> leaveRoom(
        @PathVariable String roomId, 
        Principal principal
    ) {
        LeaveRoomResult result = roomService.leaveRoom(roomId, principal.getName());
        if (result == null) {
            return ResponseEntity.badRequest().build();
        }

        sendIfNotNullToUser(result.username(), result.playerLeaveNotif(), result.gameOverNotif());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/join/{roomId}")
    public ResponseEntity<JoinRoom> joinRoom(
        @PathVariable String roomId, 
        Principal principal
    ) {
        JoinRoomResult result = roomService.joinRoom(roomId, principal.getName());
        if (result == null) {
            return ResponseEntity.badRequest().build();
        }

        sendIfNotNullToUser(result.username(), result.notification());
        return ResponseEntity.ok(result.response());
    }

    @GetMapping("/available")
    public ResponseEntity<List<RoomResponses.JoinRoom>> getAvailableRooms() {
        List<RoomResponses.JoinRoom> rooms = roomService.getAvailableRooms();
        if (rooms == null) {
            return ResponseEntity.badRequest().build();
        }
        
        return ResponseEntity.ok(rooms);
    }

    @PostMapping("/start/{roomId}")
    public ResponseEntity<StartGame> startGame(@PathVariable String roomId ) {
        StartGameResult result = roomService.startGame(roomId);
        if (result == null) {
            return ResponseEntity.badRequest().build();
        }

        sendIfNotNullToUser(result.username(), result.notification());
        return ResponseEntity.ok(result.response());
    }

    private void sendIfNotNullToUser(String username, Notification<?> ...notifications) {
        String destination = "/queue/specific-player";
        for(Notification<?> notification : notifications) {
            if (notification != null && username != null) {
                messagingTemplate.convertAndSendToUser(username, destination, notification);
            }
        }
    }
}
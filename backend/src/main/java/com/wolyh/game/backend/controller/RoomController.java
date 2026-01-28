package com.wolyh.game.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wolyh.game.backend.dto.RoomResponse;
import com.wolyh.game.backend.service.RoomService;

@RestController
@RequestMapping("/api/room")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(Principal principal) {
        RoomResponse response = roomService.createRoom(principal.getName());
        return ResponseEntity.ok(response);
    }
      
    @DeleteMapping("/leave/{roomId}")
    public ResponseEntity<RoomResponse> leaveRoom(@PathVariable String roomId, Principal principal) {
        RoomResponse response = roomService.leaveRoom(roomId, principal.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/join/{roomId}")
    public ResponseEntity<RoomResponse> joinRoom(@PathVariable String roomId, Principal principal) {
        RoomResponse response = roomService.joinRoom(roomId, principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/available")
    public List<RoomResponse> getAvailableRooms() {
        return roomService.getAvailableRooms();
    }

    @PostMapping("/start/{roomId}")
    public ResponseEntity<RoomResponse> startGame(@PathVariable String roomId ) {
        RoomResponse response = roomService.startGame(roomId);
        return ResponseEntity.ok(response);
    }

}
package com.wolyh.game.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameEvent;
import com.wolyh.game.backend.game.Result.ForfeitResult;
import com.wolyh.game.backend.game.Result.SkipTurnResult;
import com.wolyh.game.backend.game.Result.UnitActionResult;
import com.wolyh.game.backend.dto.UnitActionRequest;
import com.wolyh.game.backend.service.GameService;
import com.wolyh.game.backend.service.RoomService;

@Controller
public class GameController {

    @Autowired
    private GameService gameService;

    @Autowired
    private RoomService roomService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/room/{roomId}/game-forfeit")
    public void handleForfeit(
        @DestinationVariable String roomId,
        Principal principal
    ) {
        String username = principal.getName();
        ForfeitResult result = roomService.processForfeit(roomId, username);

        if (result == null) {
            System.err.println("Invalid forfeit attempt");
            return;
        }

        sendToUser(result.forfeitingPlayer(), roomId, List.of(result.gameOverNotif()));
        sendToUser(result.otherPlayer(), roomId, List.of(result.gameOverNotif()));
    }

    @MessageMapping("/room/{roomId}/turn-skip")
    public void handleSkipTurn(
        @DestinationVariable String roomId,
        Principal principal
    ) {
        String username = principal.getName();
        SkipTurnResult result = gameService.processSkipTurn(roomId, username);

        if (result == null) {
            System.err.println("Invalid skip turn attempt");
            return;
        }

        if(result.isGameOver()) {
            roomService.markGameAsFinished(roomId);
        }

        result.notifications().forEach((playerUsername, playerNotifs) -> sendToUser(
            playerUsername, roomId, playerNotifs
        ));
    }

    @MessageMapping("/room/{roomId}/unit-action")
    public void handleUnitAction(
        @DestinationVariable String roomId,
        @Payload UnitActionRequest action,
        Principal principal
    ) {
        String username = principal.getName();
        UnitActionResult result = gameService.processUnitAction(roomId, username, action);
        
        if (result == null) {
            System.err.println("Invalid unit action attempt");
            return;
        }

        if(result.isGameOver()) {
            roomService.markGameAsFinished(roomId);
        }

        result.notifications().forEach((playerUsername, playerNotifs) -> sendToUser(
            playerUsername, roomId, playerNotifs
        ));
    }

    private void sendToUser(String username, String roomId, List<Notification<GameEvent>> batch) {
        if (batch.isEmpty()) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/" + roomId,
            batch
        );
    }
}

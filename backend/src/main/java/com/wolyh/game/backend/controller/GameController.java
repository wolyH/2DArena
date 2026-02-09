package com.wolyh.game.backend.controller;

import java.security.Principal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.UnitActionRequest;
import com.wolyh.game.backend.service.GameService;
import com.wolyh.game.backend.service.GameService.SkipTurnResult;
import com.wolyh.game.backend.service.GameService.UnitActionResult;

@Controller
public class GameController {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/room/{roomId}/turn-skip")
    public void handleSkipTurn(
        @DestinationVariable String roomId,
        @Payload int unitIdx,
        Principal principal
    ) {
        String username = principal.getName();
        SkipTurnResult result = gameService.processSkipTurn(roomId, username, unitIdx);

        if(result == null) {
            System.err.println("Skip Turn Request not valid");
            return;
        }

        sendIfNotNull(
            roomId,
            result.turnChangeNotif(),
            result.mapShrinkNotif(), 
            result.gameOverNotif()
        );
    }

    @MessageMapping("/room/{roomId}/unit-action")
    public void handleUnitAction(
        @DestinationVariable String roomId,
        @Payload UnitActionRequest action,
        Principal principal
    ) {
        String username = principal.getName();
        UnitActionResult result = gameService.processUnitAction(roomId, username, action);

        if(result == null) {
            System.err.println("Unit Action Request not valid");
            return;
        }

        sendIfNotNull(
            roomId,
            result.unitActionNotif(),
            result.turnChangeNotif(),
            result.mapShrinkNotif(), 
            result.gameOverNotif()
        );
    }

    private void sendIfNotNull(String roomId, Notification<?> ...notifications) {
        String destination = "/topic/room/" + roomId;
        for(Notification<?> notification : notifications) {
            if (notification != null) {
                messagingTemplate.convertAndSend(destination, notification);
            }
        }
    }

}

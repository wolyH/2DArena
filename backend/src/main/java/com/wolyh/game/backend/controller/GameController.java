package com.wolyh.game.backend.controller;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.NotificationBatch;
import com.wolyh.game.backend.dto.UnitActionRequest;
import com.wolyh.game.backend.service.GameService;
import com.wolyh.game.backend.service.GameService.SkipTurnResult;
import com.wolyh.game.backend.service.GameService.UnitActionResult;
import com.wolyh.game.backend.service.GameService.UnitAttackResult;
import com.wolyh.game.backend.service.GameService.UnitMoveResult;

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

        sendBatchToUser(
            result.activePlayer(),
            batch(
                result.turnChangeNotif(), 
                result.mapShrinkNotifActive(), 
                result.gameOverNotif()
            )
        );

        sendBatchToUser(
            result.inactivePlayer(),
            batch(
                result.turnChangeNotif(), 
                result.mapShrinkNotifIncative(), 
                result.gameOverNotif()
            )
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

        switch (result) {
            case UnitMoveResult moveResult -> {
                sendBatchToUser(
                    moveResult.activePlayer(),
                    batch(
                        moveResult.unitMoveNotifActive(),
                        moveResult.turnChangeNotif(), 
                        moveResult.mapShrinkNotifActive(), 
                        moveResult.gameOverNotif()
                    )
                );   
                sendBatchToUser(
                    moveResult.inactivePlayer(),
                    batch(
                        moveResult.unitMoveNotifInactive(),
                        moveResult.turnChangeNotif(), 
                        moveResult.mapShrinkNotifInactive(), 
                        moveResult.gameOverNotif()
                    )
                );   
                
            }
            case UnitAttackResult attackResult -> {
                sendBatchToUser(
                    attackResult.activePlayer(),
                    batch(
                        attackResult.unitAttackNotifActive(),
                        attackResult.turnChangeNotif(), 
                        attackResult.mapShrinkNotifActive(), 
                        attackResult.gameOverNotif()
                    )
                );   
                sendBatchToUser(
                    attackResult.inactivePlayer(),
                    batch(
                        attackResult.unitAttackNotifInactive(),
                        attackResult.turnChangeNotif(), 
                        attackResult.mapShrinkNotifInactive(), 
                        attackResult.gameOverNotif()
                    )
                ); 
            }
            default -> {
                 System.err.println("Unit Action Request not valid");
            }
        }
    }

    private void sendBatchToUser(String username, NotificationBatch batch) {
        if (username == null || batch == null || batch.notifications().isEmpty()) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/specific-player",
            batch
        );
    }

    private NotificationBatch batch(Notification<?>... notifs) {
        List<Notification<?>> list = new ArrayList<>();
        for (Notification<?> n : notifs) {
            if (n != null) {
                list.add(n);
            }
        }
        return new NotificationBatch(list);
    }
}

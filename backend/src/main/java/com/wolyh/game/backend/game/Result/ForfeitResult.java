package com.wolyh.game.backend.game.Result;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameEvent;

public record ForfeitResult(
        String forfeitingPlayer,
        String otherPlayer,
        Notification<GameEvent> gameOverNotif
) {}
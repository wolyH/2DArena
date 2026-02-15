package com.wolyh.game.backend.game.Result;

import java.util.List;
import java.util.Map;

import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameEvent;

public record GameActionResult(
    boolean isGameOver,
    Map<String, List<Notification<GameEvent>>> notifications
) {}

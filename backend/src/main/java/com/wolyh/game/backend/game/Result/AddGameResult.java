package com.wolyh.game.backend.game.Result;

import java.util.Set;

public record AddGameResult (
        Set<String> player1Fov,
        Set<String> player2Fov
) {}
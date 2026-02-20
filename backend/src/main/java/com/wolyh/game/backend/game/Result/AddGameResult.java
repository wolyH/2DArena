package com.wolyh.game.backend.game.Result;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.wolyh.game.backend.model.UnitCoordinates;

public record AddGameResult (
        Set<String> player1Fov,
        Set<String> player2Fov,
        Map<String, List<UnitCoordinates>> unitSpawnsPerPlayer,
        int nb_units
) {}
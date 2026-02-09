package com.wolyh.game.backend.dto;

import com.wolyh.game.backend.model.HexCoordinates;

public record UnitActionRequest(
    String type,
    int unitIdx,
    HexCoordinates goal
) {}

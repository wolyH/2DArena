package com.wolyh.game.backend.game.Result;

import java.util.List;
import java.util.Map;
import java.util.Set;

public record ShrinkMapResult(
    boolean occurred,
    int shrinkLevel,
    List<Integer> deadUnits,
    Map<String, Set<String>> playerFovs
){}

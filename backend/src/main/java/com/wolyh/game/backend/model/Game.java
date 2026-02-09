package com.wolyh.game.backend.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.wolyh.game.backend.model.UnitManager.EndConditionResult;

public class Game {
    private final MapManager mapManager;
    private final UnitManager unitManager;
    private final FovManager fovManager;
    private final PathManager pathManager;

    private String player1;
    private String player2;
    private int turn = 0;
    private boolean isGameOver = false;

    public Game(
        MapManager mapManager,
        UnitManager unitManager,
        FovManager fovManager,
        PathManager pathManager,
        String player1, 
        String player2
    ) {
        this.player1 = player1;
        this.player2 = player2;

        this.mapManager = mapManager;
        this.unitManager = unitManager;
        this.fovManager = fovManager;
        this.pathManager = pathManager;
        
        unitManager.spawnUnits();
        fovManager.resetFov();
    }

    public Set<String> getFov() {
        return fovManager.getFov();
    }

    public int getTurn() {
        return turn;
    }

    public int getUnitIdx() {
        return unitManager.getUnitIdx();
    }

    public int getShrinkLevel() {
        return mapManager.getShrinkLevel();
    }

    public boolean isGameOver() {
        return isGameOver;
    }

    public String getActivePlayer() {
        return unitManager.getActivePlayer();
    }

    public EndTurnResult skipTurn(int unitIdx) {
        if(unitManager.getUnitIdx() != unitIdx) {
            return null;
        }
        return endTurn();
    }

    public EndTurnResult moveUnit(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return null;
        }

        unitManager.setUnitHex(unitIdx, hex);
        fovManager.updateFov();

        return endTurn();
    }

    public ArrayList<HexCoordinates> searchPath(HexCoordinates goalCoords) {
        return pathManager.searchPath(goalCoords);
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path) {
        return fovManager.getPathFov(path);
    }

    public record AttackResult(EndTurnResult endTurnResult, Set<String> fov) {}

    public AttackResult attack(HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return null;
        }

        hex.getUnit().setDead(true);
        fovManager.updateFov();
        Set<String> fov = getFov();
        return new AttackResult(endTurn(), fov);
    }

    public boolean canUnitMoveOnHex(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return false;
        }
        if (unitManager.getUnitIdx() != unitIdx) {
            return false;
        }
        if (!hex.isTraversable() || !fovManager.isVisible(hex)) {
            return false;
        }
        return true;
    }

    public boolean canUnitAttackOnHex(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return false;
        }

        if (unitManager.getUnitIdx() != unitIdx) {
            return false;
        }

        if (hex.isTraversable() || 
            !fovManager.isVisible(hex) || 
            hex.getUnit().getPlayer().equals(unitManager.getActivePlayer())
        ) {
            return false;
        }
        return true;
    }

    public record EndTurnResult(
        boolean turnChanged,
        boolean mapShrinked,
        Set<String> fov,
        List<Integer> deadUnits, 
        boolean gameOver, 
        String winner
    ) {}

    public EndTurnResult endTurn() {
        GameOverResult gameOverResult = checkGameOver();
        if(gameOverResult.isGameOver()) {
            return new EndTurnResult(
                false, 
                false,
                new HashSet<>(),
                List.of(), 
                true, 
                gameOverResult.winner()
            );
        }

        turn++;

        boolean mapShrinked = shouldShrinkMap();
        if (mapShrinked) {
            mapManager.shrink();
        }
        
        List<Integer> deadUnits = mapShrinked ? unitManager.killOutOfMapUnits() : List.of();
        if (mapShrinked) {
            fovManager.resetFov();
        }
        Set<String> fov = mapShrinked ? getFov() : new HashSet<>();

        gameOverResult = checkGameOver();
        unitManager.updateActiveUnit();

        return new EndTurnResult(
            true, 
            mapShrinked,
            fov,
            deadUnits, 
            gameOverResult.isGameOver(), 
            gameOverResult.winner()
        );
    }

    private boolean shouldShrinkMap() {
        return turn % 5 == 0 && turn > 1;
    }

    private record GameOverResult(boolean isGameOver, String winner) {}

    private GameOverResult checkGameOver() {
        EndConditionResult result = unitManager.checkEndCondition();
        
        if (result.player1Won() && !result.player2Won()) {
            isGameOver = true;
            return new GameOverResult(true, player1);
        } else if (result.player2Won() && !result.player1Won()) {
            isGameOver = true;
            return new GameOverResult(true, player2);
        } else if (result.player1Won() && result.player2Won()) {
            isGameOver = true;
            return new GameOverResult(true, null);
        }
        
        return new GameOverResult(false, null);
    }
}
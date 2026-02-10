package com.wolyh.game.backend.model;

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

    public Set<String> getFov(String username) {
        return fovManager.getFov(username);
    }

    public int getTurn() {
        return turn;
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

    public String getInactivePlayer() {
        if(getActivePlayer().equals(player1)) {
            return player2;
        }
        return player1;
    }
    public EndTurnResult skipTurn(int unitIdx) {
        if(!unitManager.isUnitActive(unitIdx)) {
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

    public List<HexCoordinates> searchPath(HexCoordinates goalCoords) {
        return pathManager.searchPath(goalCoords, getActivePlayer());
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path, String username) {
        return fovManager.getPathFov(path, username);
    }

    public List<List<UnitCoordinates>> getVisibleUnitsAlongPath(List<Set<String>> pathFov) {
        return this.unitManager.getVisibleUnitsAlongPath(pathFov);
    }

    public List<HexCoordinates> calculateEnemyPovPath(List<HexCoordinates> path, String enemy) {
        return pathManager.calculateEnemyPovPath(path, enemy);
    }

    public record AttackResult(EndTurnResult endTurnResult, Set<String> fov1,  Set<String> fov2) {}

    public AttackResult attack(HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return null;
        }

        hex.getUnit().setDead(true);
        fovManager.updateFov();
        Set<String> fov1 = getFov(player1);
        Set<String> fov2 = getFov(player2);
        return new AttackResult(endTurn(), fov1, fov2);
    }

    public boolean canUnitMoveOnHex(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            return false;
        }
        if (!unitManager.isUnitActive(unitIdx)) {
            return false;
        }
        if (!hex.isTraversable() || !fovManager.isVisible(hex, getActivePlayer())) {
            return false;
        }
        return true;
    }

    public boolean canUnitAttackOnHex(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            System.err.println("Target hex is not on the map");
            return false;
        }

        if (!unitManager.isUnitActive(unitIdx)) {
            System.err.println("Unit is not active");
            return false;
        }

        if (hex.isTraversable() || 
            !fovManager.isVisible(hex, getActivePlayer()) || 
            hex.getUnit().getPlayer().equals(unitManager.getActivePlayer())
        ) {
            System.err.println(hex.isTraversable());
            System.err.println(!fovManager.isVisible(hex, getActivePlayer()));
            System.err.println(hex.getUnit().getPlayer().equals(unitManager.getActivePlayer()));
            System.err.println("Target unit is either an obstacle, not visible or occupied by an ally");
            return false;
        }
        return true;
    }

    public record EndTurnResult(
        boolean turnChanged,
        int nextUnitIdx,
        boolean mapShrinked,
        Set<String> fovActive,
        Set<String> fovIncative,
        List<Integer> deadUnits, 
        boolean gameOver, 
        String winner
    ) {}

    public EndTurnResult endTurn() {
        String activePlayer = getActivePlayer();
        String inactivePlayer = getInactivePlayer();

        GameOverResult gameOverResult = checkGameOver();
        if(gameOverResult.isGameOver()) {
            return new EndTurnResult(
                false,
                -1,
                false,
                null,
                null,
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
        Set<String> fovActive = null;
        Set<String> fovInactive = null;

        if (mapShrinked) {
            fovManager.resetFov();
            fovActive = fovManager.getFov(activePlayer);
            fovInactive = fovManager.getFov(inactivePlayer);
        }

        gameOverResult = checkGameOver();
        unitManager.updateActiveUnit();

        return new EndTurnResult(
            true,
            unitManager.getActiveUnitIdx(),
            mapShrinked,
            fovActive,
            fovInactive,
            deadUnits, 
            gameOverResult.isGameOver(), 
            gameOverResult.winner()
        );
    }

    private boolean shouldShrinkMap() {
        return turn % 15 == 0 && turn > 1;
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
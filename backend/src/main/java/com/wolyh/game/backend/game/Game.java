package com.wolyh.game.backend.game;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.wolyh.game.backend.game.Result.ShrinkMapResult;
import com.wolyh.game.backend.game.UnitManager.EndConditionResult;
import com.wolyh.game.backend.model.Hex;
import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.UnitCoordinates;

public class Game {
    private final MapManager mapManager;
    private final UnitManager unitManager;
    private final FovManager fovManager;
    private final PathManager pathManager;
    private final PlayerManager playerManager;
    private final TurnManager turnManager;

    private boolean isGameOver = false;

    public Game(String player1, String player2) {
        this.mapManager = new MapManager();
        this.playerManager = new PlayerManager(player1, player2);
        this.turnManager = new TurnManager();
        this.unitManager = new UnitManager(mapManager, playerManager);
        this.fovManager = new FovManager(unitManager, mapManager, playerManager);
        this.pathManager = new PathManager(mapManager, unitManager, fovManager, playerManager);
        
        unitManager.spawnUnits();
        fovManager.resetFov();
    }

    public Set<String> getFov(String username) {
        return fovManager.getFov(username);
    }

    public Map<String, List<UnitCoordinates>> getUnitLocations() {
        return unitManager.getUnitLocations();
    }

    public int getNumberOfUnits() {
        return unitManager.getNumberOfUnits();
    }

    public String getActivePlayer() {
        return unitManager.getActivePlayer();
    }

    public boolean isPlayerActive(String username) {
        return unitManager.getActivePlayer().equals(username);
    }

    public String getOtherPlayer(String username) {
        return playerManager.getOtherPlayer(username);
    }

    public boolean isGameOver() {
        return isGameOver;
    }

    public void setGameOver() {
        if(isGameOver) {
            System.err.println("game already over");
        }
        isGameOver = true;
    }

    public void moveUnit(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        unitManager.setUnitHex(unitIdx, hex);
        fovManager.updateFov();
    }

    public List<HexCoordinates> searchPath(HexCoordinates goalCoords, int unitIdx, String username) {
        return pathManager.searchPath(goalCoords, unitIdx, username);
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path, String username) {
        return fovManager.getPathFov(path, username);
    }

    public List<List<UnitCoordinates>> getVisibleUnitsAlongPath(List<Set<String>> pathFov) {
        return fovManager.getVisibleUnitsAlongPath(pathFov);
    }

    public List<HexCoordinates> calculateEnemyPovPath(List<HexCoordinates> path, String enemy) {
        return pathManager.calculateEnemyPovPath(path, enemy);
    }

    public Map<String, Set<String>> killUnitOn(HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        hex.getUnit().setDead(true);
        fovManager.updateFov();

        String player1 = playerManager.getPlayer1();
        String player2 = playerManager.getPlayer2();

        Map<String, Set<String>> playerFovs = Map.of(
            player1, fovManager.getFov(player1),
            player2, fovManager.getFov(player2)
        );

        return playerFovs;
    }

    public boolean canUnitMoveOnHex(int unitIdx, HexCoordinates coords) {
        Hex hex = mapManager.getHex(Hex.key(coords.q(), coords.r()));

        if(hex == null) {
            System.err.println("Target hex is not on the map");
            return false;
        }

        if (!unitManager.isUnitActive(unitIdx)) {
            System.err.println("Unit is not active");
            return false;
        }

        if (!fovManager.isVisibleBy(hex, getActivePlayer())) {
            System.err.println("Target hex not visible by the player/unit");
        }
        
        if (!hex.isTraversable()) {
            System.err.println("Target hex is either an obstacle, occupied by a unit");
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

        if (!fovManager.isVisibleBy(hex, getActivePlayer())) {
            System.err.println("Target hex not visible by the player/unit");
            return false;
        }

        if (hex.getUnit() == null) {
            System.err.println("Target hex has no unit");
            return false;
        }

        if (hex.getUnit().getPlayer().equals(unitManager.getActivePlayer())) {
            System.err.println("Target unit is an ally");
            return false;
        }

        return true;
    }

    public int nextTurn() {
        turnManager.incrementTurn();
        return unitManager.setNextActiveUnit();
    }

    public ShrinkMapResult shrinkMapIfNeeded() {
        if (!turnManager.shouldShrinkMap()) {
            return new ShrinkMapResult(false, -1, null, null);
        }

        int shrinkLevel = mapManager.shrink();
        List<Integer> deadUnits = unitManager.killOutOfMapUnits();
        fovManager.resetFov();

        String player1 = playerManager.getPlayer1();
        String player2 = playerManager.getPlayer2();

        Map<String, Set<String>> playerFovs = Map.of(
            player1, fovManager.getFov(player1),
            player2, fovManager.getFov(player2)
        );

        return new ShrinkMapResult(true, shrinkLevel, deadUnits, playerFovs);
    }
    
    public String resolveGameOver() {
        EndConditionResult result = unitManager.checkEndCondition();

        if(!result.player1Won() && !result.player2Won()) {
            return null;
        }

        isGameOver = true;

        if(result.player1Won() && result.player2Won()) {
            return null;
        }
        
        return result.player1Won() ? playerManager.getPlayer1() : playerManager.getPlayer2();
    }
}
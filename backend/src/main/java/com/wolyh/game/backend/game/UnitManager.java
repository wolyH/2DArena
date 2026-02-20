package com.wolyh.game.backend.game;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Consumer;

import com.wolyh.game.backend.model.Hex;
import com.wolyh.game.backend.model.Unit;
import com.wolyh.game.backend.model.UnitCoordinates;

public class UnitManager {
    private final MapManager mapManager;
    private final PlayerManager playerManager;

    private final Random random = new Random();

    private final int nb_units_per_player = 3;
    private final int inital_min_dist_between_units = 2;

    private Unit[] units;
    private int ActiveUnitIdx = 0;

    public UnitManager(
        MapManager mapManager,
        PlayerManager playerManager
    ) {
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.units = new Unit[2* nb_units_per_player];
    }

    public Hex getHex(int ActiveUnitIdx) {
        return this.units[ActiveUnitIdx].getHex();
    }

    public void setUnitHex(int idx, Hex hex) {
        this.units[idx].getHex().setUnit(null);
        this.units[idx].setHex(hex);

        hex.setUnit(this.units[idx]);
    }

    public void forEachAliveUnit(Consumer<Unit> action) {
        for (Unit unit : units) {
            if (unit != null && !unit.isDead()) {
                action.accept(unit);
            }
        }
    }

    public int setNextActiveUnit() {
        for (int i = 1 ; i < units.length ; i++) {
            int nextIdx = (ActiveUnitIdx + i) % units.length;
            if (!units[nextIdx].isDead()) {
                ActiveUnitIdx = nextIdx;
                return nextIdx;
            }
        }
        return -1;
    }
    
    public String getActivePlayer() {
        return units[ActiveUnitIdx].getPlayer();
    }

    public boolean isActivePlayer(Unit unit) {
        return unit.getPlayer().equals(getActivePlayer());
    }

    public boolean isUnitActive(Unit unit) {
        return this.ActiveUnitIdx == unit.idx;
    }

    public boolean isUnitActive(int idx) {
        return this.ActiveUnitIdx == idx;
    }

    public void spawnUnits() {
        List<Hex> possibleSpawns = mapManager.generateSpawns(inital_min_dist_between_units);

        if(possibleSpawns.size() < 2 * nb_units_per_player) {
            throw new IllegalArgumentException(
                "A min spawn distance of "  + 
                inital_min_dist_between_units + 
                " bewteen unit is too large for the map size"
            );
        }

        for (int i = 0 ; i < units.length ; i++) {
            Hex hex = possibleSpawns.remove(random.nextInt(possibleSpawns.size()));
            if(i % 2 == 0) {
                units[i] = new Unit(hex, playerManager.getPlayer1(), i);
            }
            else {
                units[i] = new Unit(hex, playerManager.getPlayer2(), i);
            }
        }
    }

    public Map<String, List<UnitCoordinates>> getUnitLocations() {
        Map<String, List<UnitCoordinates>> unitLocationsPerPlayer = new HashMap<>();

        unitLocationsPerPlayer.put(playerManager.getPlayer1(), new ArrayList<>());
        unitLocationsPerPlayer.put(playerManager.getPlayer2(), new ArrayList<>());

        for (int i = 0 ; i < units.length ; i++) {
            if(units[i].isDead()) {
                continue;
            }

            unitLocationsPerPlayer.get(units[i].getPlayer()).add(new UnitCoordinates(
                i, 
                units[i].getHex().getQ(), 
                units[i].getHex().getR()
            ));
        }
        
        return unitLocationsPerPlayer;
    }

    public int getNumberOfUnits() {
        return 2 * nb_units_per_player;
    }

    public record EndConditionResult(boolean player1Won, boolean player2Won) {}

    public EndConditionResult checkEndCondition() {
        int player1Units = 0;
        int player2Units = 0;

        for (Unit unit : units) {
            if (unit != null && !unit.isDead()) {
                if(unit.getPlayer().equals(playerManager.getPlayer1())) {
                    player1Units++;
                }
                if (unit.getPlayer().equals(playerManager.getPlayer2())) {
                    player2Units++;
                }
            }
        }
        
        return new EndConditionResult(player2Units == 0, player1Units == 0);
    }

    public List<Integer> killOutOfMapUnits() {
        List<Integer> deadUnits = new ArrayList<>();
        for (int i = 0 ; i < units.length ; i++) {
            if(!mapManager.hasHex(units[i].getHex().getKey())) {
                if(!units[i].isDead()) {
                    units[i].setDead(true);
                    deadUnits.add(i);
                }
            }
        }
        return deadUnits;
    }
}

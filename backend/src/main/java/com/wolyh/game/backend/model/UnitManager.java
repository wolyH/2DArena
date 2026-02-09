package com.wolyh.game.backend.model;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class UnitManager {
    private final MapManager mapManager;
    private final int nb_units = 3;

    private String player1;
    private String player2;
    private Unit[] units;
    private int unitIdx = 0;

    public UnitManager(
        MapManager mapManager, 
        String player1, 
        String player2
    ) {
        this.mapManager = mapManager;
        this.player1 = player1;
        this.player2 = player2;
        this.units = new Unit[nb_units];
    }

    public int getUnitIdx() {
        return this.unitIdx;
    }

    public Hex getUnitHex(int idx) {
        if (idx < 0 || idx >= units.length) {
            throw new IllegalArgumentException(
                "Invalid unit index: " + idx + 
                ". Must be between 0 and " + (units.length - 1));
        }
        return this.units[idx].getHex();
    }

    public void setUnitHex(int idx, Hex hex) {
        if (idx < 0 || idx >= units.length) {
            throw new IllegalArgumentException(
                "Invalid unit index: " + idx + 
                ". Must be between 0 and " + (units.length - 1));
        }
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

    public void updateActiveUnit() {
        for (int i = 1 ; i < units.length ; i++) {
            int nextIdx = (unitIdx + i) % units.length;
            if (!units[nextIdx].isDead()) {
                unitIdx = nextIdx;
                break;
            }
        }
    }
    
    public String getActivePlayer() {
        return units[unitIdx].getPlayer();
    }

    public boolean isUnitActive(Unit unit) {
        return this.unitIdx == unit.idx;
    }

    public void spawnUnits() {
        Hex hex1 = mapManager.getHex(Hex.key(-(mapManager.n-1), 0));
        Hex hex2 = mapManager.getHex(Hex.key(mapManager.n-1, 0));
        Hex hex3 = mapManager.getHex(Hex.key(mapManager.n-2, 0));

        Unit unit1 = new Unit(hex1, player1, 0);
        Unit unit2 = new Unit(hex2, player2, 1);
        Unit unit3 = new Unit(hex3, player2, 2);
        units[0] = unit1;
        units[1] = unit2;
        units[2] = unit3;
    }

    public record EndConditionResult(boolean player1Won, boolean player2Won) {}

    public EndConditionResult checkEndCondition() {
        int player1Units = 0;
        int player2Units = 0;

        for (Unit unit : units) {
            if (unit != null && !unit.isDead()) {
                if(unit.getPlayer().equals(player1)) {
                    player1Units++;
                }
                if (unit.getPlayer().equals(player2)) {
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

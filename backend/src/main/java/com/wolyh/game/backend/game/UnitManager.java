package com.wolyh.game.backend.game;

import java.util.ArrayList;
import java.util.List;

import java.util.function.Consumer;

import com.wolyh.game.backend.model.Hex;
import com.wolyh.game.backend.model.Unit;

public class UnitManager {
    private final MapManager mapManager;
    private final PlayerManager playerManager;
    private final int nb_units = 3;

    private Unit[] units;
    private int ActiveUnitIdx = 0;

    public UnitManager(
        MapManager mapManager,
        PlayerManager playerManager
    ) {
        this.mapManager = mapManager;
        this.playerManager = playerManager;
        this.units = new Unit[nb_units];
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
        Hex hex1 = mapManager.getHex(Hex.key(-(mapManager.n-1), 0));
        Hex hex2 = mapManager.getHex(Hex.key(mapManager.n-1, 0));
        Hex hex3 = mapManager.getHex(Hex.key(mapManager.n-2, 0));

        Unit unit1 = new Unit(hex1, playerManager.getPlayer1(), 0);
        Unit unit2 = new Unit(hex2, playerManager.getPlayer2(), 1);
        Unit unit3 = new Unit(hex3, playerManager.getPlayer2(), 2);
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

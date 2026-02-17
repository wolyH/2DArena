package com.wolyh.game.backend.game;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.wolyh.game.backend.model.Hex;
import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.Unit;
import com.wolyh.game.backend.model.UnitCoordinates;

public class FovManager {
    private final UnitManager unitManager;
    private final MapManager mapManager;

    private HashMap<String, List<String>> visibilityMap = new HashMap<>();
    private Map<String, Set<String>> playerFovs = new HashMap<>();

    public FovManager(
        UnitManager unitManager, 
        MapManager mapManager,
        PlayerManager playerManager
    ) {
        this.unitManager = unitManager;
        this.mapManager = mapManager;

        playerFovs.put(playerManager.getPlayer1(), new HashSet<>());
        playerFovs.put(playerManager.getPlayer2(), new HashSet<>());

        this.updateVisibilityMap();
    }

    public void resetFov() {
        this.updateVisibilityMap();
        this.updateFov();
    }

    public void updateFov() {
        playerFovs.values().forEach(fov -> fov.clear());
        unitManager.forEachAliveUnit(unit -> {
            String player = unit.getPlayer();
            Set<String> fov = playerFovs.get(player);
            fov.addAll(getUnitFov(unit.getHex().getKey()));
        });
    }

    public boolean isVisibleBy(Hex hex, String username) {
        Set<String> fov = playerFovs.get(username);
        return fov.contains(hex.getKey());
    }

    public boolean isVisibleBy(HexCoordinates hexCoords, String username) {
        Set<String> fov = playerFovs.get(username);
        return fov.contains(Hex.key(hexCoords.q(), hexCoords.r()));
    }

    public Set<String> getFov(String username) {
        return new HashSet<>(playerFovs.get(username));
    }

    private List<String> getUnitFov(String hexKey) {
        List<String> fov = visibilityMap.get(hexKey);
        if (fov != null) {
            return fov;
        }
        throw new IllegalArgumentException("Hex: " + hexKey + " not on the map ");
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path, String username) {
        List<Set<String>> pathFov = new ArrayList<>();
        Set<String> otherFov = new HashSet<>();

        unitManager.forEachAliveUnit(unit -> {
            if(!unitManager.isUnitActive(unit) && unit.getPlayer().equals(username)) {
                otherFov.addAll(getUnitFov(unit.getHex().getKey()));
            }
        });

        for(HexCoordinates hexCoords: path) {
            Set<String> snapshot = new HashSet<>();
            snapshot.addAll(otherFov);
            snapshot.addAll(getUnitFov(Hex.key(hexCoords.q(), hexCoords.r())));
            pathFov.add(snapshot);
        }
        return pathFov;
    }

    public List<List<UnitCoordinates>> getVisibleUnitsAlongPath(List<Set<String>> pathPov) {
        Map<String, UnitCoordinates> enemyUnitsByHex = new HashMap<>();

        unitManager.forEachAliveUnit(unit -> {
            if (!unitManager.isActivePlayer(unit) && unit.getHex() != null) {
                Hex unitHex = unit.getHex();
                String key = Hex.key(unitHex.getQ(), unitHex.getR());
                enemyUnitsByHex.put(key, new UnitCoordinates(unit.idx, unitHex.getQ(), unitHex.getR()));
            }
        });

        List<List<UnitCoordinates>> visibleUnitsAlongPath = new ArrayList<>(pathPov.size());

        for(Set<String> snapshot: pathPov) {
            List<UnitCoordinates> visibleUnits = new ArrayList<>();
            for (String hexKey : snapshot) {
                UnitCoordinates unit = enemyUnitsByHex.get(hexKey);
                if (unit != null) {
                    visibleUnits.add(unit);
                }
            }
            visibleUnitsAlongPath.add(visibleUnits);
        }
        
        return visibleUnitsAlongPath;
    }

    private void updateVisibilityMap() {
        this.visibilityMap.clear();

        for (Map.Entry<String, Hex> entry1 : mapManager.getMap().entrySet()) {
            ArrayList<String> fov = new ArrayList<>();
            for (Map.Entry<String, Hex> entry2 : mapManager.getMap().entrySet()) {
                if(rayCast(entry1.getValue(), entry2.getValue(), Unit.VISIBILITY_RANGE)) {
                    fov.add(entry2.getKey());
                }
            }
            visibilityMap.put(entry1.getKey(), fov);
        }
    }

    private double lerp(double a, double b, double t) {
        return a + (b - a) * t;
    }

    private record CuberLerpResult(double q, double r, double s) {}

    private CuberLerpResult cubeLerp(Hex h1, Hex h2, double t) {
        return new CuberLerpResult(lerp(h1.getQ(), h2.getQ(), t), 
            lerp(h1.getR(), h2.getR(), t),
            lerp(h1.getS(), h2.getS(), t)
        );
    }

    private boolean rayCast(Hex h1, Hex h2, int visibilityRange) {
        int distance = h1.distance(h2);
        if(distance > visibilityRange) {
            return false;
        }

        for (int i = 0 ; i <= distance ; i++) {
            CuberLerpResult result = cubeLerp(h1, h2, 1.0 / visibilityRange * i);
            Hex hex = mapManager.getHex(Hex.key((int)Math.round(result.q()), (int)Math.round(result.r())));
            if(hex != null && hex.isObstacle()) {
                return false;
            }
        }
        return true;
    }
}

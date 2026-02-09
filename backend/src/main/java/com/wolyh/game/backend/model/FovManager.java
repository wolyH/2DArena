package com.wolyh.game.backend.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class FovManager {
    private final UnitManager unitManager;
    private final MapManager mapManager;
    private HashMap<String, List<String>> visibilityMap = new HashMap<>();
    private Set<String> fov = new HashSet<>();

    public FovManager(
        UnitManager unitManager, 
        MapManager mapManager
    ) {
        this.unitManager = unitManager;
        this.mapManager = mapManager;
        this.updateVisibilityMap();
    }

    public boolean isVisible(Hex hex) {
        return fov.contains(hex.getKey());
    }

    public Set<String> getFov() {
        return new HashSet<>(fov);
    }

    private List<String> getUnitFov(String hexKey) {
        List<String> fov = visibilityMap.get(hexKey);
        if (fov != null) {
            return fov;
        }
        return List.of();
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path) {
        List<Set<String>> pathFov = new ArrayList<>();
        Set<String> otherFov  = new HashSet<>();
        unitManager.forEachAliveUnit(unit -> {
            if(!unitManager.isUnitActive(unit)) {
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

    public void resetFov() {
        this.updateVisibilityMap();
        this.updateFov();
    }

    public void updateFov() {
        fov.clear();
        unitManager.forEachAliveUnit(unit -> {
            fov.addAll(getUnitFov(unit.getHex().getKey()));
        });
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
        return  a + (b - a) * t;
    }

    private record CuberLerpResult(double q, double r, double s) {}

    private CuberLerpResult cubeLerp(Hex h1, Hex h2, double t) {
        return new CuberLerpResult(lerp(h1.getQ(), h2.getQ(), t), 
        lerp(h1.getR(), h2.getR(), t),
        lerp(h1.getS(), h2.getS(), t));
    }

    private boolean rayCast(Hex h1, Hex h2, int visibilityRange) {
        int distance = h1.distance(h2);
        if(distance > visibilityRange) {
            return false;
        }
        boolean isVisible = false;

        for (int i = 0 ; i <= distance ; i++) {
            CuberLerpResult result = cubeLerp(h1, h2, 1.0 / visibilityRange * i);
            Hex hex = mapManager.getHex(Hex.key((int)Math.round(result.q()), (int)Math.round(result.r())));
            if(hex != null && !hex.isObstacle()) {
                isVisible = true;
            }
        }
        return isVisible;
    }
}

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
    private Set<String> fov1 = new HashSet<>();
    private Set<String> fov2 = new HashSet<>();

    public FovManager(
        UnitManager unitManager, 
        MapManager mapManager
    ) {
        this.unitManager = unitManager;
        this.mapManager = mapManager;
        this.updateVisibilityMap();
    }

    public boolean isVisible(Hex hex, String username) {
        if(username.equals(unitManager.player1)) {
            return fov1.contains(hex.getKey());
        }
        if(username.equals(unitManager.player2)) {
            return fov2.contains(hex.getKey());
        }
        throw new IllegalArgumentException(
            "username must be the username of a player present in the room"
        );
    }

    public boolean isVisible(HexCoordinates hexCoords, String username) {
        if(username.equals(unitManager.player1)) {
            return fov1.contains(Hex.key(hexCoords.q(), hexCoords.r()));
        }
        if(username.equals(unitManager.player2)) {
            return fov2.contains(Hex.key(hexCoords.q(), hexCoords.r()));
        }
        throw new IllegalArgumentException(
            "username must be the username of a player present in the room"
        );
    }

    public Set<String> getFov(String username) {
        if(username.equals(unitManager.player1)) {
            return new HashSet<>(fov1);
        }
        if(username.equals(unitManager.player2)) {
            return new HashSet<>(fov2);
        }
        throw new IllegalArgumentException(
            "username must be the username of a player present in the room"
        );
    }

    private List<String> getUnitFov(String hexKey) {
        List<String> fov = visibilityMap.get(hexKey);
        if (fov != null) {
            return fov;
        }
        return List.of();
    }

    public List<Set<String>> getPathFov(List<HexCoordinates> path, String username) {
        if(!username.equals(unitManager.player1) && !username.equals(unitManager.player2)) {
             throw new IllegalArgumentException(
                "username must be the username of a player present in the room"
            );
        }

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


    public void resetFov() {
        this.updateVisibilityMap();
        this.updateFov();
    }

    public void updateFov() {
        fov1.clear();
        fov2.clear();

        unitManager.forEachAliveUnit(unit -> {
            if(unit.getPlayer().equals(unitManager.player1)) {
                fov1.addAll(getUnitFov(unit.getHex().getKey()));
            }
            if(unit.getPlayer().equals(unitManager.player2)) {
                fov2.addAll(getUnitFov(unit.getHex().getKey()));
            }
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

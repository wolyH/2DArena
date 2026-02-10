package com.wolyh.game.backend.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PathManager {
    private final MapManager mapManager;
    private final UnitManager unitManager;
    private final FovManager fovManager;

    public PathManager(
        MapManager mapManager,
        UnitManager unitManager,
        FovManager fovManager
    ) {
        this.mapManager = mapManager;
        this.unitManager = unitManager;
        this.fovManager = fovManager;
    }

    public List<HexCoordinates> searchPath(HexCoordinates goalCoords, String username) {
        if(!username.equals(unitManager.player1) && !username.equals(unitManager.player2)) {
             throw new IllegalArgumentException(
                "username must be the username of a player present in the room"
            );
        }

        ArrayList<HexCoordinates> path = new ArrayList<>();

        Hex start = unitManager.getActiveUnitHex();
        Hex goal = mapManager.getHex(Hex.key(goalCoords.q(), goalCoords.r()));

        if(start == null || goal == null || start.getKey().equals(goal.getKey())) {
            return path;
        }

        ArrayList<Hex> frontier = new ArrayList<>();
        Map<String, String> cameFrom = new HashMap<>();

        frontier.add(start);
        cameFrom.put(start.getKey(), "");

        int startIdx = 0;

        while(startIdx < frontier.size()) {
            Hex current = frontier.get(startIdx);
            startIdx++;

            SearchNeighborsResult result = searchNeighbors(current, goal, username);
            if (result.earlyExit()) {
                cameFrom.put(goal.getKey(), current.getKey());
                break;
            }

            for (Hex next: result.neighbors()) {
                if(!cameFrom.containsKey(next.getKey())) {
                    frontier.add(next);
                    cameFrom.put(next.getKey(), current.getKey());
                }
            }
        }

        Hex current = goal;

        while(!(current.getKey().equals(start.getKey()))) {
            String previousHash = cameFrom.get(current.getKey());
            if (previousHash == null) {
                return new ArrayList<>();
            }
            Hex previous = mapManager.getHex(previousHash);
            if (previous == null) {
                return new ArrayList<>();
            }
            path.add(new HexCoordinates(current.getQ(), current.getR()));
            current = previous;
        }

        path.add(new HexCoordinates(start.getQ(), start.getR()));
        Collections.reverse(path);

        return path;
    }

    public List<HexCoordinates> calculateEnemyPovPath(List<HexCoordinates> path, String enemy) {
        ArrayList<HexCoordinates> enemyPovPath = new ArrayList<>();

        boolean prevVisible = false;
        for (int i = 0 ; i < path.size() ; i++) {
            boolean currVisible = fovManager.isVisible(path.get(i), enemy);

            if (currVisible && !prevVisible && i > 0) {
                enemyPovPath.add(path.get(i - 1));
            }
            if (currVisible) {
                enemyPovPath.add(path.get(i));
            }
        
            if (!currVisible && prevVisible) {
                enemyPovPath.add(path.get(i));
            }
            
            prevVisible = currVisible;
        }   
        return enemyPovPath;
    }

    private record SearchNeighborsResult(List<Hex> neighbors, boolean earlyExit) {}

    private SearchNeighborsResult searchNeighbors(Hex h, Hex goal, String username) {
        ArrayList<Hex> neighbors = new ArrayList<>(6);
        int[][] directionVectors = {
            {+1,  0, -1},
            {+1, -1,  0},
            { 0, -1, +1},
            {-1,  0, +1},
            {-1, +1,  0},
            { 0, +1, -1}
        };

        for (int[] vector : directionVectors) {
            Hex neighbor = mapManager.getHex(Hex.key(h.getQ() + vector[0], h.getR() + vector[1]));
            if(neighbor != null && neighbor.isTraversable() && fovManager.isVisible(neighbor, username)) {
                neighbors.add(neighbor);
                if(goal.getKey().equals(neighbor.getKey())) {
                    return new SearchNeighborsResult(neighbors, true);
                }
            }
        }

        return new SearchNeighborsResult(neighbors, false);
    }
}

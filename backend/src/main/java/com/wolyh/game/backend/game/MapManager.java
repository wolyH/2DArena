package com.wolyh.game.backend.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Consumer;

import com.wolyh.game.backend.model.Hex;

public class MapManager {
    private HashMap<String, Hex> map = new HashMap<>();
    private final Random random = new Random();

    final int n = 4;
    private int shrinkLevel = n;

    public MapManager() {
        fill();
    }

    public int getShrinkLevel() {
        return this.shrinkLevel;
    }

    public Hex getHex(String key) {
        return map.get(key);
    }

    public boolean hasHex(String key) {
        return map.containsKey(key);
    }

    public void forEachHex(Consumer<Hex> action) {
        map.values().forEach(action);
    }   
    private void fill() {
        //hexagonal shape
        for (int q = -n; q <= n; q++) {
            int r1 = Math.max(-n, -q - n);
            int r2 = Math.min(n, -q + n);
            
            for(int r = r1 ; r <= r2 ; r++) {
                Hex hex = new Hex(q, r, -q-r, false);
                map.put(hex.getKey(), hex);
            }
        }

        map.remove(Hex.key(-n,0));
        map.remove(Hex.key(n,0));
        map.remove(Hex.key(0,0));
    }

    public List<Hex> generateSpawns(int minDist) {
        List<Hex> placed = new ArrayList<>();
        List<Hex> active = new ArrayList<>();
        Map<String, Hex> validMap = new HashMap<>(map);
        List<Hex> validHexes = new ArrayList<>(validMap.values());
        Hex start = validHexes.get(random.nextInt(validHexes.size()));

        placed.add(start);
        active.add(start);

        while (!active.isEmpty()) {
            Hex hex = active.get(random.nextInt(active.size()));
            List<Hex> candidates = getHexesInRange(hex, validMap, minDist, minDist * 2);
            Collections.shuffle(candidates);

            boolean found = false;
            for (Hex candidate: candidates) {
                if (isFarEnough(candidate, placed, minDist)) {
                    placed.add(candidate);
                    active.add(candidate);
                    found = true;
                    break;
                }
            }

            if(!found) {
                active.remove(hex);
            }
        }

        return placed;
    }

    private boolean isFarEnough(Hex candidate, List<Hex> placed, int minDist) {
        for (Hex p : placed)
            if (candidate.distance(p) < minDist) return false;
        return true;
    }

    public  List<Hex> getHexesInRange(Hex origin, int range) {
        return getHexesInRange(origin, map, 0, range);
    }

    public List<Hex> getHexesInRange(
        Hex origin, 
        Map<String, Hex> validHexes, 
        int minDist, 
        int maxDist
    ) {
        List<Hex> candidates = new ArrayList<>();

        for (int q = -maxDist; q <= +maxDist ; q++) {
            for (int r = Math.max(-maxDist, -q-maxDist) ; r <= Math.min(+maxDist, -q+maxDist) ; r++) {
                int dist = Math.max(Math.abs(q), Math.max(Math.abs(r), Math.abs(-q-r)));
                if (dist >= minDist) {
                    Hex candidate = map.get(Hex.key(origin.getQ() + q, origin.getR() + r));
                    if (candidate != null) {
                        candidates.add(candidate);
                    }
                }
            }
        }

        return candidates;
    }

    public int shrink() {
        shrinkLevel--;
        int range = shrinkLevel;
        HashMap<String, Hex> newMap = new HashMap<>();

        for (int q = -range; q <= +range ; q++) {
            for (int r = Math.max(-range, -q-range) ; r <= Math.min(+range, -q+range) ; r++) {
                Hex hex = map.get(Hex.key(q, r));
                if (hex != null) {
                    newMap.put(hex.getKey(), hex);
                }
            }
        }
        this.map = newMap;
        return shrinkLevel;
    }
}

package com.wolyh.game.backend.game;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import com.wolyh.game.backend.model.Hex;

public class MapManager {
    private HashMap<String, Hex> map = new HashMap<>();
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

    public Map<String, Hex> getMap() {
        return Collections.unmodifiableMap(map);
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

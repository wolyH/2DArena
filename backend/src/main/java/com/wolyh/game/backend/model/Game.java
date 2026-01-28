package com.wolyh.game.backend.model;

import java.util.HashMap;

public class Game {
    private String player1;
    private String player2;
    private static final int NB_PLAYER_PER_TEAM = 1;
    private Unit[] units;

    private final int n = 4;
    private HashMap<String, Hex> map;

    public Game(String player1, String player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.map = new HashMap<>();
        this.units = new Unit[2 * NB_PLAYER_PER_TEAM];
        fillMap();
        spawnUnits();
    }

    private void fillMap() {
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

    private void spawnUnits() {
        Hex hex1 = map.get(Hex.key(-(n-1), 0));
        Hex hex2 = map.get(Hex.key(n-1, 0));

        Unit unit1 = new Unit(hex1, player1);
        Unit unit2 = new Unit(hex2, player2);

        units[0] = unit1;
        units[1] = unit2;

    }
}

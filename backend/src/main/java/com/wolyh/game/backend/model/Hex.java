package com.wolyh.game.backend.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Hex {
    
    private boolean isVisible = false;
    private final boolean isObstacle;
    private int q;
    private int r;
    private int s;
    private final String key;

    private Unit unit;

    Hex(int q, int r, int s, boolean isObstacle) {
        if (Math.round(q + r + s) != 0) {
            throw new IllegalArgumentException("q + r + s must be 0");
        }
        this.q = q;
        this.r = r;
        this.s = s;
        this.key = q + "_" + r;

        this.isObstacle = isObstacle;
    }

    public int distance(Hex other) {
         return Math.max(
            Math.max(
                Math.abs(this.q - other.q),
                Math.abs(this.r - other.r)
            ),
            Math.abs(this.s - other.s)
        );  
    }

    public boolean isNeighbor(Hex other) {
        return this.distance(other) == 1;
    }

    public static String key(int q, int r) {
        return q + "_" + r;
    }
  
}

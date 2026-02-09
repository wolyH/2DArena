package com.wolyh.game.backend.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Unit {
    
    private Hex hex;
    public static final int VISIBILITY_RANGE = 1;
    private final String player;
    private boolean isDead = false;
    public final int idx;

    Unit(Hex hex, String player, int idx) {
        if(hex.getUnit() != null && !hex.getUnit().isDead() ) {
            throw new IllegalArgumentException("cannot spawn a unit on an occupied hex");
        }
        this.idx = idx;
        this.hex = hex;
        this.player = player;
        hex.setUnit(this);
    }

}

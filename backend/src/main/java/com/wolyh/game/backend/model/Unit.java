package com.wolyh.game.backend.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Unit {
    
    private Hex hex;
    public static final int VISIBILITY_RANGE = 2;
    private final String player;
    private boolean isDead = false;

    Unit(Hex hex, String player) {
        if(hex.getUnit() != null && !hex.getUnit().isDead() ) {
            throw new IllegalArgumentException("cannot spawn a unit on an occupied hex");
        }
        this.hex = hex;
        this.player = player;
        hex.setUnit(this);
    }

}

package com.wolyh.game.backend.game;

public class TurnManager {
    private int turn = 1;
    
    public void incrementTurn() {
        turn++;
    }
    
    public boolean shouldShrinkMap() {
        return turn % 15 == 0 && turn > 1;
    }
    
    public int getTurn() {
        return turn;
    }
}

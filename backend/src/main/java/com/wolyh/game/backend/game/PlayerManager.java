package com.wolyh.game.backend.game;

public class PlayerManager {
    private final String player1;
    private final String player2;

    public PlayerManager(String player1, String player2) {
        this.player1 = player1;
        this.player2 = player2;
    }

    public String getOtherPlayer(String username) {
        return username.equals(player1) ? player2 : player1;
    }
    
    public boolean isValidPlayer(String username) {
        return username.equals(player1) || username.equals(player2);
    }

    public String getPlayer1() {
        return player1;
    }

    public String getPlayer2() {
        return player2;
    }
}

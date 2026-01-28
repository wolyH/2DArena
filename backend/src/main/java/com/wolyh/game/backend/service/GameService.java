package com.wolyh.game.backend.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.wolyh.game.backend.model.Game;

@Service
public class GameService {
    private final Map<String, Game> games = new ConcurrentHashMap<>();

    public void addGame(String roomId, String player1, String player2) {
        if (games.containsKey(roomId)) {
            return;
        }
        games.put(roomId, new Game(player1, player2));
    }
}

package com.wolyh.game.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
 
import org.springframework.stereotype.Service;

import com.wolyh.game.backend.dto.UnitActionRequest;
import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.AllyUnitMove;
import com.wolyh.game.backend.dto.Notification.EnemyUnitMove;
import com.wolyh.game.backend.dto.Notification.GameEvent;
import com.wolyh.game.backend.dto.Notification.GameOver;
import com.wolyh.game.backend.dto.Notification.MapShrink;
import com.wolyh.game.backend.dto.Notification.TurnChange;
import com.wolyh.game.backend.dto.Notification.UnitAttack;
import com.wolyh.game.backend.game.GameContext;
import com.wolyh.game.backend.game.Result.AddGameResult;
import com.wolyh.game.backend.game.Result.ForfeitResult;
import com.wolyh.game.backend.game.Result.ShrinkMapResult;
import com.wolyh.game.backend.game.Result.SkipTurnResult;
import com.wolyh.game.backend.game.Result.UnitActionResult;
import com.wolyh.game.backend.dto.Notification.Type;
import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.UnitCoordinates;

@Service
public class GameService {

    private final Map<String, GameContext> games = new ConcurrentHashMap<>();
    private final Map<String, Lock> gameLocks = new ConcurrentHashMap<>();

    public AddGameResult addGame(String roomId, String player1, String player2) {
        games.computeIfAbsent(roomId, id -> {
            gameLocks.put(id, new ReentrantLock());
            return new GameContext(player1, player2);
        });

        GameContext game = games.get(roomId);
    
        return new AddGameResult(
            game.getFov(player1),
            game.getFov(player2)
        );
    }

    public void deleteGame(String roomId) {
        Lock lock = gameLocks.get(roomId);
        if(lock == null) {
            return;
        }
        lock.lock();

        try {
            games.remove(roomId);
        }finally {
            lock.unlock();
            gameLocks.remove(roomId);
        }
    }

    public ForfeitResult forfeitGame(String roomId, String username) {
        Lock lock = gameLocks.get(roomId);
        if(lock == null) {
            return null;
        }

        lock.lock();

        try {
            GameContext game = games.get(roomId);

            if (game.isGameOver()) {
                return null;
            }

            String winner = game.getOtherPlayer(username);
            game.setGameOver();

            return new ForfeitResult(
                username, 
                winner, 
                new Notification<GameEvent>(
                    Type.GAME_OVER, 
                    new GameOver(winner, roomId)
                )
            );

        }finally {
            lock.unlock();
        }
    }

    public SkipTurnResult processSkipTurn(String roomId, String username) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            return null;
        }

        lock.lock();

        try {
            GameContext game = games.get(roomId);

            if (game.isGameOver()) { 
                return null;  
            }

            if (!game.isPlayerActive(username)) {
                return null;
            }

            String activePlayer = game.getActivePlayer();
            String otherPlayer = game.getOtherPlayer(activePlayer);

            Map<String, List<Notification<GameEvent>>> notifications = new HashMap<>();
            notifications.put(activePlayer, new ArrayList<>());
            notifications.put(otherPlayer, new ArrayList<>());

            boolean isGameOver = endTurn(game, roomId, notifications);

            return new SkipTurnResult(isGameOver, notifications);

        }finally {
            lock.unlock();
        }
    }

    public UnitActionResult processUnitAction(
        String roomId, 
        String username, 
        UnitActionRequest action
    ) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            System.err.println("Game lock is null");
            return null;
        }
        lock.lock();

        try {
            GameContext game = games.get(roomId);

            if (game.isGameOver()) { 
                return null;  
            }

            if (!game.isPlayerActive(username)) {
                System.err.println("the player is not active");
                return null;
            }

            switch (action.type()) {
                case "UNIT_MOVE":
                    return handleMove(game, roomId, action.unitIdx(), action.goal());
                case "UNIT_ATTACK":
                    return handleAttack(game, roomId, action.unitIdx(), action.goal());
                default:
                    System.err.println("Game action should be either attack or move");
                    return null;
            }
        } finally {
            lock.unlock();
        }
    }

    public UnitActionResult handleMove(
        GameContext game, 
        String roomId,
        int unitIdx, 
        HexCoordinates goalCoords
    ){
        if (!game.canUnitMoveOnHex(unitIdx, goalCoords)) {
            System.err.println("Unit cannot move on hex");
            return null;
        }

        String activePlayer = game.getActivePlayer();
        String otherPlayer = game.getOtherPlayer(activePlayer);

        Map<String, List<Notification<GameEvent>>> notifications = new HashMap<>();
        notifications.put(activePlayer, new ArrayList<>());
        notifications.put(otherPlayer, new ArrayList<>());

        List<HexCoordinates> path = game.searchPath(goalCoords, unitIdx, activePlayer);
        if (path.isEmpty()) {
            return null;
        }

        List<HexCoordinates> pathWithoutStart = path.subList(1, path.size());
        List<Set<String>> pathFov = game.getPathFov(pathWithoutStart, activePlayer);
        List<List<UnitCoordinates>> visibleUnitsAlongPath = game.getVisibleUnitsAlongPath(pathFov);
        List<HexCoordinates> otherPlayerViewOfPath = game.calculateEnemyPovPath(path, otherPlayer);
        
        game.moveUnit(unitIdx, goalCoords);

        notifications.get(activePlayer).add(new Notification<GameEvent>(Type.ALLY_MOVE, 
                new AllyUnitMove(unitIdx, pathWithoutStart, pathFov, visibleUnitsAlongPath, roomId)
        ));

        notifications.get(otherPlayer).add(new Notification<GameEvent>(Type.ENEMY_MOVE, 
                new EnemyUnitMove(unitIdx, otherPlayerViewOfPath, roomId)
        ));

        boolean isGameOver = endTurn(game, roomId, notifications);

        return new UnitActionResult(isGameOver, notifications);
    }

    public UnitActionResult handleAttack(
        GameContext game, 
        String roomId, 
        int attackerIdx, 
        HexCoordinates targetCoords
    ) {
        if (!game.canUnitAttackOnHex(attackerIdx, targetCoords)) {
            System.err.println("Unit cannot attack on hex");
            return null;
        }

        String activePlayer = game.getActivePlayer();
        String otherPlayer = game.getOtherPlayer(activePlayer);

        Map<String, List<Notification<GameEvent>>> notifications = new HashMap<>();
        notifications.put(activePlayer, new ArrayList<>());
        notifications.put(otherPlayer, new ArrayList<>());

        Map<String, Set<String>> playerFovs = game.killUnitOn(targetCoords);

        notifications.forEach((playerUsername, playerNotifs) -> playerNotifs.add(
            new Notification<GameEvent>(Type.UNIT_ATTACK, new UnitAttack(
                attackerIdx,
                targetCoords,
                playerFovs.get(playerUsername),
                roomId
            ))
        ));

        boolean isGameOver = endTurn(game, roomId, notifications);

        return new UnitActionResult(isGameOver, notifications);
    }

    private boolean endTurn(
        GameContext game, 
        String roomId, 
        Map<String, List<Notification<GameEvent>>> notifications
    ) {
        String winner = game.resolveGameOver();

        if(game.isGameOver()) {
            notifications.values().forEach(playerNotifs -> playerNotifs.add(
                new Notification<GameEvent>(Type.GAME_OVER, new GameOver(winner, roomId))
            ));
            return true;
        }

        int nextIdx = game.nextTurn();

        notifications.values().forEach(playerNotifs -> playerNotifs.add(
            new Notification<GameEvent>(Type.TURN_CHANGE, new TurnChange(nextIdx, roomId))
        ));

        ShrinkMapResult shrink = game.shrinkMapIfNeeded();

        if(!shrink.occurred()) {
            return false;
        }

        notifications.forEach((playerUsername, playerNotifs) -> playerNotifs.add(
            new Notification<GameEvent>(Type.MAP_SHRINK, new MapShrink(
                shrink.shrinkLevel(),
                shrink.deadUnits(),
                shrink.playerFovs().get(playerUsername),
                roomId
            ))
        ));
        
        String winnerAfterShrink = game.resolveGameOver();
        if(game.isGameOver()) {
            notifications.values().forEach(playerNotifs -> playerNotifs.add(
                new Notification<GameEvent>(Type.GAME_OVER, new GameOver(winnerAfterShrink, roomId))
            ));
            return true;
        }

        return false;
    }
}

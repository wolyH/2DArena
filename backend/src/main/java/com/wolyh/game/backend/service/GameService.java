package com.wolyh.game.backend.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
 
import org.springframework.stereotype.Service;

import com.wolyh.game.backend.dto.UnitActionRequest;
import com.wolyh.game.backend.dto.Notification;
import com.wolyh.game.backend.dto.Notification.GameOver;
import com.wolyh.game.backend.dto.Notification.MapShrink;
import com.wolyh.game.backend.dto.Notification.TurnChange;
import com.wolyh.game.backend.dto.Notification.UnitAction;
import com.wolyh.game.backend.dto.Notification.UnitAttack;
import com.wolyh.game.backend.dto.Notification.UnitMove;
import com.wolyh.game.backend.dto.Notification.Type;
import com.wolyh.game.backend.model.FovManager;
import com.wolyh.game.backend.model.Game;
import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.MapManager;
import com.wolyh.game.backend.model.PathManager;
import com.wolyh.game.backend.model.UnitManager;
import com.wolyh.game.backend.model.Game.AttackResult;
import com.wolyh.game.backend.model.Game.EndTurnResult;

@Service
public class GameService {

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final Map<String, Lock> gameLocks = new ConcurrentHashMap<>();

    public static record SkipTurnResult(
        Notification<TurnChange> turnChangeNotif,
        Notification<MapShrink> mapShrinkNotif,
        Notification<GameOver> gameOverNotif
    ) {}

    public static record UnitActionResult(
        Notification<UnitAction> unitActionNotif,
        Notification<TurnChange> turnChangeNotif,
        Notification<MapShrink> mapShrinkNotif,
        Notification<GameOver> gameOverNotif
    ) {}

    public void addGame(String roomId, String player1, String player2) {
        games.computeIfAbsent(roomId, id -> {
            gameLocks.put(id, new ReentrantLock());
            MapManager mapManager = new MapManager();
            UnitManager unitManager = new UnitManager(mapManager, player1, player2);
            FovManager fovManager = new FovManager(unitManager, mapManager);
            PathManager pathManager = new PathManager(mapManager, unitManager, fovManager);
            return new Game(
                mapManager, 
                unitManager, 
                fovManager, 
                pathManager, 
                player1, 
                player2
            );
        });
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

    public Boolean isGameOver(String roomId) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            return null;
        }
        lock.lock();
        try {
            Game game = games.get(roomId);
            if(game == null) {
                return null;
            }
            return game.isGameOver();
        }finally {
            lock.unlock();
        }
    }

    public Set<String> getGameFov(String roomId) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            return null;
        }
        lock.lock();
        try {
            Game game = games.get(roomId);
            if(game == null) {
                return null;
            }
            return game.getFov();
        }finally {
            lock.unlock();
        }
    }

    public SkipTurnResult processSkipTurn(String roomId, String username, int unitIdx) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            return null;
        }
        lock.lock();

        try {
            Game game = games.get(roomId);
            if (!game.getActivePlayer().equals(username)) {
                return null;
            }
            EndTurnResult result = game.skipTurn(unitIdx);
            return createSkipTurnResult(result, game, roomId);
        }finally {
            lock.unlock();
        }
    }

    public UnitActionResult processUnitAction(String roomId, String username, UnitActionRequest action) {
        Lock lock = gameLocks.get(roomId);
        if (lock == null) {
            return null;
        }
        lock.lock();

        try {
            Game game = games.get(roomId);
            if (!game.getActivePlayer().equals(username)) {
                return null;
            }
            switch (action.type()) {
                case "UNIT_MOVE":
                    return handleUnitMove(game, roomId, action);
                case "UNIT_ATTACK":
                    return handleUnitAttack(game, roomId, action);
                default:
                    return null;
            }
        } finally {
            lock.unlock();
        }
    }

    private UnitActionResult handleUnitMove(Game game, String roomId, UnitActionRequest action) {
        if (!game.canUnitMoveOnHex(action.unitIdx(), action.goal())) {
            return null;
        }

        List<HexCoordinates> path = game.searchPath(action.goal());
        if (path.size() == 0) {
            return null;
        }

        List<Set<String>> pathFov = game.getPathFov(path);

        EndTurnResult result = game.moveUnit(action.unitIdx(), action.goal());
        UnitMove unitMoveData = new UnitMove(action.unitIdx(), path, pathFov, roomId);

        return createActionResult(result, unitMoveData, game, roomId, Type.UNIT_MOVE);  
    }

    private UnitActionResult handleUnitAttack(Game game, String roomId, UnitActionRequest action) {
        if (!game.canUnitAttackOnHex(action.unitIdx(), action.goal())) {
            return null;
        }

        AttackResult result = game.attack(action.goal());
        UnitAttack unitAttackData = new UnitAttack(action.unitIdx(), action.goal(), result.fov(), roomId);
        
        return createActionResult(result.endTurnResult(), unitAttackData, game, roomId, Type.UNIT_ATTACK);
    }

    private UnitActionResult createActionResult(EndTurnResult result, UnitAction actionData, Game game, String roomId, Type action) {
        return new UnitActionResult(
            new Notification<>(action, actionData),
            createTurnChangeNotification(result, game, roomId),
            createMapShrinkNotification(result, game, roomId),
            createGameOverNotification(result, roomId)
        );
    }

    private SkipTurnResult createSkipTurnResult(EndTurnResult result, Game game, String roomId) {
        return new SkipTurnResult(
            createTurnChangeNotification(result, game, roomId),
            createMapShrinkNotification(result, game, roomId),
            createGameOverNotification(result, roomId)
        );
    }

    private Notification<TurnChange> createTurnChangeNotification(EndTurnResult result, Game game, String roomId) {
        if (!result.turnChanged()) {
            return null;
        }
        return new Notification<>(
            Type.TURN_CHANGE, 
            new TurnChange(game.getUnitIdx(), roomId)
        );
    }

    private Notification<MapShrink> createMapShrinkNotification(EndTurnResult result, Game game, String roomId) {
        if (!result.mapShrinked()) {
            return null;
        }
        return new Notification<>(
            Type.MAP_SHRINK, 
            new MapShrink(
                game.getShrinkLevel(), 
                result.deadUnits(), 
                result.fov(), 
                roomId
            )
        );
    }

    private Notification<GameOver> createGameOverNotification(EndTurnResult result, String roomId) {
        if (!result.gameOver()) {
            return null;
        }
        return new Notification<>(
            Type.GAME_OVER, 
            new GameOver(result.winner(), roomId)
        );
    }
}

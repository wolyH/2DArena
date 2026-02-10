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
import com.wolyh.game.backend.dto.Notification.AllyUnitMove;
import com.wolyh.game.backend.dto.Notification.EnemyUnitMove;
import com.wolyh.game.backend.dto.Notification.GameOver;
import com.wolyh.game.backend.dto.Notification.MapShrink;
import com.wolyh.game.backend.dto.Notification.TurnChange;
import com.wolyh.game.backend.dto.Notification.UnitAttack;
import com.wolyh.game.backend.dto.Notification.Type;
import com.wolyh.game.backend.model.FovManager;
import com.wolyh.game.backend.model.Game;
import com.wolyh.game.backend.model.HexCoordinates;
import com.wolyh.game.backend.model.MapManager;
import com.wolyh.game.backend.model.PathManager;
import com.wolyh.game.backend.model.UnitCoordinates;
import com.wolyh.game.backend.model.UnitManager;
import com.wolyh.game.backend.model.Game.AttackResult;
import com.wolyh.game.backend.model.Game.EndTurnResult;

@Service
public class GameService {

    private final Map<String, Game> games = new ConcurrentHashMap<>();
    private final Map<String, Lock> gameLocks = new ConcurrentHashMap<>();

    public static record SkipTurnResult(
        String activePlayer,
        String inactivePlayer,
        Notification<TurnChange> turnChangeNotif,
        Notification<MapShrink> mapShrinkNotifActive,
        Notification<MapShrink> mapShrinkNotifIncative,
        Notification<GameOver> gameOverNotif
    ) {}

    public interface UnitActionResult {}

    public static record UnitMoveResult(
        String activePlayer,
        String inactivePlayer,
        Notification<AllyUnitMove> unitMoveNotifActive,
        Notification<EnemyUnitMove> unitMoveNotifInactive,
        Notification<TurnChange> turnChangeNotif,
        Notification<MapShrink> mapShrinkNotifActive,
        Notification<MapShrink> mapShrinkNotifInactive,
        Notification<GameOver> gameOverNotif
    ) implements UnitActionResult {}

    public static record UnitAttackResult(
        String activePlayer,
        String inactivePlayer,
        Notification<UnitAttack> unitAttackNotifActive,
        Notification<UnitAttack> unitAttackNotifInactive,
        Notification<TurnChange> turnChangeNotif,
        Notification<MapShrink> mapShrinkNotifActive,
        Notification<MapShrink> mapShrinkNotifInactive,
        Notification<GameOver> gameOverNotif
    ) implements UnitActionResult {}

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

    public Set<String> getGameFov(String roomId, String username) {
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
            return game.getFov(username);
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
            System.err.println("Game lock is null");
            return null;
        }
        lock.lock();

        try {
            Game game = games.get(roomId);
            if (!game.getActivePlayer().equals(username)) {
                System.err.println("the player is not active");
                return null;
            }
            switch (action.type()) {
                case "UNIT_MOVE":
                    return handleUnitMove(game, roomId, action);
                case "UNIT_ATTACK":
                    return handleUnitAttack(game, roomId, action);
                default:
                    System.err.println("Game action should be either attack or move");
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

        String activePlayer = game.getActivePlayer();
        String inactivePlayer = game.getInactivePlayer();

        List<Set<String>> pathFov = game.getPathFov(path.subList(1, path.size()), activePlayer);
        
        List<List<UnitCoordinates>> visibleUnitsAlongPath = game.getVisibleUnitsAlongPath(pathFov);
        List<HexCoordinates> enemyPath = game.calculateEnemyPovPath(path, inactivePlayer);
        
        EndTurnResult result = game.moveUnit(action.unitIdx(), action.goal());
        

        AllyUnitMove allyMoveData = new AllyUnitMove(action.unitIdx(), path, pathFov, visibleUnitsAlongPath, roomId);
        EnemyUnitMove enemyMoveData = new EnemyUnitMove(action.unitIdx(), enemyPath, roomId);

        return new UnitMoveResult(
            activePlayer,
            inactivePlayer,
            new Notification<>(Type.ALLY_MOVE, allyMoveData),
            new Notification<>(Type.ENEMY_MOVE, enemyMoveData),
            createTurnChangeNotification(result, game, roomId),
            createMapShrinkNotification(result, result.fovActive(), game, roomId),
            createMapShrinkNotification(result, result.fovIncative(), game, roomId),
            createGameOverNotification(result, roomId)
        );
    }

    private UnitActionResult handleUnitAttack(Game game, String roomId, UnitActionRequest action) {
        if (!game.canUnitAttackOnHex(action.unitIdx(), action.goal())) {
            System.err.println("Unit cant attack on hex");
            return null;
        }

        String activePlayer = game.getActivePlayer();
        String inactivePlayer = game.getInactivePlayer();
        AttackResult result = game.attack(action.goal());
        UnitAttack unitAttackData1 = new UnitAttack(action.unitIdx(), action.goal(), result.fov1(), roomId);
        UnitAttack unitAttackData2 = new UnitAttack(action.unitIdx(), action.goal(), result.fov2(), roomId);
        EndTurnResult endTurnResult = result.endTurnResult();

        return new UnitAttackResult(
            activePlayer,
            inactivePlayer,
            new Notification<>(Type.UNIT_ATTACK, unitAttackData1),
            new Notification<>(Type.UNIT_ATTACK, unitAttackData2),
            createTurnChangeNotification(result.endTurnResult(), game, roomId),
            createMapShrinkNotification(endTurnResult, endTurnResult.fovActive(), game, roomId),
            createMapShrinkNotification(endTurnResult, endTurnResult.fovIncative(), game, roomId),
            createGameOverNotification(result.endTurnResult(), roomId)
        );
    }

    private SkipTurnResult createSkipTurnResult(EndTurnResult result, Game game, String roomId) {
        String activePlayer = game.getActivePlayer();
        String inactivePlayer = game.getInactivePlayer();
        return new SkipTurnResult(
            activePlayer,
            inactivePlayer,
            createTurnChangeNotification(result, game, roomId),
            createMapShrinkNotification(result, result.fovActive(), game, roomId),
            createMapShrinkNotification(result, result.fovIncative(), game, roomId),
            createGameOverNotification(result, roomId)
        );
    }

    private Notification<TurnChange> createTurnChangeNotification(EndTurnResult result, Game game, String roomId) {
        if (!result.turnChanged()) {
            return null;
        }
        return new Notification<>(
            Type.TURN_CHANGE, 
            new TurnChange(result.nextUnitIdx(), roomId)
        );
    }

    private Notification<MapShrink> createMapShrinkNotification(EndTurnResult result, Set<String> fov, Game game, String roomId) {
        if (!result.mapShrinked()) {
            return null;
        }
        return new Notification<>(
            Type.MAP_SHRINK, 
            new MapShrink(
                game.getShrinkLevel(), 
                result.deadUnits(), 
                fov, 
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

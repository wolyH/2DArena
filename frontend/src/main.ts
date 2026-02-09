import './style.css';
import { Game} from './Game.ts';
import { Layout } from './Layout.ts';
import { AssetManager } from './utils.ts';
import { MapManager } from './MapManager.ts';
import { createEventBus } from './utils.ts';
import { GameInputHandler } from './input/GameInputHandler.ts';
import { MenuInputHandler } from './input/MenuInputHandler.ts';
import { UiManager } from './ui/UiManager.ts';
import { NetworkManager } from './NetworkManager.ts';
import { CameraManager } from './CameraManager.ts';
import { FovManager } from './FovManager.ts';
import { RoomState } from './RoomState.ts';
import { UnitManager } from './unit/UnitManager.ts';
import { GameActionEventHandler } from './event/handler/GameActionEventHandler.ts';
import { InputEventHandler } from './event/handler/InputEventHandler.ts';
import { MenuEventHandler } from './event/handler/MenuEventHandler.ts';
import { NotificationEventHandler } from './event/handler/NotificationEventHandler.ts';
import type { AllEvents } from './event/events.ts';
import { PathPreviewManager } from './PathPreviewManager.ts';
import { GameScreenEventHandler } from './event/handler/GameScreenEventHandler.ts';
import { Renderer } from './rendering/Renderer.ts';
import { GameRenderer } from './rendering/GameRenderer.ts';
import { UnitFactory } from './unit/UnitFactory.ts';
import { MovementManager } from './MovementManager.ts';
import { NotificationManager } from './NotificationManager.ts';

const assetManager = new AssetManager();

const urls: Array<[string, string, number]> = [
  ["black_idle", "./black/idle", 8],
  ["black_moving", "./black/moving", 6],
  ["black_striking", "./black/striking", 4],
  ["dust", "./dust", 4],
];

await assetManager.loadSprites(urls);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = 
  `<canvas id="game-canvas"></canvas>
   <canvas id="ui-canvas"></canvas>`;

const width = window.innerWidth;
const height = window.innerHeight;

//Divide hex horizontal size by 2 to give an isometric look
const n = 4;

const origin = {x: width / 2, y: height / 2};

const layout = new Layout(origin, {x: 100, y: 50}, n);

const eventBus = createEventBus<AllEvents>();

const mapManager = new MapManager(n);

const fovManager = new FovManager(eventBus);

const renderer = new Renderer(
    mapManager, 
    layout,
    fovManager
);

const uiManager = new UiManager(eventBus);

const unitFactory = new UnitFactory(assetManager);

const networkManager = new NetworkManager(eventBus);

const roomState = new RoomState();

const pathPreviewManager = new PathPreviewManager(
    mapManager, 
    fovManager
);

const movementManager = new MovementManager()

const unitManager = new UnitManager(
    mapManager,
    layout,
    unitFactory,
    fovManager,
    roomState
);

const gameRenderer = new GameRenderer(
    renderer, 
    uiManager, 
    unitManager, 
    pathPreviewManager, 
    roomState
);

const gameInputHandler = new GameInputHandler(
    mapManager,
    fovManager,
    gameRenderer, 
    layout, 
    uiManager, 
    eventBus
);
const menuInputHandler = new MenuInputHandler(
    gameRenderer, 
    uiManager, 
    eventBus
);

const cameraManager = new CameraManager(
    gameRenderer, 
    layout
);

const notificationManager = new NotificationManager(
    eventBus,
    roomState
)

const gameActionEventHandler = new GameActionEventHandler(
    eventBus, 
    uiManager, 
    networkManager, 
    mapManager, 
    gameInputHandler, 
    menuInputHandler, 
    unitManager, 
    pathPreviewManager,
    movementManager,
    fovManager,
    roomState
);

const gameScreenEventHandler = new GameScreenEventHandler(
    eventBus,
    gameRenderer
)

const inputEventHandler = new InputEventHandler(
    eventBus, 
    uiManager, 
    layout, 
    gameInputHandler, 
    unitManager,
    cameraManager,
    pathPreviewManager,
    fovManager,
    roomState
);

const menuEventHandler = new MenuEventHandler(
    eventBus, 
    uiManager, 
    mapManager, 
    networkManager, 
    gameInputHandler, 
    menuInputHandler, 
    fovManager,
    unitManager, 
    roomState
);

const notificationEventHandler = new NotificationEventHandler(
    eventBus, 
    uiManager,
    notificationManager,
    roomState
);

const game = new Game(
  gameActionEventHandler,
  gameScreenEventHandler,
  inputEventHandler,
  menuEventHandler,
  notificationEventHandler,
  menuInputHandler,
  gameRenderer,
  uiManager,
  cameraManager,
  unitManager,
  movementManager,
  layout,
  mapManager,
  notificationManager,
  fovManager
);

game.start();
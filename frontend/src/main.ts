import './style.css';
import { Game} from './Game.ts';
import { LayoutManager } from './LayoutManager.ts';
import { MapManager } from './MapManager.ts';
import { GameInputHandler } from './input/GameInputHandler.ts';
import { MenuInputHandler } from './input/MenuInputHandler.ts';
import { NetworkManager } from './NetworkManager.ts';
import { CameraManager } from './CameraManager.ts';
import { FovManager } from './FovManager.ts';
import { RoomState } from './RoomState.ts';
import { UnitManager } from './UnitManager.ts';
import { GameActionEventHandler } from './event/handler/GameActionEventHandler.ts';
import { InputEventHandler } from './event/handler/InputEventHandler.ts';
import { HttpEventHandler } from './event/handler/HttpEventHandler.ts';
import { NotificationEventHandler } from './event/handler/NotificationEventHandler.ts';
import type { AllEvents } from './event/events.ts';
import { PathPreviewManager } from './PathPreviewManager.ts';
import { RenderingEventHandler } from './event/handler/RenderingEventHandler.ts';
import { Renderer } from './rendering/Renderer.ts';
import { GameRenderer } from './rendering/GameRenderer.ts';
import { UnitFactory } from './utils/UnitFactory.ts';
import { NotificationManager } from './NotificationManager.ts';
import { MovementManager } from './MovementManager.ts';
import { AssetManager } from './utils/AssetManager.ts';
import { createEventBus } from './utils/EvenBus.ts';
import { UiManager } from './UiManager.ts';
import { MovementState } from './MovementState.ts';
import { ActionValidator } from './ActionValidator.ts';

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

const n = 4;

const origin = {x: width / 2, y: height / 2};

const hexWidth = Math.min(width, height);

//Here we divide hex vertical size by 2 to give an isometric look
const layoutManager = new LayoutManager(origin, hexWidth/13, n);

const eventBus = createEventBus<AllEvents>();

const mapManager = new MapManager(n);

const fovManager = new FovManager(eventBus);

const renderer = new Renderer(
    mapManager, 
    layoutManager,
    fovManager
);

const uiManager = new UiManager(eventBus);

const unitFactory = new UnitFactory(assetManager);

const roomState = new RoomState();

const networkManager = new NetworkManager(eventBus, roomState);

const pathPreviewManager = new PathPreviewManager(
    mapManager, 
    fovManager
);

const movementState = new MovementState();

const unitManager = new UnitManager(
    mapManager,
    layoutManager,
    unitFactory,
    fovManager,
    roomState
);

const movementManager = new MovementManager(
    unitManager,
    movementState,
    layoutManager,
    fovManager,
    mapManager
)

const gameRenderer = new GameRenderer(
    renderer, 
    uiManager, 
    unitManager, 
    pathPreviewManager, 
    roomState
);

const gameInputHandler = new GameInputHandler(
    mapManager,
    gameRenderer, 
    layoutManager, 
    uiManager, 
    eventBus
);
const menuInputHandler = new MenuInputHandler(
    gameRenderer, 
    uiManager, 
    eventBus
);

const cameraManager = new CameraManager(
    eventBus, 
    layoutManager
);

const notificationManager = new NotificationManager(
    eventBus,
    roomState
)

const actionValidator = new ActionValidator(
    unitManager,
    mapManager,
    fovManager
)

const gameActionEventHandler = new GameActionEventHandler(
    eventBus, 
    networkManager,
    unitManager
);

const renderingEventHandler = new RenderingEventHandler(
    eventBus,
    gameRenderer
)

const inputEventHandler = new InputEventHandler(
    eventBus, 
    uiManager, 
    layoutManager, 
    gameInputHandler, 
    unitManager,
    cameraManager,
    pathPreviewManager,
    fovManager
);

const httpEventHandler = new HttpEventHandler(
    eventBus, 
    uiManager, 
    networkManager, 
    gameInputHandler, 
    menuInputHandler, 
    roomState
);

const notificationEventHandler = new NotificationEventHandler(
    eventBus, 
    uiManager,
    notificationManager,
    roomState,
    pathPreviewManager,
    movementState,
    unitManager,
    fovManager,
    layoutManager,
    actionValidator,
    mapManager,
    gameInputHandler,
    menuInputHandler
);

const game = new Game(
  gameActionEventHandler,
  renderingEventHandler,
  inputEventHandler,
  httpEventHandler,
  notificationEventHandler,
  menuInputHandler,
  gameRenderer,
  uiManager,
  cameraManager,
  unitManager,
  movementManager,
  notificationManager,
);

game.start();
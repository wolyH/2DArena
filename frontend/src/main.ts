import './style.css'
import { Game } from './game.ts';
import { Renderer } from './renderer.ts';
import { Layout } from './layout.ts';
import { AssetManager } from './utils.ts';
import { Grid } from './grid.ts';
import { createNotifier } from './utils.ts';
import type { GameEvent, UIEvent } from './game.ts';
import { UI } from './ui.ts';
import { GameInputHandler, MenuInputHandler } from './input.ts';
import { UnitFactory } from './unit.ts';

const assetManager = new AssetManager();

const urls: Array<[string, string, number]> = [
  ["black_idle", "./black/idle", 8],
  ["black_moving", "./black/moving", 6],
  ["black_striking", "./black/striking", 4],
  ["dust", "./dust", 4],
  ["cursor", "./cursor/sword", 1]
];

await assetManager.loadSprites(urls);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = 
  `<canvas id="game-canvas"></canvas>
   <canvas id="ui-canvas"></canvas>`;

const width = window.innerWidth;
const height = window.innerHeight;

//Divide hex horizontal size by 2 to give an isometric look
const n = 4
const origin = {x: width / 2, y: height / 2}
const layout = new Layout(origin, {x: 100, y: 50}, n);

const grid = new Grid(n);
const renderer = new Renderer(grid, layout);

const notifier = createNotifier<GameEvent & UIEvent>();
const ui = new UI(notifier)
const unitFactory = new UnitFactory(assetManager);
const gameInputHandler = new GameInputHandler(grid, renderer, layout, ui, notifier);
const menuInputHandler = new MenuInputHandler(renderer, ui, notifier);

const dependencies = {
  grid: grid,
  renderer: renderer,
  layout: layout,
  ui: ui,
  notifier: notifier,
  inputHandlers: {
    gameInputHandler: gameInputHandler,
    menuInputHandler: menuInputHandler
  },
  unitFactory: unitFactory
}

const game = new Game(dependencies);
game.start();
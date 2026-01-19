import './style.css'
import { Game } from './game.ts';
import { Renderer } from './renderer.ts';
import type { PlayerAction } from './player.ts';
import { Player } from './player.ts';
import { Layout } from './layout.ts';
import { Hex } from './hex.ts';
import { AssetManager } from './utils.ts';
import { Grid } from './grid.ts';
import { createNotifier } from './utils.ts';
import type { GameEvent, UiEvent } from './game.ts';

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
const layout = new Layout({x: width / 2, y: height / 2}, {x: 100, y: 50});
const renderer = new Renderer(layout);

const N = 5;
const map = new Map<string, Hex>();

//Store the map (hexagonal)
for (let q = -N; q <= N; q++) {
  const r1 = Math.max(-N, -q - N);
  const r2 = Math.min(N, -q + N);

  for(let r = r1 ; r <= r2 ; r++) {
    const hex = new Hex(q, r, -q-r);
    map.set(hex.hashCode, hex);
  }
}

map.delete(Hex.hashCode(-N,0));
map.delete(Hex.hashCode(N,0));
map.delete(Hex.hashCode(0,0));

const sprites: Record<PlayerAction, Array<HTMLImageElement>> = {
    "Idle": assetManager.get("black_idle")!,
    "Moving": assetManager.get("black_moving")!,
    "Striking": assetManager.get("black_striking")!,
    "Dying": assetManager.get("dust")!
};

const grid = new Grid(map, N);

const hex1 = map.get(Hex.hashCode(-(N-1), 0))!;

const hex2 = map.get(Hex.hashCode(N-1, 0))!;

const [x1, y1] = layout.hexToPixel(hex1);
const [x2, y2] = layout.hexToPixel(hex2);

const player1 = Player.createAlly(hex1, x1, y1, sprites);

const player2 = Player.createAlly(hex2, x2, y2, sprites);

const gameNotifier = createNotifier<GameEvent & UiEvent>();
const game = new Game([player1, player2], grid, renderer, gameNotifier);

game.start();
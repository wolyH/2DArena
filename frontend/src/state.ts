import { Player } from "./player.ts";
import type {Point2D} from './layout.ts'
import { Grid } from "./grid.ts";

export interface GameState {
    player: Player;
    grid: Grid;
    isPlayerTurn: boolean;
    pathState: PathState; 
}

interface PathState{
    show: boolean;
    path: Array<Point2D>; 
}
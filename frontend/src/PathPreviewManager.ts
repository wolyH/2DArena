import type { MapManager } from "./MapManager";
import { Hex } from "./Hex";
import type { FovManager } from "./FovManager";

export class PathPreviewManager {
    #mapManager: MapManager;
    #fovManager: FovManager;

    #pathPreview: {goals: Array<Hex>, isTraversable: boolean} = {goals: [], isTraversable: false};

    constructor(mapManager: MapManager, fovManager: FovManager) {
        this.#mapManager = mapManager;
        this.#fovManager = fovManager;
    }

    get pathPreview(): {goals: Array<Hex>, isTraversable: boolean} {
        return this.#pathPreview;
    }
  
    setPathPreview(goals: Hex[], isTraversable: boolean): void {
        this.#pathPreview = {goals, isTraversable};
    }
  
    clearPathPreview(): void {
        this.#pathPreview = {goals: [], isTraversable: false};
    }

    //Returns the list of neighbors and if the list contains the goal or not (eg. early exit)
    private searchNeighbors(h: Hex, goal: Hex, isVisible: boolean): [Array<Hex>, boolean] {
        const neighbors: Array<Hex> = [];

        const direction_vectors: Array<{q: number, r: number, s: number}> = [
            {q:+1, r:0, s:-1}, {q:+1, r:-1, s:0}, {q:0, r:-1, s:+1}, 
            {q:-1, r:0, s:+1}, {q:-1, r:+1, s:0}, {q:0, r:+1, s:-1}, 
        ]

        for(const vector of direction_vectors) {
            const n = this.#mapManager.getHex(Hex.hashCode(h.q + vector.q, h.r + vector.r))
            if (n && n.isTraversable() && (isVisible ? this.#fovManager.isVisible(n) : true)) {
                neighbors.push(n);
                if(goal.hashCode === n.hashCode) {
                    return [neighbors, true];
                }
            }
        }

        return [neighbors, false];
    }

    searchPath(start: Hex, goal: Hex, isVisible = true): Array<Hex> {
        if(start.hashCode === goal.hashCode) {
            return [];
        }

        //Here frontier acts like a queue but we use an array with a shifting index instead
        //because array.shift() can be O(N) which caused lag
        const frontier: Array<Hex>= [];
        frontier.push(start);

        const came_from: Map<string, string> = new Map();
        came_from.set(start.hashCode, "");
        let startIdx = 0

        while(startIdx < frontier.length) {
            const current = frontier[startIdx];
            startIdx++;

            const [neighbors, earlyExit] = this.searchNeighbors(current, goal, isVisible);

            if (earlyExit) {
                came_from.set(goal.hashCode, current.hashCode);
                break;
            }

            for(const next of neighbors) {
                if(!came_from.has(next.hashCode)) {
                    frontier.push(next);
                    came_from.set(next.hashCode, current.hashCode);
                }
            }
        }

        let current = goal;
        const path: Array<Hex> = [];
        
        while(current.hashCode !== start.hashCode) {
            const previous_hash = came_from.get(current.hashCode);
            if(!previous_hash) {
                return []
            }
            const previous = this.#mapManager.getHex(previous_hash);
            if (!previous) {
                return [];
            }
            path.push(current);
            current = previous;
        }

        path.push(start);
        return path.reverse();
    }
}
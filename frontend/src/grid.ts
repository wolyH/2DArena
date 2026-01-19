import { Hex } from "./hex.ts";
import { Player } from "./player.ts";

export class Grid {
    map: Map<string, Hex>;
    visibilityMap: Map<string, Array<string>>;
    #shrinkLevel: number;

    constructor(map: Map<string, Hex>, shrinkLevel: number) {
        this.map = map;
        this.#shrinkLevel = shrinkLevel
        this.visibilityMap = new Map();
        this.updateVisibilityMap();
    }

    //return the list of neighbors and if the list contains the goal or not (eg. early exit)
    searchNeighbors(h: Hex, goal: Hex, isVisible: boolean): [Array<Hex>, boolean] {
        const neighbors: Array<Hex> = []

        const direction_vectors: Array<{q: number, r: number, s: number}> = [
            {q:+1, r:0, s:-1}, {q:+1, r:-1, s:0}, {q:0, r:-1, s:+1}, 
            {q:-1, r:0, s:+1}, {q:-1, r:+1, s:0}, {q:0, r:+1, s:-1}, 
        ]

        for(const vector of direction_vectors) {
            const neighbor = this.map.get(Hex.hashCode(h.q + vector.q, h.r + vector.r))
            if (neighbor && !neighbor.player && !neighbor.isObstacle && (isVisible ? neighbor.isVisible : true)) {
                neighbors.push(neighbor);
                if(goal.hashCode === neighbor.hashCode) {
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
            startIdx++

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
            const previous = this.map.get(previous_hash);
            if (!previous) {
                return [];
            }
            path.push(current);
            current = previous;
        }

        path.push(start);
        return path.reverse();
    }

    getFov(hex: Hex): Array<string> {
        const fov = this.visibilityMap.get(hex.hashCode);
        if(fov) {
            return fov;
        }
        return [];
    }

    shrink(): void {
        this.#shrinkLevel--;
        const range = this.#shrinkLevel;
        const newMap: Map<string, Hex> = new Map();

        for (let q = -range; q <= +range ; q++) {
            for (let r = Math.max(-range, -q-range) ; r <= Math.min(+range, -q+range) ; r++) {
                const hex = this.map.get(Hex.hashCode(q,r));
                if (hex) {
                    newMap.set(hex.hashCode, hex);
                }
            }
        }
        this.map = newMap;
        this.updateVisibilityMap();
    }

    private updateVisibilityMap(visibilityRange: number = Player.VISIBILITY_RANGE): void {
        this.visibilityMap.clear();

        for (const h1 of this.map.values()) {
            const fov: Array<string> = [];
            for (const h2 of this.map.values()) {
                if (this.rayCast(h1,h2, visibilityRange)) {
                    fov.push(h2.hashCode);
                }
            }
            this.visibilityMap.set(h1.hashCode, fov);
        }
    }

    private lerp(a: number, b: number, t:number): number {
        return a + (b - a) * t;
    }
    private cube_lerp(h1: Hex, h2: Hex, t: number): [number, number, number] {
        return [this.lerp(h1.q, h2.q, t), this.lerp(h1.r, h2.r, t), this.lerp(h1.s, h2.s, t)];
    }
    
    private rayCast(h1: Hex, h2: Hex, visibilityRange: number): boolean {
        const distance = h1.distance(h2);

        if (distance > visibilityRange) {
            return false;
        }
        let isVisible = false;

        for (let i = 0 ; i <= distance ; i++) {
            const [q,r,_] = this.cube_lerp(h1, h2, 1.0 / visibilityRange * i)
            const hex = this.map.get(Hex.hashCode(q, r))
            if (hex && !hex.isObstacle) {
                isVisible = true;
            }
        }
        return isVisible;
    }
}
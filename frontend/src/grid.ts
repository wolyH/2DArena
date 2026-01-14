import { Hex } from "./hex.ts";

export class Grid {
    map: Map<string, Hex>;
    visibilityMap: Map<string, Array<string>>;
    visibilityRange = 2;
    shrinkLevel: number;

    constructor(map: Map<string, Hex>, shrinkLevel: number) {
        this.map = map;
        this.shrinkLevel = shrinkLevel
        this.visibilityMap = new Map();
        this.updateVisibilityMap();
    }

    searchNeighbors(h: Hex, isVisible: boolean) {
        const neighbors = []

        const direction_vectors: Array<{q: number, r: number, s: number}> = [
            {q:+1, r:0, s:-1}, {q:+1, r:-1, s:0}, {q:0, r:-1, s:+1}, 
            {q:-1, r:0, s:+1}, {q:-1, r:+1, s:0}, {q:0, r:+1, s:-1}, 
        ]

        for(const vector of direction_vectors) {
            const neighbor = this.map.get(Hex.hashCode(h.q + vector.q, h.r + vector.r))
            if (neighbor && !neighbor.isObstacle && !neighbor.hasPlayer && (isVisible ? neighbor.isVisible : true)) {
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    searchPath(start: Hex, goal: Hex, isVisible = true): Array<Hex>{
        const frontier: Array<Hex>= [];
        frontier.push(start);

        const came_from: Map<string, string> = new Map();
        came_from.set(start.hashCode(), "");

        while(!(frontier.length === 0)) {
            const current = frontier.shift();
            if(!current) {
                continue;
            }
            for(const next of this.searchNeighbors(current, isVisible)) {
                if(!came_from.has(next.hashCode())) {
                    frontier.push(next);
                    came_from.set(next.hashCode(), current.hashCode());
                }
            }
        }

        let current = goal;
        const path: Array<Hex> = [];
        
        while(current.hashCode() !== start.hashCode()) {
            const previous_hash = came_from.get(current.hashCode());
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

    getFOV(hex: Hex): Array<string>  {
        const fov = this.visibilityMap.get(hex.hashCode());
        if(fov) {
            return fov;
        }
        return [];
    }

    shrink(): void {
        this.shrinkLevel--;
        const range = this.shrinkLevel;
        const newMap: Map<string, Hex> = new Map();

        for (let q = -range; q <= +range ; q++) {
            for (let r = Math.max(-range, -q-range) ; r <= Math.min(+range, -q+range) ; r++) {
                const hex = this.map.get(Hex.hashCode(q,r));
                if (hex) {
                    newMap.set(Hex.hashCode(q,r), hex);
                }
            }
        }
        this.map = newMap;
        this.updateVisibilityMap();
    }

    private updateVisibilityMap(): void {
        this.visibilityMap.clear();

        for (const h1 of this.map.values()) {
            const fov: Array<string> = [];
            for (const h2 of this.map.values()) {
                if (this.rayCast(h1,h2)) {
                    fov.push(h2.hashCode());
                }
            }
            this.visibilityMap.set(h1.hashCode(), fov);
        }
    }

    private lerp(a: number, b: number, t:number): number {
        return a + (b - a) * t;
    }
    private cube_lerp(h1: Hex, h2: Hex, t: number): [number, number, number] {
        return [this.lerp(h1.q, h2.q, t), this.lerp(h1.r, h2.r, t), this.lerp(h1.s, h2.s, t)];
    }
    
    private rayCast(h1: Hex, h2: Hex): boolean {
        const distance = h1.distance(h2);

        if (distance > this.visibilityRange) {
            return false;
        }
        let isVisible = false;

        for (let i = 0 ; i <= distance ; i++) {
            const [q,r,_] = this.cube_lerp(h1,h2,1.0/this.visibilityRange * i)
            const hex = this.map.get(Hex.hashCode(q,r))
            if (hex && !hex.isObstacle) {
                isVisible = true;
            }
        }
        return isVisible;
    }
}
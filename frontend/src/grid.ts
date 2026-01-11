import { Hex } from "./hex.ts";

export class Grid {
    map: Map<string, Hex>;

    constructor(map: Map<string, Hex>) {
        this.map = map;
    }

    searchNeighbors(h: Hex) {
        const neighbors = []

        const direction_vectors: Array<{q: number, r: number, s: number}> = [
            {q:+1, r:0, s:-1}, {q:+1, r:-1, s:0}, {q:0, r:-1, s:+1}, 
            {q:-1, r:0, s:+1}, {q:-1, r:+1, s:0}, {q:0, r:+1, s:-1}, 
        ]

        for(const vector of direction_vectors) {
            const neighbor = this.map.get(Hex.hashCode(h.q + vector.q, h.r + vector.r))
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    searchPath(start: Hex, goal: Hex): Array<Hex>{

        const frontier: Array<Hex>= [];
        frontier.push(start);

        const came_from: Map<string, string> = new Map();
        came_from.set(start.hashCode(), "");

        while(!(frontier.length === 0)) {
            const current = frontier.shift();
            if(!current) {
                continue;
            }
            for(const next of this.searchNeighbors(current)) {
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
}
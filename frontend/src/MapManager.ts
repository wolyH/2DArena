import { Hex } from "./model/Hex";

export class MapManager {
    #map: Map<string, Hex>;
    readonly #n: number;

    constructor(n: number) {
        this.#n = n;
        this.#map = new Map<string, Hex>();
    }

    getHex(hashCode: string): Hex | undefined {
        return this.#map.get(hashCode);
    }

    hasHex(hashCode: string): boolean {
        return this.#map.has(hashCode);
    }

    forEachHex(consumer: (hex: Hex) => void): void {
        for (const hex of this.#map.values()) {
            consumer(hex);
        }
    }

    get n(): number {
        return this.#n;
    }

    fill(): void {
        this.#map.clear();

        const n = this.#n;
        //hexagonal shape
        for (let q = -n; q <= n; q++) {
          const r1 = Math.max(-n, -q - n);
          const r2 = Math.min(n, -q + n);
        
          for(let r = r1 ; r <= r2 ; r++) {
            const hex = new Hex(q, r, -q-r);
            this.#map.set(hex.hashCode, hex);
          }
        }

        this.#map.delete(Hex.hashCode(-n,0));
        this.#map.delete(Hex.hashCode(n,0));
        this.#map.delete(Hex.hashCode(0,0));
    }

    shrink(shrinkLevel: number): void {
        const range = shrinkLevel;
        const newMap: Map<string, Hex> = new Map();

        for (let q = -range; q <= +range ; q++) {
            for (let r = Math.max(-range, -q-range) ; r <= Math.min(+range, -q+range) ; r++) {
                const hex = this.#map.get(Hex.hashCode(q,r));
                if (hex) {
                    newMap.set(hex.hashCode, hex);
                }
            }
        }
        this.#map = newMap;
    }
}
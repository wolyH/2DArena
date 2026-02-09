import type { Unit } from "./unit/Unit";

export class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;

    readonly strokeColor: string;
    readonly isObstacle: boolean;
    unit: Unit | undefined;

    readonly hashCode: string;

    static readonly DEFAULT_FILL_COLOR = "#607c7fff";
    static readonly DEFAULT_HIDDEN_FILL_COLOR = "#303e40ff"
    static readonly DEFAULT_STROKE_COLOR = "#0a0a0aff";

    constructor(q: number, r: number, s: number, isObstacle: boolean = false) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.q = q;
        this.r = r;
        this.s = s;

        this.hashCode =`${q}_${r}`;

        this.isObstacle = isObstacle;

        this.strokeColor = Hex.DEFAULT_STROKE_COLOR;
    }

    isTraversable(): boolean {
        return (!this.unit || this.unit.isDead) && !this.isObstacle;
    }

    distance(other: Hex): number {
        return Math.max(
            Math.abs(this.q - other.q), 
            Math.abs(this.r - other.r), 
            Math.abs(this.s - other.s)
        );
    }

    equals(other: Hex): boolean {
         return this.q === other.q && this.r === other.r && this.s === other.s;
    }
    
    isNeighbor(other: Hex): boolean {
        return this.distance(other) === 1;
    }
    
    //Coordinate s is redundant because q + r + s must be 0
    static hashCode(q: number, r: number) : string {
         return `${q}_${r}`;
    }
}
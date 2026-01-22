import { Unit } from "./unit.ts";

export class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;

    #isVisible: boolean;

    #fillColor: string;
    readonly strokeColor: string;
    readonly isObstacle: boolean;
    unit?: Unit;

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

        this.#isVisible = false;
        this.isObstacle = isObstacle;

        this.#fillColor = Hex.DEFAULT_HIDDEN_FILL_COLOR;
        this.strokeColor = Hex.DEFAULT_STROKE_COLOR;
    }

    get isVisible(): boolean {
        return this.#isVisible;
    }

    get fillColor(): string {
        return this.#fillColor;
    }

    setVisibility(isVisible: boolean): void {
        this.#isVisible = isVisible;
        this.#fillColor = this.#isVisible? Hex.DEFAULT_FILL_COLOR: Hex.DEFAULT_HIDDEN_FILL_COLOR;
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
    
    //Coordinate s is redundant
    static hashCode(q: number, r: number) : string {
         return `${q}_${r}`;
    }
}
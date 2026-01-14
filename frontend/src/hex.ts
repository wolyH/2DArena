export class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;

    #isVisible: boolean;

    fillColor: string;
    strokeColor: string;
    isObstacle : boolean = false;
    hasPlayer: boolean = false;

    static readonly DEFAULT_FILL_COLOR = "#607c7fff";
    static readonly DEFAULT_HIDDEN_FILL_COLOR = "#303e40ff"
    static readonly DEFAULT_STROKE_COLOR = "#0a0a0aff";

    /**
     * Creates a new Hexagon using Cube coordinates.
     * @throws {Error} If the sum of q, r, and s is not zero.
     */
    constructor(q: number, r: number, s: number) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.q = q;
        this.r = r;
        this.s = s;

        this.#isVisible = false;

        this.fillColor = Hex.DEFAULT_HIDDEN_FILL_COLOR;
        this.strokeColor = Hex.DEFAULT_STROKE_COLOR;
    }

    get isVisible(): boolean {
        return this.#isVisible;
    }

    setVisibility(isVisible: boolean): void {
        this.#isVisible = isVisible;
        this.fillColor = this.#isVisible? Hex.DEFAULT_FILL_COLOR: Hex.DEFAULT_HIDDEN_FILL_COLOR;
    }

    distance(other: Hex): number {
        return Math.max(
            Math.abs(this.q - other.q), 
            Math.abs(this.r - other.r), 
            Math.abs(this.s - other.s)
        );
    }

    hashCode(): string {
        return Hex.hashCode(this.q, this.r);
    }
    
    // Coordinate s is redundant and delimiter choice doesn't matter here
    static hashCode(q: number, r: number) : string {
         return `${q}_${r}`;
    }
}
export class Hex {
    readonly #q: number;
    readonly #r: number;
    readonly #s: number;

    fillColor: string | CanvasPattern;
    strokeColor: string;

    static readonly DEFAULT_FILL_COLOR = "#607c7fff";
    static readonly DEFAULT_STROKE_COLOR = "#0a0a0aff";
    static readonly DEFAULT_DEPTH_COLOR = "#161717ff";
    static readonly DEFAULT_LINE_WIDTH = 2;

    /**
     * Creates a new Hexagon using Cube coordinates.
     * @throws {Error} If the sum of q, r, and s is not zero.
     */
    constructor(
        q: number, 
        r: number, 
        s: number, 
        fillColor?: CanvasPattern, 
        strokeColor: string = Hex.DEFAULT_STROKE_COLOR,
    ) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.#q = q;
        this.#r = r;
        this.#s = s;

        if(fillColor) {
            this.fillColor = fillColor
        }
        else {
            this.fillColor = Hex.DEFAULT_FILL_COLOR;
        }

        this.strokeColor = strokeColor;
    }

    get q(): number {
        return this.#q;
    }

    get r(): number {
        return this.#r;
    }

    get s(): number {
        return this.#s;
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
import { Hex } from "./hex.ts"

export interface Point2D {
    x: number;
    y: number;
}

//Uses the pointy top orientation
export class Layout {
    #origin: Point2D;
    #size: Point2D;
    #cameraOffset: Point2D;

    readonly #n: number

    //Forward matrix: Hex to Pixel
    readonly #f0 = Math.sqrt(3.0); 
    readonly #f1 = Math.sqrt(3.0) / 2.0; 
    readonly #f2 = 0.0; 
    readonly #f3 = 3.0 / 2.0;
    //Backward matrix: Pixel to Hex
    readonly #b0 = Math.sqrt(3.0) / 3.0; 
    readonly #b1 = -1.0 / 3.0; 
    readonly #b2 = 0.0; 
    readonly #b3 = 2.0 / 3.0;

    //In multiples of 60° (0.5 for pointy top hex orientation)
    private readonly startAngle = 0.5;

    constructor(origin: Point2D, size: Point2D, n: number) {
        this.#origin = origin;
        this.#size = size;
        this.#n = n;
        this.#cameraOffset = {x:0, y:0};
    }

    resetCameraOffset(): void {
        this.#cameraOffset = {x:0, y:0};
    }

    updateCameraOffset(x: number, y: number): boolean {
        const maxOffsetX = this.#n * this.#size.x;
        const maxOffsetY = this.#n * this.#size.y;
    
        const newX = this.#cameraOffset.x + x;
        const newY = this.#cameraOffset.y + y;
    
        let isUpdated = false;
    
        if (newX >= -maxOffsetX && newX <= maxOffsetX) {
            this.#cameraOffset.x = newX;
            isUpdated = true;
        }
    
        if (newY >= -maxOffsetY && newY <= maxOffsetY) {
            this.#cameraOffset.y = newY;
            isUpdated = true;
        }
    
        return isUpdated;
    }

    updateOrigin(x: number, y: number): void {
        this.#origin = {x: x, y: y};
    }

    getSizeX(): number {
        return this.#size.x
    }

    getSizeY(): number {
        return this.#size.y
    }

    findCorners(h: Hex): Array<Point2D> {
        const corners: Array<Point2D> = [];
        const [centerX, centerY] = this.hexToScreen(h);

        for(let i = 0 ; i < 6 ; i++) {
            const angle_deg = 60 * (i - this.startAngle);
            const angle_rad = Math.PI / 180.0 * angle_deg;
            corners.push({
                x: centerX + this.#size.x * Math.cos(angle_rad),
                y: centerY + this.#size.y * Math.sin(angle_rad)
            });
        }

        return corners;
    }

    hexToWorld(h: Hex): [number, number] {
        const x = (this.#f0 * h.q + this.#f1 * h.r) * this.#size.x;
        const y = (this.#f2 * h.q + this.#f3 * h.r) * this.#size.y;
        return [x, y];
    }

    hexToScreen(h: Hex): [number, number] {
       const [x, y] = this.hexToWorld(h);
       return this.worldToScreen({x: x, y: y});
    }

    worldToHex(p: Point2D): [number, number, number] {
        const point = {
            x: p.x / this.#size.x, 
            y: p.y / this.#size.y
        };
        const q = (this.#b0 * point.x + this.#b1 * point.y);
        const r = (this.#b2 * point.x + this.#b3 * point.y);

        return this.round(q, r, -q-r);
    }

    screenToHex(p: Point2D): [number, number, number] {
        const [x, y] = this.screenToWorld(p);
        const point = {
            x: x / this.#size.x, 
            y: y / this.#size.y
        };
        const q = (this.#b0 * point.x + this.#b1 * point.y);
        const r = (this.#b2 * point.x + this.#b3 * point.y);

        return this.round(q, r, -q-r);
    }

    screenToWorld(p: Point2D): [number, number] {
        return [p.x - this.#origin.x - this.#cameraOffset.x, p.y - this.#origin.y - this.#cameraOffset.y]
    }

    worldToScreen(p: Point2D): [number, number] {
        return [p.x + this.#origin.x + this.#cameraOffset.x, p.y + this.#origin.y + this.#cameraOffset.y]
    }

    private round(qi: number, ri: number, si: number): [number, number, number] {

        let q = Math.round(qi);
        let r = Math.round(ri);
        let s = Math.round(si);

        const q_diff = Math.abs(q - qi)
        const r_diff = Math.abs(r - ri)
        const s_diff = Math.abs(s - si)

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r-s
        }
        else if(r_diff > s_diff){
            r = -q-s
        }
        else {
            s = -q-r
        }

        return [q, r, s];
    }
}
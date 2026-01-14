import { Hex } from "./hex.ts";

export type PlayerAction = "Idle" | "Moving" | "Striking";

type Direction = 1 | -1

export class Player {

    // position of the hex most adjacent to the player on the grid
    #q: number;
    #r: number;
    #s: number;

    //position of the player on the screen
    x: number;
    y: number;

    //speed of the player moving on the screen
    speed: number

    isLocal: boolean = true;

    private direction: Direction;
    private action: PlayerAction;
    private spriteIdx: number;
    private sprites: Record<PlayerAction, Array<HTMLImageElement>>;
    private frameCounter: number;
    private static readonly ANIMATION_SPEED = 40;
    private static readonly LEFT  = -1;
    private static readonly RIGHT = 1;

    constructor(
        q: number, 
        r: number, 
        s: number,
        x: number,
        y: number,
        sprites: Record<PlayerAction, Array<HTMLImageElement>>,
        speed: number = 1  
    ) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }
        this.#q = q;
        this.#r = r;
        this.#s = s;

        this.x = x;
        this.y = y;

        this.speed = speed;

        this.direction = Player.RIGHT;
        this.action  = "Idle";
        this.spriteIdx = 0;
        this.sprites = sprites;
        this.frameCounter = 0;
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

    setHexCoordinate(q: number, r: number, s: number): void {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }
        this.#q = q;
        this.#r = r;
        this.#s = s;
    }

    isAt(hex: Hex): boolean {
        return hex.q === this.q && hex.r === this.r && hex.s === this.s;
    }

    updateVisual(): void {
        this.frameCounter++

        if (this.frameCounter >= Player.ANIMATION_SPEED) {
            this.frameCounter = 0;

            const nextIdx = this.spriteIdx + 1;
            const spriteSheet = this.sprites[this.action];

            if(!spriteSheet) {
                throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
            }
            else if (nextIdx >= spriteSheet.length) {
                if (this.action === "Striking") {
                    this.idle();
                }
                else {
                    this.spriteIdx = 0;
                }
            }
            else {
                this.spriteIdx = nextIdx;
            }
        }
    }

    getCurrentSprite(): HTMLImageElement {
        const spriteSheet = this.sprites[this.action];

        if(spriteSheet) {
            return spriteSheet[this.spriteIdx];
        }
        throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
    }

    move(): void {
        this.changeAction("Moving");
    }

    strike(): void {
        this.changeAction("Striking");
    }

    idle(): void {
        this.changeAction("Idle");
    }

    private changeAction(action: PlayerAction): void {
        if (this.action !== action) {
            this.action = action;
            const spriteSheet = this.sprites[this.action];
            if(spriteSheet) {
                // The animation starts instantly at next frame
                this.spriteIdx = this.sprites[action].length - 1;
                this.frameCounter = Player.ANIMATION_SPEED;
            }
            else  {
                throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
            }
        }
    }

    is(action: PlayerAction): boolean {
        return this.action === action;
    }

    turnLeft(): void {
        this.direction = Player.LEFT;
    }

    turnRight(): void {
        this.direction = Player.RIGHT;
    }

    getDirection(): Direction {
        return this.direction;
    }
}
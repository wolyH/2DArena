import { Hex } from "./hex.ts";

export type PlayerAction = "Idle" | "Moving" | "Striking" | "Dying";

type Direction = 1 | -1;

export class Player {
    //position of the hex most adjacent to the player on the grid
    #hex: Hex

    //position of the player on the screen
    x: number;
    y: number;

    //speed of the player moving on the screen
    readonly speed: number;

    static readonly VISIBILITY_RANGE = 2;

    //if the player is on my team or not
    readonly isAlly: boolean;
    #isDead: boolean;
    #deathAnimationOver?: boolean;

    #direction: Direction;
    static readonly LEFT = -1;
    static readonly RIGHT = 1;

    #action: PlayerAction;

    #spriteIdx: number;
    #sprites: Record<PlayerAction, Array<HTMLImageElement>>;
    #frameCounter: number;

    static readonly #ANIMATION_SPEED = 40;

    private constructor(
        hex: Hex,
        x: number,
        y: number,
        sprites: Record<PlayerAction, Array<HTMLImageElement>>,
        speed: number = 1,
        isAlly: boolean
    ) {

        this.#hex = hex;
        hex.player = this;

        this.x = x;
        this.y = y;

        this.speed = speed;

        this.#direction = Player.RIGHT;
        this.#action  = "Idle";
        this.#spriteIdx = 0;
        this.#sprites = sprites;
        this.#frameCounter = Player.#ANIMATION_SPEED;
        
        this.isAlly = isAlly;
        this.#isDead = false;
    }

    static createAlly(  
        hex: Hex,
        x: number,
        y: number,
        sprites: Record<PlayerAction, Array<HTMLImageElement>>,
        speed: number = 1) 
    {
        return new Player(hex, x, y, sprites, speed, true);
    }

    static createEnemy(  
        hex: Hex,
        x: number,
        y: number,
        sprites: Record<PlayerAction, Array<HTMLImageElement>>,
        speed: number = 1) 
    {
        return new Player(hex, x, y, sprites, speed, false);
    }

    get hex(): Hex {
        return this.#hex;
    }

    get direction(): number {
        return this.#direction;
    }

    get isDead(): boolean {
        return this.#isDead;
    }

    get deathAnimationOver(): boolean | undefined {
        return this.#deathAnimationOver;
    }

    updateVisual(): void {
        this.#frameCounter++

        if (this.#frameCounter >= Player.#ANIMATION_SPEED) {
            this.#frameCounter = 0;

            const spriteSheet = this.#sprites[this.#action];

            if(!spriteSheet) {
                throw new Error(`Sprite sheet is null for PlayerAction: ${this.#action}`);
            }
            else if (this.#spriteIdx + 1 >= spriteSheet.length) {
                if (this.#action === "Striking") {
                    this.idle();
                } else if (this.#action === "Dying"){
                    this.#deathAnimationOver = true;    
                }

                this.#spriteIdx = 0;
            }
            else {
                this.#spriteIdx += 1;
            }
        }
    }

    getCurrentSprite(): HTMLImageElement {
        const spriteSheet = this.#sprites[this.#action];

        if(spriteSheet) {
            return spriteSheet[this.#spriteIdx];
        }
        throw new Error(`Sprite sheet is null for PlayerAction: ${this.#action}`);
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

    die(): void {
        if (this.#isDead) {
            throw new Error("player is already dead");
        }
        this.#isDead = true;
        this.hex.player = undefined;
        this.changeAction("Dying");
    }

    setHex(hex: Hex): void {
        if(hex.isObstacle || hex.player) {
            throw Error("player cannot be on an obstacle or another player");
        }
        this.hex.player = undefined;
        this.#hex = hex;
        hex.player = this;
    }

    private changeAction(action: PlayerAction): void {
        if (this.#action !== action) {
            this.#action = action;
            const spriteSheet = this.#sprites[this.#action];
            if(spriteSheet) {
                //The animation starts instantly at next frame
                this.#frameCounter = Player.#ANIMATION_SPEED;
                this.#spriteIdx = 0;
            }
            else  {
                throw new Error(`Sprite sheet is null for PlayerAction: ${this.#action}`);
            }
        }
    }

    is(action: PlayerAction): boolean {
        return this.#action === action;
    }

    turnLeft(): void {
        this.#direction = Player.LEFT;
    }

    turnRight(): void {
        this.#direction = Player.RIGHT;
    }
}
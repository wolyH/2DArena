import type { Hex } from "../Hex";

export type UnitAction = "Idle" | "Moving" | "Striking" | "Dying";

type Direction = 1 | -1;

export class Unit {
    //position of the hex most adjacent to the unit on the grid
    #hex: Hex

    //position of the unit on the screen
    x: number;
    y: number;

    //speed of the unit moving on the screen
    readonly speed: number;

    static readonly VISIBILITY_RANGE = 2;

    //if the unit is on my team or not
    readonly player: string;
    #isDead: boolean;

    #direction: Direction;
    static readonly LEFT = -1;
    static readonly RIGHT = 1;

    #action: UnitAction;

    #spriteIdx: number;
    #sprites: Record<UnitAction, Array<HTMLImageElement>>;
    #frameCounter: number;
    static readonly #ANIMATION_SPEED = 30;

    constructor(
        hex: Hex,
        x: number,
        y: number,
        sprites: Record<UnitAction, Array<HTMLImageElement>>,
        speed: number,
        username: string
    ) {
        this.#hex = hex;
        if(hex.unit && !hex.unit.isDead ) {
            throw new Error("cannot spawn a unit on an occupied hex")
        }
        hex.unit = this;

        this.x = x;
        this.y = y;

        this.speed = speed;

        this.#direction = Unit.RIGHT;
        this.#action  = "Idle";
        this.#spriteIdx = 0;
        this.#sprites = sprites;
        this.#frameCounter = Unit.#ANIMATION_SPEED;
        
        this.player = username;
        this.#isDead = false;
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

    update(): void {
        this.#frameCounter++;

        if (this.#frameCounter >= Unit.#ANIMATION_SPEED) {
            this.#frameCounter = 0;

            const spriteSheet = this.#sprites[this.#action];

            if(!spriteSheet) {
                throw new Error(`Sprite sheet is null for UnitAction: ${this.#action}`);
            }
            else if (this.#spriteIdx + 1 >= spriteSheet.length) {
                if (this.#action === "Striking") {
                    this.idle();
                } else if (this.#action === "Dying"){
                    this.idle();    
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
        throw new Error(`Sprite sheet is null for UnitAction: ${this.#action}`);
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
            throw new Error("unit is already dead");
        }
        this.#isDead = true;
        this.#hex.unit = undefined;
        this.changeAction("Dying");
    }

    setHex(hex: Hex): void {
        if(hex.isObstacle || hex.unit) {
            throw Error("Unit cannot be on an obstacle or another Unit");
        }
        this.#hex.unit = undefined;
        this.#hex = hex;
        hex.unit = this;
    }

    private changeAction(action: UnitAction): void {
        if (this.#action !== action) {
            this.#action = action;
            const spriteSheet = this.#sprites[this.#action];
            if(spriteSheet) {
                this.#frameCounter = Unit.#ANIMATION_SPEED;
                this.#spriteIdx = 0;
            }
            else  {
                throw new Error(`Sprite sheet is null for UnitAction: ${this.#action}`);
            }
        }
    }

    is(action: UnitAction): boolean {
        return this.#action === action;
    }

    turnLeft(): void { 
        this.#direction = Unit.LEFT;
    }

    turnRight(): void {
        this.#direction = Unit.RIGHT;
    }
}
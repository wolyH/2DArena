import type { Hex } from "./Hex";

export type UnitAction = "Idle" | "Moving" | "Striking" | "Dying";

type Direction = 1 | -1;

export class Unit {
    //position of the hex most adjacent to the unit on the grid
    #hex: Hex | undefined

    //position of the unit on the screen
    #x: number | undefined;
    #y: number | undefined;

    //speed of the unit moving on the screen
    readonly speed: number;

    static readonly VISIBILITY_RANGE = 2;

    readonly player: string;
    readonly idx: number;

    #isDead: boolean;

    #direction: Direction;
    static readonly LEFT = -1;
    static readonly RIGHT = 1;

    #action: UnitAction;

    #spriteIdx: number;
    #sprites: Record<UnitAction, Array<HTMLImageElement>>;
    #frameCounter: number;
    static readonly #ANIMATION_SPEED = 10;

    constructor(
        hex: Hex | undefined,
        x: number | undefined,
        y: number | undefined,
        sprites: Record<UnitAction, Array<HTMLImageElement>>,
        speed: number,
        username: string,
        idx: number
    ) {
        if(hex === undefined) {
            this.#hex = undefined;
        } else {
            if(hex.unit && !hex.unit.isDead ) {
                throw new Error("cannot spawn a unit on an occupied hex")
            }
            this.#hex = hex;
            hex.unit = this;
        }

        this.#x = x;
        this.#y = y;

        this.speed = speed;

        this.#direction = Unit.RIGHT;
        this.#action  = "Idle";
        this.#spriteIdx = 0;
        this.#sprites = sprites;
        this.#frameCounter = Unit.#ANIMATION_SPEED;
        
        this.player = username;
        this.#isDead = false;

        this.idx = idx;
    }

    get hex(): Hex {
        if(!this.isVisible()) {
            throw new Error("unit is not visible");
        }
        return this.#hex!;
    }

    hasHex(): boolean {
        return this.#hex !== undefined;
    }

    get direction(): number {
        return this.#direction;
    }

    get isDead(): boolean {
        return this.#isDead;
    }

    setWorldPos(x: number, y: number): void {
        this.#x = x;
        this.#y = y;
    }
    clearWorldPos() {
        this.#x = undefined;
        this.#y = undefined;
    }

    getWorldPos(): {x: number | undefined, y:number | undefined} {
        return {x:this.#x, y: this.#y};
    }

    isVisible(): boolean {
        return !this.#isDead && this.#hex !== undefined;
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
        this.changeAction("Dying");
        if(this.#hex === undefined) {
            return;
        }
        this.#hex.unit = undefined;
    }

    setHex(hex: Hex | undefined): void {
        if(hex === undefined) {
            if(this.#hex === undefined) {
                return;
            }
            this.#hex.unit = undefined;
            this.#hex = undefined;
            return;
        }
        if(hex.isObstacle || hex.unit) {
            throw Error("Unit cannot be on an obstacle or another Unit");
        }
        
        if(this.#hex !== undefined) {
            this.#hex.unit = undefined;
        }

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
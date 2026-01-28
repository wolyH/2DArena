export class UiButton {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly label: string;
    #isHovered: boolean;
    private onClick: () => void;

    constructor(
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        onClick: () => void
    ) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.#isHovered = false;
        this.onClick = onClick;
    }

    isHovered(): boolean {
        return this.#isHovered;
    }

    hover(): void {
        if(this.#isHovered) {
            throw new Error("cannot hover a button twice");
        }
        this.#isHovered = true;
    }

    unhover(): void {
        if(!this.#isHovered) {
            throw new Error("cannot unhover a button that is not hovered");
        }
        this.#isHovered = false;
    }

    isHit(px: number, py: number): boolean {
        return px >= this.x && 
               px <= this.x + this.width && 
               py >= this.y && 
               py <= this.y + this.height;
    }

    trigger(): void {
        this.onClick();
    }
}
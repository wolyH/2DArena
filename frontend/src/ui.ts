import type { Notifier } from "./utils.ts";
import type { GameEvent } from "./game.ts";

export class Ui {
    buttons: Array<UiButton>;
    #notifier: Notifier<GameEvent>;

    constructor(notifier: Notifier<GameEvent>) {
        this.#notifier = notifier;
        this.buttons = [];

        const dpr = window.devicePixelRatio;
        const width = window.innerWidth * dpr;
        const height = window.innerHeight * dpr;

        this.setupSkipButton(width, height);
        this.setupShrinkButton(width, height);
    }

    private setupSkipButton(width: number, height: number) {
        const skipButton = new UiButton(100, 50,  width * 0.1, height * 0.1, "Skip Turn", () => {
            this.#notifier.emit("turn_skipped");
        });
        this.buttons.push(skipButton);
    }

    private setupShrinkButton(width: number, height: number) {
        const skipButton = new UiButton(100, 200,  width * 0.1, height * 0.1, "Shrink", () => {
            this.#notifier.emit("shrink_map");
        });
        this.buttons.push(skipButton);
    }
}

export class UiButton {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    isHovered: boolean;
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
        this.isHovered = false;
        this.onClick = onClick;
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
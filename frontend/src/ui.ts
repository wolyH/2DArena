import type { Notifier } from "./utils.ts";
import type { GameEvent, UIEvent } from "./game.ts";

export class UI {
    buttons: Array<UIButton>;
    #notifier: Notifier<GameEvent & UIEvent>;

    constructor(notifier: Notifier<GameEvent & UIEvent>) {
        this.#notifier = notifier;
        this.buttons = [];
        this.setupStartUI();
    }


    getHoveredButton(x: number, y: number): UIButton | undefined {
        let hoveredButton = undefined;
        for(const button of this.buttons) {
            if (button.isHit(x, y)) {
                hoveredButton = button;
            }
            if(button.isHovered()) {
                button.unhover()
            }
        }
        return hoveredButton;
    }

    setupGameUI () {
        this.buttons = [];
        const dpr = window.devicePixelRatio;
        const width = window.innerWidth * dpr;
        const height = window.innerHeight * dpr;

        this.setupSkipButton(width, height);
        this.setupShrinkButton(width, height);
    }

    setupStartUI () {
        this.buttons = [];
        const dpr = window.devicePixelRatio;
        const width = window.innerWidth * dpr;
        const height = window.innerHeight * dpr;

        this.setupStartButton(width, height);
    }

    setupGameOverUI (message: string) {
        this.buttons = [];
        const dpr = window.devicePixelRatio;
        const width = window.innerWidth * dpr;
        const height = window.innerHeight * dpr;

        this.setupRestartButton(message, width, height);
    }

    private setupStartButton(width: number, height: number) {
        const skipButton = new UIButton(width/4, height/4,  width/2, height/2, "Start Game", () => {
            this.#notifier.emit("start_game");
        });
        this.buttons.push(skipButton);
    }

    private setupRestartButton(message: string, width: number, height: number) {
        const skipButton = new UIButton(width/4, height/4,  width/2, height/2, `${message} rematch?`, () => {
            this.#notifier.emit("start_game");
        });
        this.buttons.push(skipButton);
    }

    private setupSkipButton(width: number, height: number) {
        const skipButton = new UIButton(100, 50,  width * 0.1, height * 0.1, "Skip Turn", () => {
            this.#notifier.emit("turn_skipped");
        });
        this.buttons.push(skipButton);
    }

    private setupShrinkButton(width: number, height: number) {
        const skipButton = new UIButton(100, 200,  width * 0.1, height * 0.1, "Shrink", () => {
            this.#notifier.emit("shrink_map");
        });
        this.buttons.push(skipButton);
    }
}

export class UIButton {
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
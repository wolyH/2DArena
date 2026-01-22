import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Unit, UnitFactory } from "./unit.ts";
import { Hex } from "./hex.ts";
import type { Notifier } from "./utils.ts";
import { UI, UIButton } from "./ui.ts";
import { GameInputHandler, MenuInputHandler } from "./input.ts";
import type { Layout } from "./layout.ts";

type GameState = "START_SCREEN" | "PLAYING" | "GAME_OVER";

export type GameEvent = {
    hex_clicked: (hex: Hex) => void;
    button_clicked: (button: UIButton) => void;
    turn_skipped: () => void;
    shrink_map: () => void;
    map_changed: () => void;
};

export type UIEvent = {
    hex_hovered: (hex: Hex) => void;
    hex_unhovered: () => void;
    button_hovered: (button: UIButton) => void;
    window_resized: (x: number , y:number) => void;
    end_game: (message: string) => void;
    start_game: () => void;
};

interface GameDependencies {
    readonly grid: Grid;
    readonly ui: UI;
    readonly renderer: Renderer;
    readonly layout: Layout;
    readonly notifier: Notifier<GameEvent & UIEvent>;
    readonly unitFactory: UnitFactory;
    readonly inputHandlers: InputHandlers
}

interface InputHandlers {
    readonly gameInputHandler: GameInputHandler;
    readonly menuInputHandler: MenuInputHandler;
}

export class Game {
    #deps: GameDependencies;

    #state: GameState = "START_SCREEN";
    #units: Array<Unit> = [];
    #path: Array<Hex> = [];
    #pathPreview: {goals: Array<Hex>, isTraversable: boolean} = {goals: [], isTraversable: false};  
    #unitIdx: number = 0;
    #turn: number = 1;
    #mapChanged: boolean = true;

    static readonly #CAMERA_SPEED = 10;

    constructor(deps: GameDependencies) {
        this.#deps = deps;
        this.spawnUnits();
    }

    start(): void {
        this.setupEventListeners();
        this.#deps.inputHandlers.menuInputHandler.setupEventListeners();
        this.loop();
    }

    //Main game loop
    private loop = (): void => {
        this.#deps.renderer.clear();
        switch (this.#state) {
            case "START_SCREEN":
                this.drawUI();
                break;
            case "PLAYING":
                this.update();
                this.draw();
                this.drawUI();
                break;
            case "GAME_OVER":
                this.drawUI();
                break;
        }
        requestAnimationFrame(this.loop);
    }

    private setupEventListeners(): void {
        this.#deps.notifier.on("hex_clicked", (hex) => {
            this.startUnitAction(hex);
        });
        
        this.#deps.notifier.on("hex_hovered", (hex) => {
            this.updatePathPreview(hex);
        });

        this.#deps.notifier.on("hex_unhovered", () => {
           this.clearPathPreview();
        });

        this.#deps.notifier.on("turn_skipped", () => {
            this.#unitIdx = this.getNextAliveUnit() ?? this.#unitIdx;
            this.#turn++;
        });

        this.#deps.notifier.on("button_hovered", (button) => {
            button.hover();
            this.clearPathPreview();
        });

        this.#deps.notifier.on("button_clicked", (button) => {
            const currentUnit = this.getCurrentUnit();  
            if (currentUnit.isAlly && currentUnit.is("Idle")) {
                button.trigger();
            }
        });

        this.#deps.notifier.on("window_resized", (x, y) => {
            this.#deps.renderer.resize();
            this.#deps.layout.updateOrigin(x, y);
            if(this.#state === "PLAYING") {
                this.#mapChanged = true;
            }
        });

        this.#deps.notifier.on("shrink_map", () => {
            this.#deps.grid.shrink();
            this.killOORunits();
            this.#mapChanged = true;
        });

        this.#deps.notifier.on("map_changed", () => {
            this.#mapChanged = true;
        });

        this.#deps.notifier.on("end_game", (message) => {
            this.#state = "GAME_OVER";
            this.#deps.inputHandlers.gameInputHandler.removeEventListeners();
            this.#deps.inputHandlers.menuInputHandler.setupEventListeners();
            this.#deps.ui.setupGameOverUI(message);
            this.resetGame();
        });

        this.#deps.notifier.on("start_game", () => {
            this.#state = "PLAYING";
            this.#deps.inputHandlers.menuInputHandler.removeEventListeners();
            this.#deps.inputHandlers.gameInputHandler.setupEventListeners();
            this.#deps.ui.setupGameUI();
        });
    }

    private spawnUnits(): void {
        const hex1 = this.#deps.grid.getHex(Hex.hashCode(-(this.#deps.grid.n-1), 0))!;
        const hex2 = this.#deps.grid.getHex(Hex.hashCode(this.#deps.grid.n-1, 0))!;
        
        const [x1, y1] = this.#deps.layout.hexToWorld(hex1);
        const [x2, y2] = this.#deps.layout.hexToWorld(hex2);
        
        const unit1 = this.#deps.unitFactory.createAlly(hex1, x1, y1);
        const unit2 = this.#deps.unitFactory.createEnemy(hex2, x2, y2);
        this.#units = [unit1, unit2];
    }

    private resetGame(): void {
        this.#turn = 1;
        this.#unitIdx = 0;
        this.#mapChanged = true;
        this.#deps.layout.resetCameraOffset();
        this.#deps.inputHandlers.gameInputHandler.resetCamera()
        this.clearPathPreview();
        this.#path = [];
        this.#deps.grid.resetMap();
        this.spawnUnits();
    }

    private clearPathPreview(): void {
        this.#deps.inputHandlers.gameInputHandler.clearHoverState();
        this.#pathPreview = {goals: [], isTraversable: false};
    }

    private drawUI(): void {
        for(let i = 0 ; i< this.#deps.ui.buttons.length ; i++) {
            this.#deps.renderer.drawButton(this.#deps.ui.buttons[i])
        }
    }

    private draw(): void {
        if (this.#mapChanged) {
            this.#deps.renderer.drawMapCache();
            this.#mapChanged = false;
        }

        this.#deps.renderer.loadMap();

        const currentUnit = this.getCurrentUnit(); 

        for (let i = 0; i < this.#units.length; i++) {
            const unit = this.#units[i]
            if ((unit.isDead) || unit.is("Moving")) {
                continue;
            }
            this.#deps.renderer.drawUnitAura(unit.hex, unit.isAlly, currentUnit.hex.equals(unit.hex));
        }

        this.#deps.renderer.drawPathPreview(this.#pathPreview);

        for (let i = 0; i < this.#units.length; i++) {
            if (this.#units[i].isDead && this.#units[i].is("Idle")) {
                continue;
            }
            this.#deps.renderer.drawUnit(this.#units[i]);
        }
    }

    private update(): void {
        this.updateCamera();

        if(this.#turn % 5 === 0) {
            this.#deps.notifier.emit("shrink_map");
            this.#turn++
        }

        for (let i = 0; i < this.#units.length; i++) {
            this.updateUnit(this.#units[i]);
        }

        this.updateVisibility();

        this.checkEndConditions();
    }

    private updateCamera(): void {
        //take into account the level of zoom
        const cameraSpeed = Game.#CAMERA_SPEED / window.devicePixelRatio;

        const {up, down, left, right} = this.#deps.inputHandlers.gameInputHandler.camera.direction;

        const xorY = Number(up) - Number(down);
        const xorX = Number(left) - Number(right);
        if (xorX === 0 && xorY === 0) {
            return;
        }

        //Normalize so when we move diagonaly it is not faster 
        //(length of the offset vector is always equals to cameraSpeed)
        const length = Math.sqrt(xorX * xorX + xorY * xorY);
        const offsetX = (xorX / length) * cameraSpeed;
        const offsetY = (xorY / length) * cameraSpeed;

        if (this.#deps.layout.updateCameraOffset(offsetX, offsetY)) {
            this.#deps.notifier.emit("map_changed");
        }
    }

    private checkEndConditions(): void {
        const [allies, enemies] = this.getAliveUnits();

        if (allies === 0) {
            this.#deps.notifier.emit("end_game", "Defeat!");
        } 
        else if (enemies === 0) {
            this.#deps.notifier.emit("end_game", "Victory!");
        }
    }

    private getAliveUnits(): [number, number] {
        let allies = 0;
        let enemies = 0;
        for (let i = 0; i < this.#units.length; i++) {
            const unit = this.#units[i]
            if (!(unit.isDead && unit.is("Idle")) && unit.isAlly) {
                allies++;
            }
            if (!(unit.isDead && unit.is("Idle")) && !unit.isAlly) {
               enemies++
            }
        }
        return [allies, enemies];
    }

    private updateUnit(unit: Unit): void {   
        if(unit.isDead && unit.is("Idle")) {
            return;
        }
        if (unit.is("Moving") && this.#path.length === 0) {
            unit.idle();
        }
        if(unit.is("Moving") && this.#path.length > 0) {
            this.moveUnitTowardGoal(unit);
        }

        unit.updateVisual();
    }

    private moveUnitTowardGoal(unit: Unit): void {
        const [goalX, goalY] = this.#deps.layout.hexToWorld(this.#path[0]);
        const dx = goalX - unit.x;
        const dy = goalY - unit.y;  

        this.updateUnitDirection(unit, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        //If the unit is close enough to the goal
        if (distance < unit.speed) {
            this.#path.shift();
            unit.x = goalX;
            unit.y = goalY;
        }
        else {
            //Normalize so when we move diagonaly it is not faster 
            //(length of the delta vector is always equals to speed)
            unit.x += (dx / distance) * unit.speed;
            unit.y += (dy / distance) * unit.speed;
        }
        this.updateUnitHex(unit);
    }

    private updateUnitDirection(unit: Unit, dx: number): void {
        if (dx > 0) {
            unit.turnRight();
        }
        else if (dx < 0) {
            unit.turnLeft();
        }
    }

    private updateUnitHex(unit: Unit): void {
        const [q,r,_] = this.#deps.layout.worldToHex({x: unit.x, y: unit.y});
        const AdjacentHex = this.#deps.grid.getHex(Hex.hashCode(q, r));

        if (!AdjacentHex) {
            throw new Error("unit not on grid");
        }
        if (!unit.hex.equals(AdjacentHex)) {
            unit.setHex(AdjacentHex);
        }
    }
    
    private updateVisibility(): void {
        const fov: Set<string> = new Set();
        let fovChanged = false

        for (let i = 0; i < this.#units.length; i++) {
            if (this.#units[i].isDead) {
                continue;
            }
            for (const h of this.#deps.grid.getFov(this.#units[i].hex)) {
                fov.add(h);
            }
        }
        
        for (const hex of this.#deps.grid.getMap().values()) {
            if(fov.has(hex.hashCode)) {
                if (!hex.isVisible) {
                    fovChanged = true;
                }
                hex.setVisibility(true);
            }
            else {
                if (hex.isVisible) {
                    fovChanged = true;
                }
                hex.setVisibility(false);
            }
        }

        if (fovChanged) {
            this.#mapChanged = true;
        }
    }

    private getNextAliveUnit(): number | undefined {
        for (let i = 1 ; i < this.#units.length ; i++) {
            const nextTurn = (this.#unitIdx + i) % this.#units.length;

            if (!this.#units[nextTurn].isDead) {
                return nextTurn;
            }
        }
        return undefined;
    }

    //Kill units that are out of the map (eg. after shrinking)
    private killOORunits(): void {
        for (let i = 0 ; i < this.#units.length ; i++) {
            if (!this.#units[i].isDead && !this.#deps.grid.hasHex(this.#units[i].hex.hashCode)) {
                this.#units[i].die();
            }
        }
        this.updateCurrentUnit();
    }

    private getCurrentUnit(): Unit {
        return this.#units[this.#unitIdx];
    }

    private updateCurrentUnit(): void {
        if (this.#units[this.#unitIdx].isDead) {
            this.#deps.notifier.emit("turn_skipped");
        }
    }

    private startUnitAction(hex: Hex): void {
        const currentUnit = this.getCurrentUnit();  

        if (!this.canUnitActOnHex(currentUnit, hex)) {
            return;
        }

        if (hex.isNeighbor(currentUnit.hex) && (hex.unit && !hex.unit.isAlly)) {
            const dx = hex.unit.x - currentUnit.x;
            this.updateUnitDirection(currentUnit, dx);
            currentUnit.strike();
            hex.unit.die();
            return;
        }
        
        const path = this.#deps.grid.searchPath(currentUnit.hex, hex);
        if (path.length > 1) {
            this.#path = path;
            currentUnit.move();
            this.clearPathPreview();
        }
    }

    private updatePathPreview(hex: Hex): void {
        const currentUnit = this.getCurrentUnit();
        this.clearPathPreview();

        if (!this.canUnitActOnHex(currentUnit, hex)) {
            return;
        }

        const traversableGoals = this.#deps.grid.searchPath(currentUnit.hex, hex);
        if (traversableGoals.length > 1) {
            this.#pathPreview = {goals: traversableGoals, isTraversable: true};
            return;
        }

        const nonTraversableGoals = this.#deps.grid.searchPath(currentUnit.hex, hex, false);
        if (nonTraversableGoals.length > 1) {
            this.#pathPreview = {goals: nonTraversableGoals, isTraversable: false};
        }
    }

    private canUnitActOnHex(unit: Unit, hex: Hex): boolean {
        if (!unit.is("Idle") || !unit.isAlly) {
            return false;
        }
        if ((hex.unit && hex.unit.isAlly) || hex.isObstacle) {
            return false;
        }
        return true;
    }
}
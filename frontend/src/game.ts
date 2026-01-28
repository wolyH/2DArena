import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Unit, UnitFactory } from "./unit.ts";
import { Hex } from "./hex.ts";
import type { Notifier } from "./utils.ts";
import { UiButton } from "./ui/UiButton.ts";
import { GameInputHandler } from './inputs/GameInputHandler.ts';
import { MenuInputHandler } from './inputs/MenuInputHandler.ts';
import type { Layout } from "./layout.ts";
import type { UiManager } from "./ui/UiManager.ts";
import type { AuthHandler } from "./handlers/AuthHandler.ts";
import type { RoomHandler } from "./handlers/RoomHandler.ts";
import type { RoomResponse } from "./dto/RoomResponse.ts";

export type AllEvents = GameEvent & InputEvent & MenuEvent & ServerUpdateEvent;

export type ServerUpdateEvent = {
    server_update: (body: any) => void;

    player_joined_room: (username: string) => void;
    player_left_room: () => void;
};

export type InputEvent = {
    hex_clicked: (hex: Hex) => void;
    hex_hovered: (hex: Hex) => void;
    hex_unhovered: () => void;
    button_clicked: (button: UiButton) => void;
    button_hovered: (button: UiButton) => void;

    camera_key_changed: (direction: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => void;

    window_resized: (x: number , y: number) => void;
};

export type GameEvent = {
    skip_turn_requested: () => void;
};

export type MenuEvent = {
    login_requested: (username: string) => void;
    login_completed: (username: string, token: string) => void;
    connected: () => void;

    create_room_requested: () => void;
    room_created: (roomId: string) => void;

    browse_rooms_requested: () => void;
    rooms_list_received: (rooms: Array<RoomResponse>) => void;
    refresh_rooms_requested: () => void;
    cancel_browsing: () => void;

    join_room_requested: (roomId: string) => void;
    room_joined: (roomId: string, opponent: string) => void;

    leave_room_requested: () => void;
    room_left: () => void;

    start_game_requested: () => void;
    game_started: (username: string) => void;
};

interface GameDependencies {
    readonly grid: Grid;
    readonly uiManager: UiManager;
    readonly renderer: Renderer;
    readonly layout: Layout;
    readonly notifier: Notifier<AllEvents>;
    readonly unitFactory: UnitFactory;
    readonly inputHandlers: InputHandlers;
    readonly authHandler: AuthHandler;
    readonly roomHandler: RoomHandler
}

interface InputHandlers {
    readonly gameInputHandler: GameInputHandler;
    readonly menuInputHandler: MenuInputHandler;
}

export class Game {
    #deps: GameDependencies;

    #username: string | undefined = undefined;
    #room : {roomId: string | undefined, opponent: string | undefined} = {roomId: undefined, opponent: undefined};
    #serverUpdateQueue: Array<any> = [];

    #camera = {up: false, down: false, left: false, right: false};
    #units: Array<Unit> = [];
    #path: Array<Hex> = [];
    #pathPreview: {goals: Array<Hex>, isTraversable: boolean} = {goals: [], isTraversable: false};
    #fovSet: Set<string> = new Set();
    #unitIdx: number = 0;

    #mapInvalidated: boolean = true;
    #fovInvalidated: boolean = true;

    #lastTime: number = 0;

    static readonly #CAMERA_SPEED = 1000;

    constructor(deps: GameDependencies) {
        this.#deps = deps;
        this.spawnUnits();
    }

    start(): void {
        this.setupServerUpdateEventListenners();
        this.setupInputEventListenners();
        this.setupGameEventListenners();
        this.setupMenuEventListenners();
        this.#deps.inputHandlers.menuInputHandler.setupEventListeners();
        this.loop();
    }

    //Main game loop
    private loop = (currentTime: number = 0): void => {
        const delta = (currentTime - this.#lastTime) / 1000;
        this.#lastTime = currentTime;

        this.#deps.renderer.clear();
        switch (this.#deps.uiManager.state) {
            case "MENU":
                this.updateMenu();
                this.drawUi();
                break;
            case "GAME":
                this.updateGame(delta);
                this.drawGame();
                this.drawUi();
                break;
        }
        requestAnimationFrame(this.loop);
    }

    private setupServerUpdateEventListenners(): void {
        this.#deps.notifier.on("server_update", (body) => {
            console.log("received update from server");
            this.#serverUpdateQueue.push(body);
        });

        this.#deps.notifier.on("player_joined_room", (username) => {
            this.#room.opponent = username;
            this.#deps.uiManager.showRoom(true, this.#username!, this.#room.opponent);
        });

        this.#deps.notifier.on("player_left_room", () => {
            this.#room.opponent = undefined;
            this.#deps.uiManager.showRoom(true, this.#username!, undefined);
        });
    }

    private setupInputEventListenners(): void {
        this.#deps.notifier.on("hex_clicked", (hex) => {
            this.startUnitAction(hex);
        });
        
        this.#deps.notifier.on("hex_hovered", (hex) => {
            this.updatePathPreview(hex);
        });

        this.#deps.notifier.on("hex_unhovered", () => {
           this.clearPathPreview();
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

        this.#deps.notifier.on("camera_key_changed", (direction, isPressed) => { 
            if (direction in this.#camera) {
                this.#camera[direction] = isPressed;
            }
        });

        this.#deps.notifier.on("window_resized", (x, y) => {
            this.#deps.renderer.resize();
            this.#deps.layout.updateOrigin(x, y);
            if(this.#deps.uiManager.state === "GAME") {
                this.#mapInvalidated = true;
            }
        });
    }

    private setupGameEventListenners(): void {}

    private setupMenuEventListenners(): void {
        this.#deps.notifier.on("login_requested", (username) => {
            this.#deps.authHandler.login(username);
        });

        this.#deps.notifier.on("login_completed", (username, token) => {
            this.#username = username;
            this.#deps.roomHandler.setClient(token);
        });

        this.#deps.notifier.on("connected", () => {
            this.#deps.uiManager.showStart();
        })

        this.#deps.notifier.on("create_room_requested", () => {
            this.#deps.roomHandler.createRoom();
        });

        this.#deps.notifier.on("room_created", (roomId) => {
            this.#room.roomId = roomId;
            this.#deps.uiManager.showRoom(true, this.#username!, undefined);
        });

        this.#deps.notifier.on("browse_rooms_requested", () => {
            this.#deps.roomHandler.startBrowsing();
        });

        this.#deps.notifier.on("rooms_list_received", (rooms) => {
            this.#deps.uiManager.showBrowser(rooms);
        });

        this.#deps.notifier.on("refresh_rooms_requested", () => {
            this.#deps.roomHandler.startBrowsing();
        });

        this.#deps.notifier.on("cancel_browsing", () => {
            this.#deps.uiManager.showStart();
        });

        this.#deps.notifier.on("join_room_requested", (roomId) => {
            this.#deps.roomHandler.joinRoom(roomId);
        });

        this.#deps.notifier.on("room_joined", (roomId, opponent) => {
            this.#room.roomId = roomId;
            this.#room.opponent = opponent;
            this.#deps.uiManager.showRoom(false, this.#username!, opponent);
        });

        this.#deps.notifier.on("leave_room_requested", () => {
            this.#deps.roomHandler.leaveRoom(this.#room.roomId!);
        });

        this.#deps.notifier.on("room_left", () => {
            this.#room.roomId = undefined;
            this.#room.opponent = undefined;
            this.#deps.uiManager.showStart();
        });

        this.#deps.notifier.on("start_game_requested", () => {
            this.#deps.roomHandler.startGame(this.#room.roomId!);
        });

        this.#deps.notifier.on("game_started", (username) => {
            this.#deps.inputHandlers.menuInputHandler.removeEventListeners();
            this.#deps.inputHandlers.gameInputHandler.setupEventListeners();
            this.#deps.uiManager.showGame();
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
        this.#unitIdx = 0;
        this.#mapInvalidated = true;
        this.#deps.layout.resetCameraOffset();
        this.resetCamera()
        this.clearPathPreview();
        this.#path = [];
        this.#deps.grid.resetMap();
        this.spawnUnits();
    }

    private resetCamera(): void {
        this.#camera.up = false;
        this.#camera.down = false;
        this.#camera.left = false;
        this.#camera.right = false;
    }

    private clearPathPreview(): void {
        this.#deps.inputHandlers.gameInputHandler.clearHoverState();
        this.#pathPreview = {goals: [], isTraversable: false};
    }

    private updateMenu(): void {
        if(this.#serverUpdateQueue.length > 0) {
            const update = this.#serverUpdateQueue.shift();
            this.processServerUpdate(update);
        }
    }

    private processServerUpdate(update: any): void {
        if (!update.type) {
            throw new Error("client receivend a server update with no type");
        }
        
        switch (update.type) {
            case "PLAYER_JOINED":
                if(update.data.roomId === this.#room.roomId) {
                    this.#deps.notifier.emit("player_joined_room", update.data.username);
                }
                break;
            case "ROOM_DELETED":
                if (update.data.roomId === this.#room.roomId){
                    this.#deps.notifier.emit("room_left");
                }
                break;
            case "PLAYER_LEFT":
                if (update.data.roomId === this.#room.roomId && update.data.username === this.#room.opponent) {
                    this.#deps.notifier.emit("player_left_room")
                }
                break; 
            case "GAME_STARTED":
                if(update.data.turn) {
                   this.#deps.notifier.emit("game_started", update.data.turn);
                }
                break;
        }
    }

    private updateGame(delta: number): void {
        this.updateCamera(delta);

        for (let i = 0; i < this.#units.length; i++) {
            this.updateUnit(this.#units[i], delta);
        }
        if (this.#fovInvalidated) {
            this.updateVisibility();
            this.#fovInvalidated = false;
        }
    }

    private updateCamera(delta: number): void {
        //take into account the level of zoom
        const cameraSpeed = (Game.#CAMERA_SPEED / window.devicePixelRatio) * delta;

        const {up, down, left, right} = this.#camera;

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
            this.#mapInvalidated = true
        }
    }

    private updateUnit(unit: Unit, delta: number): void {   
        if(unit.isDead && unit.is("Idle")) {
            return;
        }
        if (unit.is("Moving") && this.#path.length === 0) {
            unit.idle();
        }
        if(unit.is("Moving") && this.#path.length > 0) {
            this.moveUnitTowardGoal(unit, delta);
        }

        unit.update();
    }

    private moveUnitTowardGoal(unit: Unit, delta: number): void {
        const [goalX, goalY] = this.#deps.layout.hexToWorld(this.#path[0]);
        const dx = goalX - unit.x;
        const dy = goalY - unit.y;  

        this.updateUnitDirection(unit, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < unit.speed * delta) {
            this.#path.shift();
            unit.x = goalX;
            unit.y = goalY;
        }
        else {
            unit.x += (dx / distance) * unit.speed * delta;
            unit.y += (dy / distance) * unit.speed * delta;
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
            this.#fovInvalidated  = true;
            unit.setHex(AdjacentHex);
        }
    }
    
    private updateVisibility(): void {
        this.#fovSet.clear();
        let fovChanged = false

        for (let i = 0; i < this.#units.length; i++) {
            if (this.#units[i].isDead) {
                continue;
            }
            for (const h of this.#deps.grid.getFov(this.#units[i].hex)) {
                this.#fovSet.add(h);
            }
        }
        
        for (const hex of this.#deps.grid.getMap().values()) {
            if(this.#fovSet.has(hex.hashCode)) {
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
            this.#mapInvalidated = true;
        }
    }

    private getCurrentUnit(): Unit {
        return this.#units[this.#unitIdx];
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

    private drawUi(): void {
        for(let i = 0 ; i< this.#deps.uiManager.buttons.length ; i++) {
            this.#deps.renderer.drawButton(this.#deps.uiManager.buttons[i])
        }
        for(let i = 0 ; i< this.#deps.uiManager.texts.length ; i++) {
            this.#deps.renderer.drawText(this.#deps.uiManager.texts[i])
        }
    }

    private drawGame(): void {
        if (this.#mapInvalidated) {
            this.#deps.renderer.drawMapCache();
            this.#mapInvalidated = false;
        }

        this.#deps.renderer.loadMap();

        const currentUnit = this.getCurrentUnit(); 

        this.#deps.renderer.drawPathPreview(this.#pathPreview);

        for (let i = 0; i < this.#units.length; i++) {
            const unit = this.#units[i]
            if (!((unit.isDead) || unit.is("Moving"))) {
                this.#deps.renderer.drawUnitAura(unit.hex, unit.isAlly, currentUnit.hex.equals(unit.hex));
            }
            if (!(unit.isDead && unit.is("Idle"))) {
                this.#deps.renderer.drawUnit(unit);
            }
        }
    }
}
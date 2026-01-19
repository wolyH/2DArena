import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Player } from "./player.ts";
import { Hex } from "./hex.ts";
import type { Notifier } from "./utils.ts";
import { Ui, UiButton } from "./ui.ts";

export type GameEvent = {
    hex_clicked: (hex: Hex) => void;
    button_clicked: (button: UiButton) => void;
    turn_skipped: () => void;
    shrink_map: () => void;
};

export type UiEvent = {
    hex_hovered: (hex: Hex) => void;
    button_hovered: (button: UiButton) => void;
};

export class Game {
    readonly #players: Array<Player>;
    readonly #grid: Grid;
    readonly #path: {goals: Array<Hex>, preview: {goals: Array<Hex>, isTraversable: boolean}};
    readonly #ui: Ui;
    readonly #renderer: Renderer;
    readonly #notifier: Notifier<GameEvent & UiEvent>
    readonly #camera = {direction: {up: false, down: false, left: false, right: false}, offset: {x:0, y:0}};
        
    #playerIdx: number;
    #turn: number;
    #lastPreviewHex?: string;
    #mapChanged: boolean;

    constructor(players: Array<Player>, grid: Grid, renderer: Renderer, notifier: Notifier<GameEvent & UiEvent>) {
        this.#players = players,
        this.#grid = grid,
        this.#path = {goals: [], preview: {goals: [], isTraversable: false}};
        this.#ui = new Ui(notifier);
        this.#renderer = renderer;
        this.#notifier = notifier;
        this.#playerIdx = 0;
        this.#turn = 1;
        this.#mapChanged = true;
    }

    start(): void {
        this.setupEventListeners();
        this.loop();
    }

    //Main game loop
    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    private setupEventListeners(): void {
        this.#notifier.on("hex_clicked", (hex) => {
            this.startPlayerAction(hex);
        });
        
        this.#notifier.on("hex_hovered", (hex) => {
            this.showPathPreview(hex);
        });

        this.#notifier.on("turn_skipped", () => {
            this.#playerIdx = this.getNextAlivePlayer() ?? this.#playerIdx;
            this.#turn++;
        });

        this.#notifier.on("button_hovered", (button) => {
            button.isHovered = true;
        });

        this.#notifier.on("button_clicked", (button) => {
            const currentPlayer = this.getCurrentPlayer();  
            if (currentPlayer.isAlly && currentPlayer.is("Idle")) {
                button.trigger();
            }
        });

        this.#notifier.on("shrink_map", () => {
            this.#grid.shrink();
            this.killOORPlayers();
            this.#mapChanged = true;
        });

        window.addEventListener('resize', () => {
            this.resize();
            this.#mapChanged = true;
        });
        window.addEventListener('click', (event) => this.handleMouseClick(event));
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
        //window.addEventListener('error', (error) => {console.error(error.message, error.error);});
    }

    private draw(): void {
        this.#renderer.clearGameCanvas();
        
        if (this.#mapChanged) {
            this.#renderer.drawMapCache(this.#grid.map);
            this.#mapChanged = false;
        }

        this.#renderer.loadMap();

        const currentPlayer = this.getCurrentPlayer(); 

        for (let i = 0; i < this.#players.length; i++) {
            const player = this.#players[i]
            if ((player.isDead) || player.is("Moving")) {
                continue;
            }
            this.#renderer.drawPlayerAura(player.hex, player.isAlly, currentPlayer.hex.equals(player.hex));
        }

        this.#renderer.drawPathPreview(this.#path.preview);

        for (let i = 0; i < this.#players.length; i++) {
            if (this.#players[i].isDead && this.#players[i].deathAnimationOver) {
                continue;
            }
            this.#renderer.drawPlayer(this.#players[i]);
        }

        this.#ui.buttons.forEach(btn => this.#renderer.drawButton(btn));
    }

    private update(): void {
        this.updateCamera();
        if(this.#turn % 5 === 0) {
            this.#notifier.emit("shrink_map");
            this.#turn++
        }

        for (let i = 0; i < this.#players.length; i++) {
            this.updatePlayer(this.#players[i]);
        }

        this.updateVisibility();
    }

    private updateCamera(): void {
        const cameraSpeed = 10 / window.devicePixelRatio;
        const {up, down, left, right} = this.#camera.direction;

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

        this.#camera.offset.x += offsetX;
        this.#camera.offset.y += offsetY;

        this.#renderer.layout.origin.x += offsetX;
        this.#renderer.layout.origin.y += offsetY;
        
        for (let i = 0 ; i < this.#players.length ; i++) {
            this.#players[i].x += offsetX;
            this.#players[i].y += offsetY;
        }

        this.#mapChanged = true;
    }

    private updatePlayer(player: Player): void {
        if(player.is("Dying") && player.deathAnimationOver) {
            return;
        }
        if (player.is("Moving") && this.#path.goals.length === 0) {
            player.idle();
        }
        if(player.is("Moving") && this.#path.goals.length > 0) {
            this.movePlayerTowardGoal(player);
        }

        player.updateVisual();
    }

    private movePlayerTowardGoal(player: Player) {
        const [goalX, goalY] = this.#renderer.layout.hexToPixel(this.#path.goals[0]);
        const dx = goalX - player.x;
        const dy = goalY - player.y;

        this.updatePlayerDirection(player, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        //If the player is close enough to the goal
        if (distance < player.speed) {
            this.#path.goals.shift();
            player.x = goalX;
            player.y = goalY;
        }
        else {
            //Normalize so when we move diagonaly it is not faster 
            //(length of the delta vector is always equals to speed)
            player.x += (dx / distance) * player.speed;
            player.y += (dy / distance) * player.speed;
        }
        this.UpdatePlayerHex(player);
    }

    private updatePlayerDirection(player: Player, dx: number): void {
        if (dx > 0) {
            player.turnRight();
        }
        else if (dx < 0) {
            player.turnLeft();
        }
    }

    private UpdatePlayerHex(player: Player): void {
        const [q,r,_] = this.#renderer.layout.pixelToHex({x: player.x, y: player.y});
        const AdjacentHex = this.#grid.map.get(Hex.hashCode(q, r));

        if (!AdjacentHex) {
            throw new Error("player not on grid");
        }
        if (!player.hex.equals(AdjacentHex)) {
            player.setHex(AdjacentHex);
        }
    }
    
    private updateVisibility(): void {
        const fov: Set<string> = new Set();
        let fovChanged = false

        for (let i = 0; i < this.#players.length; i++) {
            if (this.#players[i].isDead) {
                continue;
            }
            for (const h of this.#grid.getFov(this.#players[i].hex)) {
                fov.add(h);
            }
        }
        
        for (const hex of this.#grid.map.values()) {
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

    private getNextAlivePlayer(): number | undefined {
        for (let i = 1 ; i < this.#players.length ; i++) {
            const nextTurn = (this.#playerIdx + i) % this.#players.length;

            if (!this.#players[nextTurn].isDead) {
                return nextTurn;
            }
        }
        return undefined;
    }

    //Kill players that are out of the map (eg. after shrinking)
    private killOORPlayers() {
        for (let i = 0 ; i < this.#players.length ; i++) {
            if (!this.#players[i].isDead && !this.#grid.map.has(this.#players[i].hex.hashCode)) {
                this.#players[i].die();
            }
        }
        this.updateCurrentPlayer();
    }

    private getCurrentPlayer(): Player {
        return this.#players[this.#playerIdx];
    }

    private updateCurrentPlayer(): void {
            if (this.#players[this.#playerIdx].isDead) {
            this.#notifier.emit("turn_skipped");
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        const button = this.getButtonFromEvent(event);
        
        if (button) {
            this.#notifier.emit("button_hovered", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (!hex) {
            this.clearPathPreview();
            return;
        }

        if (this.#lastPreviewHex === hex.hashCode) {
            return;
        }

        this.#lastPreviewHex = hex.hashCode;
        this.#notifier.emit("hex_hovered", hex);
    }

    private handleMouseClick(event: MouseEvent): void {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.#notifier.emit("button_clicked", button);
            return;
        }

        const hex = this.getHexFromEvent(event);
        if (hex && hex.isVisible) {
            this.#notifier.emit("hex_clicked", hex);
        }
    }

    private getHexFromEvent(event: MouseEvent): Hex | undefined {
        const rect = this.#renderer.gameCanvas.getBoundingClientRect();

        const [q,r,_] = this.#renderer.layout.pixelToHex({
                x: event.clientX - rect.left, 
                y: event.clientY - rect.top
            });

        return this.#grid.map.get(Hex.hashCode(q,r));
    }

    private getButtonFromEvent(event: MouseEvent): UiButton | undefined {
        let hoveredButton = undefined;

        const rect = this.#renderer.gameCanvas.getBoundingClientRect();

        const x = (event.clientX - rect.left) * window.devicePixelRatio;
        const y = (event.clientY - rect.top) * window.devicePixelRatio;

        for(const button of this.#ui.buttons) {
            if (button.isHit(x, y)) {
                hoveredButton = button;
            }
            button.isHovered = false;
        }
        return hoveredButton;
    }

    private startPlayerAction(hex: Hex): void {
        const currentPlayer = this.getCurrentPlayer();  

        if (!this.canPlayerActOnHex(currentPlayer, hex)) {
            return;
        }

        if (hex.isNeighbor(currentPlayer.hex) && (hex.player && !hex.player.isAlly)) {
            currentPlayer.strike();
            hex.player.die();
            return;
        }
        
        const goals = this.#grid.searchPath(currentPlayer.hex, hex);
        if (goals.length > 1) {
            this.#path.goals = goals;
            currentPlayer.move();
            this.clearPathPreview();
        }
    }

    private showPathPreview(hex: Hex): void {
        this.clearPathPreview();
        const currentPlayer = this.getCurrentPlayer();

        if (!this.canPlayerActOnHex(currentPlayer, hex)) {
            return;
        }

        const traversableGoals = this.#grid.searchPath(currentPlayer.hex, hex);
        if (traversableGoals.length > 1) {
            this.#path.preview = {goals: traversableGoals, isTraversable: true};
            return;
        }

        const nonTraversableGoals = this.#grid.searchPath(currentPlayer.hex, hex, false);
        if (nonTraversableGoals.length > 1) {
            this.#path.preview = {goals: nonTraversableGoals, isTraversable: false};
        }
    }

    private clearPathPreview(): void {
        this.#lastPreviewHex = undefined;
        this.#path.preview = { goals: [], isTraversable: false };
    }

    private canPlayerActOnHex(player: Player, hex: Hex): boolean {
        if (!player.is("Idle") || !player.isAlly) {
            return false;
        }
        if ((hex.player && hex.player.isAlly) || hex.isObstacle) {
            return false;
        }
        return true;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key === 'w') {
            this.#camera.direction.up = true;
        }
        if (key === 's') {
            this.#camera.direction.down = true;
        }
        if (key === 'a') {
            this.#camera.direction.left = true;
        }
        if (key === 'd') {
            this.#camera.direction.right = true;
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key === 'w') {
            this.#camera.direction.up = false;
        }
        if (key === 's') {
            this.#camera.direction.down = false;
        }
        if (key === 'a') {
            this.#camera.direction.left = false;
        }
        if (key === 'd') {
            this.#camera.direction.right = false;
        }
    }

    private resize(): void {
        this.#renderer.resize();

        const width = window.innerWidth;
        const height = window.innerHeight;

        //Using the diff between the old/new origin of the canvas 
        //to calculate the new position of the players on the screen
        const newOriginX = width / 2 + this.#camera.offset.x;
        const newOriginY = height / 2 + this.#camera.offset.y;

        for (let i = 0 ; i < this.#players.length ; i++) {
            this.#players[i].x += newOriginX - this.#renderer.layout.origin.x;
            this.#players[i].y += newOriginY - this.#renderer.layout.origin.y;
        } 

        this.#renderer.layout.origin = {x: newOriginX, y: newOriginY};
    }
}
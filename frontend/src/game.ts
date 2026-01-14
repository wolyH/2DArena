import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Player } from "./player.ts";
import { Hex } from "./hex.ts";
import type { Notifier } from "./utils.ts";
import { Ui, UiButton } from "./ui.ts";

export type GameEvent = {
    hex_hovered: (hex: Hex) => void;
    hex_clicked: (hex: Hex) => void;
    button_hovered: (button: UiButton) => void;
    button_clicked: (button: UiButton) => void;
    turn_skipped: () => void;
    shrink_map: () => void;
};

export class Game {
    players: Array<Player>;
    turn: number;
    grid: Grid;
    path: {goals: Array<Hex>, preview: {goals: Array<Hex>, isTraversable: boolean}};
    ui: Ui;
    renderer: Renderer;
    notifier: Notifier<GameEvent>
    camera = {direction: {up: false, down: false, left: false, right: false}, offset: {x:0, y:0}};

    constructor(players: Array<Player>, grid: Grid, renderer: Renderer, notifier: Notifier<GameEvent>) {
        this.players = players,
        this.grid = grid,
        this.path = {goals: [], preview: {goals: [], isTraversable: false}};
        this.ui = new Ui(notifier);
        this.renderer = renderer;
        this.notifier = notifier;
        this.turn = 0;
    }

    start(): void {
        this.setupEventListeners();
        
        // Start the main game loop
        this.loop();
    }

    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    private update(): void {
        this.moveCamera();
        this.players.forEach((player) => this.updatePlayer(player));
        this.updateVisibility();
        this.updateTerrain();
    }

    private draw(): void {
        this.renderer.clear();
        this.renderer.drawMap(this.grid.map);
        this.renderer.drawPathPreview(this.path.preview)
        this.players.forEach((player) => {this.renderer.drawPlayer(player);})
        this.ui.buttons.forEach(btn => this.renderer.drawButton(btn));
    }

    private setupEventListeners(): void {
        this.notifier.on("hex_clicked", (hex) => {
            this.startPlayerAction(hex)
        });
        
        this.notifier.on("hex_hovered", (hex) => {
            this.showPathPreview(hex);
        });

        this.notifier.on("turn_skipped", () => {
            this.turn++;
        });

        this.notifier.on("button_hovered", (button) => {
            button.isHovered = true;
        });

        this.notifier.on("button_clicked", (button) => {
            const currentPlayer = this.players[this.turn % this.players.length];  
            if (currentPlayer.isLocal && currentPlayer.is("Idle")) {
                button.trigger();
            }
        });

        this.notifier.on("shrink_map", () => {
            this.grid.shrink();
        });

        window.addEventListener('resize', () => this.resize()); 
        window.addEventListener('click', (event) => this.handleMouseClick(event));
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
    }

    private updatePlayer(player: Player): void {
        if (player.is("Moving") && this.path.goals.length === 0) {
            player.idle()
        }
        if(player.is("Moving") && this.path.goals.length > 0) {
            const goal = this.renderer.layout.hexToPixel(this.path.goals[0]);
            const dx = goal.x - player.x;
            const dy = goal.y - player.y;

            if (dx > 0) {
                player.turnRight();
            }
            else if (dx < 0) {
                player.turnLeft();
            }

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.speed) {
                this.path.goals.shift();
                player.x = goal.x
                player.y = goal.y
                return;
            }
            const vx = (dx / distance) * player.speed;
            const vy = (dy / distance) * player.speed;
            player.x += vx;
            player.y += vy;

            const [q,r,s] = this.renderer.layout.pixelToHex({x: player.x, y: player.y});
            player.setHexCoordinate(q, r, s);
        }

        player.updateVisual();
    }

    private updateVisibility(): void {
        const fov: Array<string> = [];

        this.players.forEach((player) => {
            const playerHex = this.grid.map.get(Hex.hashCode(player.q, player.r));
            if(!playerHex) {
                throw new Error("player not on grid");
            }
            fov.push(...this.grid.getFOV(playerHex));
        })
        
        for (const hex of this.grid.map.values()) {
            if(fov.includes(hex.hashCode())) {
                hex.setVisibility(true);
            }
            else {
                hex.setVisibility(false);
            }
        }
    }

    private updateTerrain() {
        const playerHexes: Array<string> = []

        this.players.forEach((player) => {
            playerHexes.push(Hex.hashCode(player.q, player.r));
        })

        for (const hex of this.grid.map.values()) {
            if (playerHexes.includes(hex.hashCode())) {
                hex.hasPlayer = true;
            }
            else {
                hex.hasPlayer = false;
            }
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        const button = this.getButtonFromEvent(event)

        if (button) {
            this.notifier.emit("button_hovered", button);
            return;
        }
        const hex = this.getHexFromEvent(event);
        if (hex) {
            this.notifier.emit("hex_hovered", hex);
        }
    }

    private getHexFromEvent(event: MouseEvent): Hex | undefined {
        const rect = this.renderer.canvas.getBoundingClientRect();

        const [q,r,_] = this.renderer.layout.pixelToHex({
                x: event.clientX - rect.left, 
                y: event.clientY - rect.top
            });

        return this.grid.map.get(Hex.hashCode(q,r));
    }

    public getButtonFromEvent(event: MouseEvent): UiButton | null {
        let hoveredButton = null;
        const rect = this.renderer.canvas.getBoundingClientRect();

        const x = (event.clientX - rect.left) * window.devicePixelRatio;
        const y = (event.clientY - rect.top) * window.devicePixelRatio;
   
        for(const button of this.ui.buttons) {
            if (button.isHit(x, y)) {
                hoveredButton = button
            }
            button.isHovered = false;
        }
        return hoveredButton;
    }

    private handleMouseClick(event: MouseEvent): void {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.notifier.emit("button_clicked", button);
            return;
        }
        const hex = this.getHexFromEvent(event);
    
        if (hex && hex.isVisible && !hex.isObstacle) {
            this.notifier.emit("hex_clicked", hex);
        }
    }

    private startPlayerAction(hex: Hex): void {
        const currentPlayer = this.players[this.turn % this.players.length];  
        if(!currentPlayer.is("Idle") || !currentPlayer.isLocal) {
            return;
        }
        
        if(this.grid.map.has(hex.hashCode())) {
            const playerHex = this.grid.map.get(Hex.hashCode(currentPlayer.q, currentPlayer.r))

            if(!playerHex) throw new Error("player not on grid");

            const goals = this.grid.searchPath(playerHex, hex);
            if(goals.length > 1) {
                this.path.goals = goals;
                currentPlayer.move();
                this.path.preview = {goals: [], isTraversable: false};
            }
        }
    }

    private showPathPreview(hex: Hex): void {
         const currentPlayer = this.players[this.turn % this.players.length];
         if(!currentPlayer.is("Idle") || !currentPlayer.isLocal || currentPlayer.isAt(hex)) {
            this.path.preview = {goals: [], isTraversable: false};
            return;
        }

        this.path.preview = {goals: [], isTraversable: false};

        const playerHex = this.grid.map.get(Hex.hashCode(currentPlayer.q, currentPlayer.r))

        if(!playerHex) throw new Error("player not on grid");

        let goals = this.grid.searchPath(playerHex, hex);
        if (goals.length > 1) {
            this.path.preview = {goals: goals, isTraversable: true};
            return;
        }

        goals = this.grid.searchPath(playerHex, hex, false);
        if (goals) {
            this.path.preview = {goals: goals, isTraversable: false};
        }
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key === 'w') this.camera.direction.up = true;
        if (key === 's') this.camera.direction.down = true;
        if (key === 'a') this.camera.direction.left = true;
        if (key === 'd') this.camera.direction.right = true;
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        
        if (key === 'w') this.camera.direction.up = false;
        if (key === 's') this.camera.direction.down = false;
        if (key === 'a') this.camera.direction.left = false;
        if (key === 'd') this.camera.direction.right = false;
    }

    private moveCamera(): void {
        const offsetVector = {x: 0, y: 0};
        const cameraSpeed = 10 / window.devicePixelRatio;

        if (this.camera.direction.left !== this.camera.direction.right) {
            if (this.camera.direction.left) offsetVector.x = cameraSpeed;
            if (this.camera.direction.right) offsetVector.x = -cameraSpeed;
        }
        if (this.camera.direction.up !== this.camera.direction.down) {
            if (this.camera.direction.down) offsetVector.y = -cameraSpeed;
            if (this.camera.direction.up) offsetVector.y = cameraSpeed;
        }

        this.renderer.layout.origin.x += offsetVector.x;
        this.renderer.layout.origin.y += offsetVector.y;

        this.players.forEach((player) => {
            player.x += offsetVector.x;
            player.y += offsetVector.y;
        })

        this.camera.offset.x += offsetVector.x;
        this.camera.offset.y += offsetVector.y
    }

    private resize(): void {
        const canvas = this.renderer.canvas;
        const uiCanvas = this.renderer.uiCanvas;
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        const dpr = window.devicePixelRatio;
      
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        uiCanvas.width = width * dpr;
        uiCanvas.height = height * dpr;
    
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        uiCanvas.style.width = `${width}px`;
        uiCanvas.style.height = `${height}px`;

        this.renderer.ctx.scale(dpr, dpr);

        // Using the diff between the old/new origin of the canvas to calculate the new position of the player on the sceen
        const oldOriginX = this.renderer.layout.origin.x;
        const oldOriginY = this.renderer.layout.origin.y;
        
        const newOriginX = width / 2 + this.camera.offset.x;
        const newOriginY = height / 2 + this.camera.offset.y;
        this.renderer.layout.origin = {x: newOriginX, y: newOriginY};

        this.players.forEach((player) => {
            const offsetX = player.x - oldOriginX;
            const offsetY = player.y - oldOriginY;
            player.x = newOriginX + offsetX;
            player.y = newOriginY + offsetY;
        })
    }
}
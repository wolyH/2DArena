import { Renderer } from "./renderer.ts";
import { Grid } from "./grid.ts";
import { Player } from "./player.ts";
import type { GameState } from "./state.ts";
import { Hex } from "./hex.ts";

export class Game {
    state: GameState;
    renderer: Renderer;

    constructor(player: Player, grid: Grid, renderer: Renderer) {
        this.state = {
            player: player,
            grid: grid,
            isPlayerTurn: true,
            pathState: {
                show: false,
                path: []
            },
        }
        this.renderer = renderer;
    }

    private resize(): void {
        const canvas = this.renderer.canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Using the diff between the old/new origin of the canvas to calculate the new position of the player on the sceen
        const oldOriginX = this.renderer.layout.origin.x;
        const oldOriginY = this.renderer.layout.origin.y;

        const offsetX = this.state.player.x - oldOriginX;
        const offsetY = this.state.player.y - oldOriginY;
      
        canvas.width = width;
        canvas.height = height;
      
        if(window.devicePixelRatio !== 1) {
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
        
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.getContext(('2d'))!.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        
        const newOriginX = width / 2;
        const newOriginY = height / 2;
        this.renderer.layout.origin = { x: newOriginX, y: newOriginY };

        this.state.player.x = newOriginX + offsetX;
        this.state.player.y = newOriginY + offsetY;
    }

    start(): void {
        let resizeTimeout: number;

        // Temporary fix: only resize after 150ms of no dragging
        window.addEventListener('resize', () => {
            this.state.pathState.show = false;
            this.state.pathState.path = [];
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 150); 
        });

        window.addEventListener('click', (event) => this.handleMouseClick(event));
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        // Start the main game loop
        this.loop();
    }

    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    private update(): void {

        const player = this.state.player;

        if (player.is("Moving") && this.state.pathState.path.length === 0) {
            player.idle()
        }

        if(player.is("Moving") && this.state.pathState.path.length > 0) {
            const goal = this.state.pathState.path[0];
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
                this.state.pathState.path.shift();
                player.x = goal.x
                player.y = goal.y
                return;
            }
            const vx = (dx / distance) * player.speed;
            const vy = (dy / distance) * player.speed;
            player.x += vx;
            player.y += vy;

            const {q,r,s} = this.renderer.layout.pixelToHex({x: player.x, y: player.y});
            player.setHexCoordinate(q, r, s);
        }

        this.state.player.updateVisual();
    }

    private draw(): void {
        this.renderer.clear();
        this.renderer.drawMap(this.state.grid.map);
        if(this.state.pathState.show) {
            this.renderer.drawPath(this.state.pathState.path);
        }
        
        this.renderer.drawPlayer(this.state.player);
    }

    private handleMouseClick(event: MouseEvent): void {
        if(!this.state.player.is("Idle") || !this.state.isPlayerTurn) {
            return;
        }
        const rect = this.renderer.canvas.getBoundingClientRect();
    
        const hex = this.renderer.layout.pixelToHex({
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top
        });

        if(this.state.grid.map.has(hex.hashCode())) {
            this.state.player.move()
            this.state.pathState.show = false;
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if(!this.state.player.is("Idle") || !this.state.isPlayerTurn) {
            this.state.pathState.show = false
            return;
        }

        this.state.pathState.path = [];
        const rect = this.renderer.canvas.getBoundingClientRect();
    
        const hex = this.renderer.layout.pixelToHex({
            x: event.clientX - rect.left, 
            y: event.clientY - rect.top
        });

        if(this.state.player.isAt(hex) || !this.state.grid.map.has(hex.hashCode())) {
            this.state.pathState.show = false
            return;
        }

        const playerHex = this.state.grid.map.get(Hex.hashCode(this.state.player.q, this.state.player.r))
        if(!playerHex) {
            throw new Error("player not on grid");
        }

        const path = this.state.grid.searchPath(playerHex, hex);
        this.state.pathState.show = true;

        for(const h of path) {
            this.state.pathState.path.push(this.renderer.layout.hexToPixel(h));
        }
    }
}
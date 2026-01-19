import { Layout } from "./layout.ts";
import { Hex } from "./hex.ts";
import { Player } from "./player.ts";
import {UiButton} from "./ui.ts";

export class Renderer {
    readonly gameCanvas: HTMLCanvasElement;
    readonly gameCtx: CanvasRenderingContext2D;

    readonly uiCanvas: HTMLCanvasElement;
    readonly uiCtx: CanvasRenderingContext2D;

    readonly #mapCacheCanvas: HTMLCanvasElement;
    readonly #mapCacheCtx: CanvasRenderingContext2D;

    readonly layout: Layout;
    readonly background: string;

    static readonly DEFAULT_BACKGROUND_FILL_COLOR = "#282118ff";
    static readonly DEFAULT_LINE_WIDTH = 2;
    static readonly DEFAULT_HEX_DEPTH = 30;
    static readonly DEFAULT_DEPTH_FILL_COLOR = "#161717ff";
    static readonly DEFAULT_DEPTH_STROKE_COLOR = Renderer.DEFAULT_DEPTH_FILL_COLOR;
    //Here PLAYER_OFFSET_RATIO is a magic offset number to center vertically the player on the grid
    static readonly #PLAYER_OFFSET_RATIO = 5 / 6;

    static readonly PATH_WIDTH = 20;

    constructor(layout: Layout) {
        this.layout = layout;

        this.gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
        this.gameCtx = this.gameCanvas.getContext('2d')!;

        this.uiCanvas = document.querySelector<HTMLCanvasElement>('#ui-canvas')!;
        this.uiCtx = this.uiCanvas.getContext('2d')!;

        this.#mapCacheCanvas = document.createElement("canvas");
        this.#mapCacheCtx = this.#mapCacheCanvas.getContext("2d")!;

        this.resize();

        this.background = Renderer.DEFAULT_BACKGROUND_FILL_COLOR;
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio;

        for (const canvas of [this.gameCanvas, this.uiCanvas, this.#mapCacheCanvas]) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        }
    }

    clearGameCanvas(): void {
        const ctx = this.gameCtx;
        const width = this.gameCanvas.width;
        const height = this.gameCanvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, width, height);

        this.uiCtx.clearRect(0, 0, width, height);
    }

    loadMap(): void {
        this.gameCtx.drawImage(this.#mapCacheCanvas, 0, 0);
    }

    drawMapCache(map: Map<string, Hex>): void {
        const ctx = this.#mapCacheCtx;
        const dpr = window.devicePixelRatio;

        ctx.save();
        ctx.scale(dpr, dpr);
        
        ctx.fillStyle = this.background;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        //Hex depth surface drawing
        this.drawMapDepth(map);

        //Hex Top surface drawing
        const outline = new Path2D();
        for (const h of map.values()) {
            const corners = this.layout.findCorners(h);
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);

            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = h.fillColor;
            ctx.fill();
            
            outline.moveTo(corners[0].x, corners[0].y);
            
            for (let i = 1; i < 6; i++) {
                outline.lineTo(corners[i].x, corners[i].y);
            }

            outline.closePath();
        }

        ctx.lineWidth = Renderer.DEFAULT_LINE_WIDTH;
        ctx.strokeStyle = Hex.DEFAULT_STROKE_COLOR;
        ctx.stroke(outline);

        ctx.restore();
    }

    private drawMapDepth(map: Map<string, Hex>): void { 
        const ctx = this.#mapCacheCtx;
        //Here the outline has the same color has the inner shape (the hex) 
        //to compensate for the outline of the top surface (the grid) that makes each hex 0.5p bigger
        const depth = Renderer.DEFAULT_HEX_DEPTH;
        const outline = new Path2D();
        //Depth drawing
        for (const h of map.values()) {
            const corners = this.layout.findCorners(h);

            outline.moveTo(corners[1].x,corners[1].y);
            outline.lineTo(corners[1].x,corners[1].y + depth);
            outline.lineTo(corners[2].x,corners[2].y + depth);
            outline.lineTo(corners[3].x,corners[3].y + depth);
            outline.lineTo(corners[3].x,corners[3].y);
            
            ctx.beginPath();
            ctx.moveTo(corners[1].x,corners[1].y);
            ctx.lineTo(corners[1].x,corners[1].y + depth);
            ctx.lineTo(corners[2].x,corners[2].y + depth);
            ctx.lineTo(corners[3].x,corners[3].y + depth);
            ctx.lineTo(corners[3].x,corners[3].y);
            ctx.lineTo(corners[2].x,corners[2].y);
            ctx.lineTo(corners[1].x,corners[1].y);
            ctx.fillStyle = Renderer.DEFAULT_DEPTH_FILL_COLOR;
            ctx.fill();
        }
        ctx.lineWidth = Renderer.DEFAULT_LINE_WIDTH;
        ctx.strokeStyle = Renderer.DEFAULT_DEPTH_STROKE_COLOR;
        ctx.stroke(outline);
    }

    drawPlayer(player: Player): void {
        const ctx = this.gameCtx;
        const sprite = player.getCurrentSprite();
        const width = sprite.naturalWidth;
        const height = sprite.naturalHeight;
        const dpr = window.devicePixelRatio;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.translate(player.x, 0);
        ctx.scale(player.direction, 1);
        ctx.drawImage(sprite, -width / 2, player.y - Renderer.#PLAYER_OFFSET_RATIO * height);

        ctx.restore();
    }

    drawPlayerAura(hex: Hex, isAlly: boolean, isCurrent: boolean) {
        const ctx = this.gameCtx;
        const dpr = window.devicePixelRatio;

        const paddingX = 7;
        const paddingY = 7;
        const radiusX = this.layout.size.x;
        const radiusY = this.layout.size.y;
        const scaleX = (radiusX - paddingX) / radiusX;
        const scaleY = (radiusY - paddingY) / radiusY;
        
        ctx.save();
        ctx.scale(dpr, dpr);

        const [centerX, centerY] = this.layout.hexToPixel(hex);
        const corners = this.layout.findCorners(hex);

        ctx.beginPath();

        for (let i = 0; i < 6; i++) {
            const ix = centerX + (corners[i].x - centerX) * scaleX;
            const iy = centerY + (corners[i].y - centerY) * scaleY;

            if (i === 0) {
                ctx.moveTo(ix, iy);
            } else {
                ctx.lineTo(ix, iy);
            }
        }

        ctx.closePath();
        ctx.strokeStyle = isAlly ? (isCurrent ? "green" : "purple") : (isCurrent ? "red" : "grey");
        ctx.lineWidth = 9.5;
        ctx.stroke();

        ctx.restore();
    }

    drawPathPreview(preview: {goals: Array<Hex>, isTraversable: boolean}) {
        const ctx = this.gameCtx;
        const path = preview.goals;
        const dpr = window.devicePixelRatio;

        if(path.length < 2) {
            return;
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        const lineFillColor = preview.isTraversable ? "rgba(5, 56, 24, 0.2)" : "rgba(56, 5, 5, 0.2)";
        const ellipseFillColor = preview.isTraversable ? "rgba(7, 51, 3)" : "rgba(51, 3, 3)";

        const ellipsePath = new Path2D();
        const linePath = new Path2D();

        for (let i = 0 ; i < path.length ; i++) {
            const [x, y] = this.layout.hexToPixel(path[i]);
            if(i === 0) {
                linePath.moveTo(x, y);
            }
            else {
                linePath.lineTo(x, y);
            }

            ellipsePath.moveTo(x, y);
            ellipsePath.ellipse(x, y, Renderer.PATH_WIDTH, 0.5 * Renderer.PATH_WIDTH, 0, 0, 2 * Math.PI);
        }

        //Draw the line
        ctx.lineWidth =  Renderer.PATH_WIDTH;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = lineFillColor;
        ctx.stroke(linePath);

        //Draw the hex centers
        ctx.strokeStyle = ellipseFillColor;
        ctx.stroke(ellipsePath);

        ctx.restore();
    }

    drawButton(btn: UiButton): void {
        const ctx = this.uiCtx;
        
        ctx.fillStyle = btn.isHovered ? "#555" : "#333";
        ctx.strokeStyle = Hex.DEFAULT_STROKE_COLOR;
        ctx.lineWidth = 2;

        ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
        ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

        ctx.fillStyle = "white";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(btn.label, btn.x + btn.width/2, btn.y + btn.height/2);
    }
}
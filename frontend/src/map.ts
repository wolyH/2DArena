export interface Point2D {
    x: number;
    y: number;
}

// Uses the pointy top orientation
export class Layout {
    origin: Point2D;
    size: Point2D;

    //Forward matrix: Hex to Pixel
    private readonly f0 = Math.sqrt(3.0); 
    private readonly f1 = Math.sqrt(3.0) / 2.0; 
    private readonly f2 = 0.0; 
    private readonly f3 = 3.0 / 2.0;
    //Backward matrix: Pixel to Hex
    private readonly b0 = Math.sqrt(3.0) / 3.0; 
    private readonly b1 = -1.0 / 3.0; 
    private readonly b2 = 0.0; 
    private readonly b3 = 2.0 / 3.0;

    //In multiples of 60°
    private readonly startAngle = 0.5;

    constructor(origin: Point2D, size: Point2D) {
        this.origin = origin;
        this.size = size;
    }

    findCorners(h:Hex): Array<Point2D> {
        const corners: Array<Point2D> = [];
        const center = this.hexToPixel(h);

        for(let i = 0 ; i < 6 ; i++) {
            const angle_deg = 60 * (i - this.startAngle);
            const angle_rad = Math.PI / 180.0 * angle_deg;
            corners.push({
                x: center.x + this.size.x * Math.cos(angle_rad),
                y: center.y + this.size.y * Math.sin(angle_rad)
            });
        }

        return corners;
    }

    hexToPixel(h:Hex): Point2D {
        const x = (this.f0 * h.q + this.f1 * h.r) * this.size.x;
        const y = (this.f2 * h.q + this.f3 * h.r) * this.size.y;

        return {
            x: x + this.origin.x, 
            y: y + this.origin.y
        };
    }

    pixelToHex(p: Point2D): Hex {
        const point = {
            x: (p.x - this.origin.x) / this.size.x, 
            y: (p.y - this.origin.y) / this.size.y
        };
        const q = (this.b0 * point.x + this.b1 * point.y);
        const r = (this.b2 * point.x + this.b3 * point.y);

        return this.round(new Hex(q, r, -q-r));
    }

    private round(h: Hex): Hex {
        let q = Math.round(h.q);
        let r = Math.round(h.r);
        let s = Math.round(h.s);

        const q_diff = Math.abs(q - h.q)
        const r_diff = Math.abs(r - h.r)
        const s_diff = Math.abs(s - h.s)

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r-s
        }
        else if(r_diff > s_diff){
            r = -q-s
        }
        else {
            s = -q-r
        }

        return new Hex(q, r, s);
    }
}

export class Hex {
    readonly q: number;
    readonly r: number;
    readonly s: number;

    fillColor: string;
    strokeColor: string;

    static readonly DEFAULT_FILL_COLOR = "#2b2d2dff";
    static readonly DEFAULT_STROKE_COLOR = "#0a0a0aff";
    static readonly DEFAULT_DEPTH_FILL_COLOR = "#161717ff";
    static readonly DEFAULT_LINE_WIDTH = 2;

    /**
     * Creates a new Hexagon using Cube coordinates.
     * @throws {Error} If the sum of q, r, and s is not zero.
     */
    constructor(q: number, 
                r: number, 
                s: number, 
                fillColor: string = Hex.DEFAULT_FILL_COLOR, 
                strokeColor: string = Hex.DEFAULT_STROKE_COLOR) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.q = q;
        this.r = r;
        this.s = s;

        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
    }

    distance(other: Hex): number {
        return Math.max(
            Math.abs(this.q - other.q), 
            Math.abs(this.r - other.r), 
            Math.abs(this.s - other.s))
    };

    hashCode(): string {
        return Hex.hashCode(this.q, this.r);
    }
    
    // Coordinate s is redundant and delimiter choice doesn't matter here
    static hashCode(q: number, r: number) : string {
         return `${q}_${r}`;
    }
}

export class Renderer {
    readonly canvas: HTMLCanvasElement
    readonly layout: Layout;
    private canvasWidth: number;
    private canvasHeight: number;

    static readonly DEFAULT_HEX_DEPTH = 30
    static readonly DEFAULT_BACKGROUND_FILL_COLOR: string  = "#282118ff";
    
    readonly background : string | HTMLImageElement;

    constructor(
        canvas: HTMLCanvasElement,
        layout: Layout, 
        canvasWidth: number, 
        canvasHeight: number,
        background?: HTMLImageElement
    ) {
        this.canvas = canvas;
        this.layout = layout;
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;
        if(background) {
            this.background = background
        }
        else {
            this.background = Renderer.DEFAULT_BACKGROUND_FILL_COLOR;
        }
    }

    clear(): void {
        const ctx = this.canvas.getContext('2d')!
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        if(typeof this.background === "string") {
            ctx.fillStyle = (Renderer.DEFAULT_BACKGROUND_FILL_COLOR);
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
        } else {
            ctx.drawImage(this.background, 0, 0, this.canvasWidth, this.canvasHeight);
        }
    }

    setCanvasDims(canvasWidth: number, canvasHeight: number): void {
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    drawMap(
        map: Map<string, Hex>, 
    ): void {
        const ctx = this.canvas.getContext('2d')!
        const depthStrokePath = new Path2D();
        
        for (let [_, h] of map) {
            const corners = this.layout.findCorners(h);

            depthStrokePath.moveTo(corners[1].x,corners[1].y);
            depthStrokePath.lineTo(corners[1].x,corners[1].y + Renderer.DEFAULT_HEX_DEPTH);
            depthStrokePath.lineTo(corners[2].x,corners[2].y + Renderer.DEFAULT_HEX_DEPTH);
            depthStrokePath.lineTo(corners[3].x,corners[3].y + Renderer.DEFAULT_HEX_DEPTH);
            depthStrokePath.lineTo(corners[3].x,corners[3].y);
            
            ctx.beginPath();
            ctx.moveTo(corners[1].x,corners[1].y);
            ctx.lineTo(corners[1].x,corners[1].y + Renderer.DEFAULT_HEX_DEPTH);
            ctx.lineTo(corners[2].x,corners[2].y + Renderer.DEFAULT_HEX_DEPTH);
            ctx.lineTo(corners[3].x,corners[3].y + Renderer.DEFAULT_HEX_DEPTH);
            ctx.lineTo(corners[3].x,corners[3].y);
            ctx.lineTo(corners[2].x,corners[2].y);
            ctx.lineTo(corners[1].x,corners[1].y);
            ctx.fillStyle = Hex.DEFAULT_DEPTH_FILL_COLOR;
            ctx.fill()
        }
        
        ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
        ctx.strokeStyle = Hex.DEFAULT_DEPTH_FILL_COLOR;
        ctx.stroke(depthStrokePath);
        
        const gridPath = new Path2D();
        
        for (let [_, h] of map) {
            const corners = this.layout.findCorners(h);

            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();

            ctx.fillStyle = h.fillColor;
            ctx.fill();
            
            gridPath.moveTo(corners[0].x, corners[0].y);
            
            for (let i = 1; i < 6; i++) {
                gridPath.lineTo(corners[i].x, corners[i].y);
            }
            gridPath.closePath();
        }
        ctx.lineWidth = Hex.DEFAULT_LINE_WIDTH;
        ctx.strokeStyle = Hex.DEFAULT_STROKE_COLOR;
        ctx.stroke(gridPath);
    }

    drawPlayer(player:Player): void {
        const sprite = player.getCurrentSprite();
        const position = this.layout.hexToPixel(new Hex(...player.getPosition()));

        const ctx = this.canvas.getContext('2d')!;
        const w = sprite.naturalWidth;
        const h = sprite.naturalHeight;

        ctx.save();
        ctx.translate(position.x, 0);
        const left = -1;
        ctx.scale(left, 1); 
        ctx.drawImage(
            sprite, 
            -w / 2, 
            position.y - h + 10,
        );
        ctx.restore()
    }
}

export class AssetManager {
    private sprites: Map<string, Array<HTMLImageElement>>;

    constructor() {
        this.sprites = new Map<string, Array<HTMLImageElement>>();
    }

    async loadSprites(urls: Map<string, Array<string>>) {
        const promises: Array<Promise<void>> = [];

        urls.forEach((spriteUrls, spriteName) => {
            if (!this.sprites.has(spriteName)) {
                this.sprites.set(spriteName, []);
            }
            const arr = this.sprites.get(spriteName)!
            for (let url of spriteUrls) {
                const img = new Image();
                promises.push(new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load ${url}`));
                }))
                arr.push(img)
                img.src = url;
            }
        })

        await Promise.all(promises);
    }

    get(spriteName: string): HTMLImageElement[] | undefined {
        return this.sprites.get(spriteName);
    }
}

export type PlayerAction = "Idle" | "Moving" | "Striking";

export class Player {

    // position of the player
    private q: number;
    private r: number;
    private s: number;

    private action: PlayerAction;
    private spriteIdx: number;
    private sprites: Record<PlayerAction, Array<HTMLImageElement>>;
    private frameCounter;
    private readonly ANIMATION_SPEED = 40;

    constructor(
        q:number, 
        r: number, 
        s: number, 
        sprites: Record<PlayerAction, Array<HTMLImageElement>>
    ) {
        if (Math.round(q + r + s) !== 0) {
            throw Error("q + r + s must be 0");
        }

        this.q = q;
        this.r = r;
        this.s = s;
        this.action  = "Idle";
        this.spriteIdx = 0;
        this.sprites = sprites;
        this.frameCounter = 0;
    }

    getPosition(): [number, number, number] {
        return [this.q, this.r, this.s];
    }

    updateCurrentSprite(): void {
        this.frameCounter++

        if (this.frameCounter >= this.ANIMATION_SPEED) {
            this.frameCounter = 0;

            const nextIdx = this.spriteIdx + 1;
            const spriteSheet = this.sprites[this.action];

            if(!spriteSheet) {
                throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
            }
            else if (nextIdx >= spriteSheet.length) {
                if (this.action === "Striking") {
                    this.idle();
                }
                else {
                    this.spriteIdx = 0;
                }
            }
            else {
                this.spriteIdx = nextIdx;
            }
        }
    }

    getCurrentSprite(): HTMLImageElement {
        const spriteSheet = this.sprites[this.action];

        if(spriteSheet) {
            return spriteSheet[this.spriteIdx]
        }
        throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
    }

    move(q: number, r: number, s: number): void {
        this.changeAction("Moving");

        // No need to re check q + r + s = 0, the World object handles the logic
        this.q = q;
        this.r = r;
        this.s = s;
    }

    strike(): void {
        this.changeAction("Striking");
    }

    idle(): void {
        this.changeAction("Idle");
    }

    private changeAction(action: PlayerAction): void {
        if (this.action !== action) {
            this.action = action;
            const spriteSheet = this.sprites[this.action];
            if(spriteSheet) {
                // The animation starts instantly at next frame
                this.spriteIdx = this.sprites[action].length - 1;
                this.frameCounter = this.ANIMATION_SPEED
            }
            throw new Error(`Sprite sheet is null for PlayerAction: ${this.action}`);
        }
    }
}

export class World {
    player: Player;
    map: Map<string, Hex>;
    renderer: Renderer;

    constructor(player: Player, map: Map<string, Hex>, renderer: Renderer) {
        this.player = player;
        this.map = map;
        this.renderer = renderer;
    }

    start(): void {
        let resizeTimeout: number;

        // Temporary fix: only resize after 150ms of no dragging
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 150); 
        });

        // Start the Main game loop
        this.loop();
    }

    private loop = (): void => {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    private update(): void {
        this.player.updateCurrentSprite();
    }

    private draw(): void {
        this.renderer.clear();
        this.renderer.drawMap(this.map);
        this.renderer.drawPlayer(this.player);
    }

    private resize(): void {
        const canvas = this.renderer.canvas;
        const width = window.innerWidth;
        const height = window.innerHeight;
      
        canvas.width = width;
        canvas.height = height;
      
        if(window.devicePixelRatio !== 1) {
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
        
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.getContext(('2d'))!.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    
        this.renderer.layout.origin = {x: width / 2, y: height / 2};
        this.renderer.setCanvasDims(width, height);
    }
}

/*
 //Highlights the hex where the cursor currently is
    let currentHex : Hex | null = null;
    
    canvas.addEventListener('mousemove', (event: MouseEvent) => {
      // Get the canvas position and size
      const rect = canvas.getBoundingClientRect();
    
      const h = layout.pixelToHex({
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top
      });
    
      if(map.has(h.hashCode())) {
    
        if(!currentHex || h.hashCode() !== currentHex.hashCode()) {
          h.fillColor = "#01672cff";
          map.set(h.hashCode(), h)
        }
    
        if (currentHex !== null && h.hashCode() !== currentHex.hashCode()) {
          currentHex.fillColor = Hex.DEFAULT_FILL_COLOR;
          map.set(currentHex.hashCode(), currentHex)
        }
        currentHex = h;
    
      } 
      else if (currentHex !== null) {
        currentHex.fillColor = Hex.DEFAULT_FILL_COLOR;
        map.set(currentHex.hashCode(), currentHex);
        currentHex = null;
      }
    
    });

    */

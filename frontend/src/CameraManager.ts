import type { Layout } from "./Layout";
import type { GameRenderer } from "./rendering/GameRenderer";

export class CameraManager {
    readonly #gameRenderer: GameRenderer;
    readonly #layout: Layout;

    readonly #camera = {up: false, down: false, left: false, right: false};

    static readonly #CAMERA_SPEED = 40;
    
    constructor(
        gameRenderer: GameRenderer,
        layout: Layout
    ) {
        this.#gameRenderer = gameRenderer;
        this.#layout = layout;
    }

    setCameraDirection(direction: 'up' | 'down' | 'left' | 'right', isPressed: boolean): void {
         if (direction in this.#camera) {
            this.#camera[direction] = isPressed;
        }
    }

    get camera(): {up: boolean, down: boolean, left: boolean, right: boolean} {
        return this.#camera;
    }

    updateCamera(delta: number): void {
        //take into account the level of zoom
        const cameraSpeed = (CameraManager.#CAMERA_SPEED / window.devicePixelRatio) * delta;

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

        if (this.#layout.updateCameraOffset(offsetX, offsetY)) {
            this.#gameRenderer.invalidateMapCache();
        }
    }

    reset(): void {
        this.#camera.up = false;
        this.#camera.down = false;
        this.#camera.left = false;
        this.#camera.right = false;
    }
}
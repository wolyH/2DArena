import type { Hex } from "../Hex";
import type { AssetManager } from "../utils";
import { Unit, type UnitAction } from "./Unit";

export class UnitFactory {
    #assetmanager: AssetManager;

    constructor(assetmanager: AssetManager) {
        this.#assetmanager = assetmanager;
    }

    createAlly(hex: Hex, x: number, y: number, username: string, speed: number = 20): Unit {
        return this.createUnit(hex, x, y, speed, username, "black");
    }

    createEnemy(hex: Hex, x: number, y: number, username: string, speed: number = 20): Unit {
        return this.createUnit(hex, x, y, speed, username, "black");
    }

    private createUnit(hex: Hex, x: number, y: number, speed: number, username: string, color: string): Unit {
        const sprites: Record<UnitAction, Array<HTMLImageElement>> = {
            "Idle": this.#assetmanager.get(`${color}_idle`)!,
            "Moving": this.#assetmanager.get(`${color}_moving`)!,
            "Striking": this.#assetmanager.get(`${color}_striking`)!,
            "Dying": this.#assetmanager.get("dust")!
        };
        return new Unit(hex, x, y, sprites, speed, username);
    }
}
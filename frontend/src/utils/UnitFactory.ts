import { Unit, type UnitAction } from "../model/Unit";
import type { Hex } from "../model/Hex";
import type { AssetManager } from "./AssetManager";

export class UnitFactory {
    #assetmanager: AssetManager;

    constructor(assetmanager: AssetManager) {
        this.#assetmanager = assetmanager;
    }

    createAlly(
        hex: Hex, 
        x: number, 
        y: number, 
        username: string, 
        idx: number, 
        speed: number = 160
    ): Unit {
        return this.createUnit(hex, x, y, speed, username, idx, "black",);
    }

    createEnemy(
        hex: Hex | undefined, 
        x: number | undefined, 
        y: number | undefined, 
        username: string, 
        idx: number, 
        speed: number = 160
    ): Unit {
        return this.createUnit(hex, x, y, speed, username, idx, "black");
    }

    private createUnit(
        hex: Hex | undefined, 
        x: number | undefined, 
        y: number | undefined, 
        speed: number, 
        username: string, 
        idx: number, 
        color: string
    ): Unit {
        const sprites: Record<UnitAction, Array<HTMLImageElement>> = {
            "Idle": this.#assetmanager.get(`${color}_idle`)!,
            "Moving": this.#assetmanager.get(`${color}_moving`)!,
            "Striking": this.#assetmanager.get(`${color}_striking`)!,
            "Dying": this.#assetmanager.get("dust")!
        };
        return new Unit(hex, x, y, sprites, speed, username, idx);
    }
}
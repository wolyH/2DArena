import type { PathPreviewManager } from "../PathPreviewManager";
import type { RoomState } from "../RoomState";
import type { UiManager } from "../ui/UiManager";
import type { UnitManager } from "../unit/UnitManager";
import type { Renderer } from "./Renderer";

export class GameRenderer {
    #renderer: Renderer;
    #unitManager: UnitManager;
    #uiManager: UiManager;
    #pathPreviewManager: PathPreviewManager;
    #roomState: RoomState;

    #isMapDirty: boolean = true;

    constructor (
        renderer: Renderer,
        uiManager: UiManager,
        unitManager: UnitManager,
        pathPreviewManager: PathPreviewManager,
        roomState: RoomState
    ) {
        this.#renderer = renderer;
        this.#unitManager = unitManager;
        this.#uiManager = uiManager;
        this.#pathPreviewManager = pathPreviewManager;
        this.#roomState = roomState;
    }

    clear(): void {
        this.#renderer.clear();
    }

    resize(): void {
        this.#renderer.resize();
    }

    drawUi(): void {
        for(let i = 0 ; i< this.#uiManager.buttons.length ; i++) {
            this.#renderer.drawButton(this.#uiManager.buttons[i]);
        }
        for(let i = 0 ; i< this.#uiManager.texts.length ; i++) {
            this.#renderer.drawText(this.#uiManager.texts[i]);
        }
    }

    drawGame(): void {
        if (this.#isMapDirty) {
            this.#renderer.drawMapCache();
            this.#isMapDirty = false;
        }

        this.#renderer.loadMap();

        this.#renderer.drawPathPreview(this.#pathPreviewManager.pathPreview);

        const units = this.#unitManager.units;
        for (let i = 0; i < units.length; i++) {
            const unit = units[i]
            if (!((unit.isDead) || unit.is("Moving"))) {
                const isAlly = unit.player === this.#roomState.username;
                const isCurrent = this.#unitManager.getActiveUnit().hex.equals(unit.hex);
                this.#renderer.drawUnitAura(unit.hex, isAlly, isCurrent);
            }
        }

        for (let i = 0; i < units.length; i++) {
            const unit = units[i]
            if (!(unit.isDead && unit.is("Idle"))) {
                this.#renderer.drawUnit(unit);
            }
        }
    }

    invalidateMapCache(): void {
        this.#isMapDirty = true;
    }

    getGameCanvasOffset(): { x: number, y: number } {
        const rect = this.#renderer.gameCanvas.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    getUiCanvasOffset(): { x: number, y: number } {
        const rect = this.#renderer.uiCanvas.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }
}
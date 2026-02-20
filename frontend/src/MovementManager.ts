import type { FovManager } from "./FovManager";
import { Hex } from "./model/Hex";
import type { LayoutManager } from "./LayoutManager";
import type { MapManager } from "./MapManager";

import type { Unit } from "./model/Unit";
import type { UnitManager } from "./UnitManager";
import type { MovementState } from "./MovementState";

export class MovementManager {
    #unitManager: UnitManager;
    #movementState: MovementState;
    #layoutManager: LayoutManager;
    #fovManager: FovManager;
    #mapManager: MapManager;

    constructor(
        unitManager: UnitManager,
        pathState: MovementState,
        layoutManager: LayoutManager,
        fovManager: FovManager,
        mapManager: MapManager
    ) {
        this.#unitManager = unitManager;
        this.#movementState = pathState;
        this.#layoutManager = layoutManager;
        this.#fovManager = fovManager;
        this.#mapManager = mapManager;
    }

    updateActiveUnit(delta: number): void {
        const activeUnit = this.#unitManager.getActiveUnit()
        
        if (activeUnit.is("Moving") && !this.#movementState.isMoving()) {
            activeUnit.idle();
            if(!activeUnit.isVisible()) {
                activeUnit.clearWorldPos();
            }
        }
        if(activeUnit.is("Moving") && this.#movementState.isMoving()) {
            this.moveUnitTowardGoal(activeUnit, delta);
        }
    }
        
    private moveUnitTowardGoal(unit: Unit, delta: number): void {
        const nextGoal = this.#movementState.getNextGoal();
        const [goalX, goalY] = this.#layoutManager.hexToWorld(nextGoal);
        const isGoalVisible = this.#fovManager.isVisible(nextGoal);
        
        const {x, y} = unit.getWorldPos();

        if(x === undefined || y === undefined) {
            throw new Error("Unit not in world")
        }

        const dx = goalX - x;
        const dy = goalY - y;  

        this.#unitManager.updateUnitDirection(unit, dx);

        const distance = Math.sqrt(dx * dx + dy * dy);
        const isTooClose = distance < unit.speed * delta;

        const newX = isTooClose ? goalX : x + (dx / distance) * unit.speed * delta;
        const newY = isTooClose ? goalY : y + (dy / distance) * unit.speed * delta;
        unit.setWorldPos(newX, newY);

        const [preQ, prevR] = this.#layoutManager.worldToHex({x: x, y: y});
        const prevAdjacentHex = this.#mapManager.getHex(Hex.hashCode(preQ, prevR));

        const [newQ, newR] = this.#layoutManager.worldToHex({x: newX, y: newY});
        const newAdjacentHex = this.#mapManager.getHex(Hex.hashCode(newQ, newR));

        if (prevAdjacentHex === undefined) {
            throw new Error("Unit not on map");
        }
        if(newAdjacentHex === undefined) {
            throw new Error("Unit going out of the map map");
        }

        if(!isGoalVisible) {
            this.clearUnitHexIfNeeded(unit, prevAdjacentHex, newAdjacentHex);
        }
        else {
            this.updateUnitHexIfNeeded(unit, prevAdjacentHex, newAdjacentHex);
        }

        if (isTooClose) {
           this.#movementState.shifPath(); 
        }
    }

    private updateUnitHexIfNeeded(unit: Unit, prevAdjacentHex: Hex, newAdjacentHex: Hex): void {
        if (prevAdjacentHex.hashCode !== newAdjacentHex.hashCode) {
            const {currentFov, currentLocation} = this.#movementState.getCurrentFovAndLocation();
            this.#movementState.shiftFovAndLocation();

            if(currentFov !== undefined && currentLocation !== undefined) {
                this.#fovManager.setFov(currentFov);
                this.#unitManager.setEnemyLocation(currentLocation);
            }
            unit.setHex(newAdjacentHex);
        }
    }

    private clearUnitHexIfNeeded(unit: Unit, prevAdjacentHex: Hex, newAdjacentHex: Hex): void {
        if (prevAdjacentHex.hashCode !== newAdjacentHex.hashCode) {
            this.#movementState.shiftFovAndLocation();
            unit.setHex(undefined);
        }
    }
}
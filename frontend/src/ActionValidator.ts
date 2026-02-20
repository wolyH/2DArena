import type { FovManager } from "./FovManager";
import type { MapManager } from "./MapManager";
import { Hex } from "./model/Hex";
import type { Unit } from "./model/Unit";
import type { UnitManager } from "./UnitManager";

export class ActionValidator {
    #unitManager: UnitManager;
    #mapManager: MapManager;
    #fovManager: FovManager;
    
    constructor(
        unitManager: UnitManager,
        mapManager: MapManager,
        fovManager: FovManager,
    ) {
        this.#unitManager = unitManager;
        this.#mapManager = mapManager;
        this.#fovManager = fovManager;
    }

    validateAttack(
        attackerIdx: number, 
        targetCoords: {q: number, r: number}
    ): {attacker: Unit, target: Unit} 
    {
        if (!this.#unitManager.isUnitActive(attackerIdx)) {
            throw new Error(`Unit ${attackerIdx} is not the active unit`);
        }
        
        const attacker = this.#unitManager.getActiveUnit();
        const attackerPos = attacker.getWorldPos();

        if (attackerPos.x === undefined || attackerPos.y === undefined) {
            throw new Error(`Active unit ${attackerIdx} not visible`);
        }
        
        const targetHex = this.#mapManager.getHex(
            Hex.hashCode(targetCoords.q, targetCoords.r)
        );

        if (!targetHex) {
            throw new Error(`Target hex (${targetCoords.q}, ${targetCoords.r}) not found`);
        }
        
        if (!targetHex.unit) {
            throw new Error(`No unit at target hex ${targetHex.hashCode}`);
        }
        
        const targetPos = targetHex.unit.getWorldPos();
        if (targetPos.x === undefined || targetPos.y === undefined) {
            throw new Error(`Target unit at ${targetHex.hashCode} not visible`);
        }

        if (!attacker.hex) {
            throw new Error(`Attacker ${attackerIdx} has no hex position`);
        }
        
        if (targetHex.isObstacle) {
            throw new Error(`Cannot attack obstacle at ${targetHex.hashCode}`);
        }

        if (!this.#fovManager.isVisible(targetHex)) {
            throw new Error(`Target hex ${targetHex.hashCode} not in FOV`);
        }

        if (!attacker.hex.isNeighbor(targetHex)) {
            throw new Error(
                `Target ${targetHex.hashCode} out of range from ${attacker.hex.hashCode}`
            );
        }
        
        return {attacker, target: targetHex.unit};
    }

    validateAllyMove(
        unitIdx: number,
        pathCoords: Array<{q: number, r: number}>,
        visibleUnitsAlongPath: Array<Array<{idx: number, q: number, r: number}>>
    ): { path: Array<Hex>, enemyLocationSnapshots: Array<Map<number, Hex>>} 
    {
        if (!this.#unitManager.isUnitActive(unitIdx)) {
            throw new Error(`Unit ${unitIdx} is not the active unit`);
        }
        
        if (pathCoords.length < 1) {
            throw new Error("Path must contain at least 1 hex");
        }
        
        const path: Array<Hex> = [];
        const enemyLocationSnapshots: Array<Map<number, Hex>> = [];
        
        for (let i = 0; i < pathCoords.length; i++) {
            const hex = this.#mapManager.getHex(
                Hex.hashCode(pathCoords[i].q, pathCoords[i].r)
            );
            
            if (!hex) {
                throw new Error(
                    `Path hex ${i} at (${pathCoords[i].q}, ${pathCoords[i].r}) not found`
                );
            }
            
            path.push(hex);
            
            const snapshot: Map<number, Hex> = new Map();
            for (const unitCoords of visibleUnitsAlongPath[i]) {
                const unitHex = this.#mapManager.getHex(
                    Hex.hashCode(unitCoords.q, unitCoords.r)
                );
                
                if (!unitHex) {
                    throw new Error(
                        `Enemy snapshot ${i}: hex at (${unitCoords.q}, ${unitCoords.r}) not found`
                    );
                }
                
                snapshot.set(unitCoords.idx, unitHex);
            }
            
            enemyLocationSnapshots.push(snapshot);
        }
        
        return { path, enemyLocationSnapshots };
    }

    validateEnemyMove(
        unitIdx: number,
        pathCoords: Array<{q: number, r: number}>
    ): {path: Array<Hex>, startHex: Hex} | undefined 
    {
        if (!this.#unitManager.isUnitActive(unitIdx)) {
            throw new Error(`Unit ${unitIdx} is not the active unit`);
        }
        
        if (pathCoords.length === 0) {
            return undefined;
        }
        
        const startHex = this.#mapManager.getHex(
            Hex.hashCode(pathCoords[0].q, pathCoords[0].r)
        );
        
        if (!startHex) {
            throw new Error(
                `Path start hex at (${pathCoords[0].q}, ${pathCoords[0].r}) not found`
            );
        }
        
        const path: Array<Hex> = [];
        for (let i = 1; i < pathCoords.length; i++) {
            const hex = this.#mapManager.getHex(
                Hex.hashCode(pathCoords[i].q, pathCoords[i].r)
            );
            
            if (!hex) {
                throw new Error(
                    `Path hex ${i} at (${pathCoords[i].q}, ${pathCoords[i].r}) not found`
                );
            }
            
            path.push(hex);
        }
        
        return { path, startHex };
    }
}
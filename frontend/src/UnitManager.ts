import type { MapManager } from "./MapManager";
import type { RoomState } from "./RoomState";
import type { Unit } from "./model/Unit";
import type { UnitFactory } from "./utils/UnitFactory";
import type { FovManager } from "./FovManager";
import { Hex } from "./model/Hex";
import type { LayoutManager } from "./LayoutManager";

export class UnitManager {
    readonly #mapManager: MapManager;
    readonly #layoutManager: LayoutManager;
    readonly #factory: UnitFactory;
    readonly #fovManager: FovManager;
    readonly #roomState: RoomState;

    #units: Array<Unit> = [];
    #activeUnitIdx: number = 0;

    constructor(
        mapManager: MapManager,
        layoutManager: LayoutManager,
        factory: UnitFactory,
        fovManager: FovManager,
        roomState: RoomState,
    ) {
        this.#mapManager = mapManager;
        this.#layoutManager = layoutManager;
        this.#factory = factory;
        this.#fovManager = fovManager;
        this.#roomState = roomState;
    }

    get activeUnitIdx(): number {
        return this.#activeUnitIdx;
    }

    setUnitIdx(unitIdx: number): void {
        this.#activeUnitIdx = unitIdx;
    }

    getActiveUnit(): Unit {
        return this.#units[this.#activeUnitIdx];
    }

    isUnitActive(unitIdx: number): boolean {
        return this.activeUnitIdx === unitIdx;
    }

    isDead(unitIdx: number) {
        if (unitIdx < 0 || unitIdx >= this.#units.length) {
            throw new Error (`unit idx ${unitIdx} is uncorrect`);
        }
        return this.#units[unitIdx].isDead;
    }

    killOutOfMapUnits(deadUnits: Array<number>): void {
        for (const idx of deadUnits) {
            if (idx < 0 || idx > this.#units.length) {
                throw new Error (`next unit id ${idx} is uncorrect`);
            }
            this.#units[idx].die();
        }
    }

    spawnUnits(unitSpawns: Array<{idx: number, q: number, r: number}>, nb_units: number): void {
        this.#activeUnitIdx = 0;
        this.#units = [];

        const allyIdxs = new Map(unitSpawns.map(u => [u.idx, u]));
        const username = this.#roomState.username;
        const opponent = this.#roomState.room.opponent;
        
        if (opponent === undefined) {
            throw new Error("Cannot spawn units: opponent is undefined");
        }

        for (let i = 0 ; i < nb_units ; i++) {
            const unitCoords = allyIdxs.get(i);
            if(unitCoords === undefined) {
                this.#units.push(this.#factory.createEnemy(undefined, undefined, undefined, opponent, i))
                continue;
            }

            const hex = this.#mapManager.getHex(Hex.hashCode(unitCoords.q, unitCoords.r));
            if(hex === undefined || !hex.isTraversable()) {
                 throw new Error(
                    `Cannot spawn unit ${unitCoords.idx} at (${unitCoords.q}, ${unitCoords.r}): hex is invalid or not traversable`
                );
            }

            const [x, y] = this.#layoutManager.hexToWorld(hex);
            this.#units.push(this.#factory.createAlly(hex, x, y, username, unitCoords.idx));
        }
    }

    public forEachAliveUnit(consumer: (unit: Unit) => void) {
        for (const unit of this.#units) {
            if (!(unit.isDead && unit.is("Idle"))) {
                consumer(unit);
            }
        }
    }
    
    public setEnemyLocation(enemyLocation: Map<number, Hex>): void {
        for(const unit of this.#units) {
            const hex = enemyLocation.get(unit.idx);
            if(!this.isUnitEnemy(unit)) {
                continue;
            }  
            if(hex === undefined && unit.hasHex()) {
                unit.setHex(undefined)
                unit.clearWorldPos();
                continue;
            }
            else if (hex === undefined) {
                continue;
            }

            if(hex.isObstacle || (hex.unit && hex.unit.idx !== unit.idx)) {
                throw new Error(`Hex ${hex.hashCode} is already occupied`);
            }

            if (hex.unit === undefined) {
                const [x, y] = this.#layoutManager.hexToWorld(hex);
                unit.setWorldPos(x, y);
                unit.setHex(hex);
            }
        }
    }

    refreshEnemyLocation() {
        for(const unit of this.#units) {
            if(!this.isUnitEnemy(unit)) {
                continue;
            }
            if(unit.isVisible() && !this.#fovManager.isVisible(unit.hex)) {
                unit.clearWorldPos();
                unit.setHex(undefined);
            }
        }
    }
 
    updateUnitDirection(unit: Unit, dx: number): void {
        if (dx > 0) {
            unit.turnRight();
        }
        else if (dx < 0) {
            unit.turnLeft();
        }
    }

    canAttack(attacker: Unit, targetHex: Hex): boolean {
        return targetHex &&
            attacker.hex &&
            !targetHex.isObstacle &&
            this.#fovManager.isVisible(targetHex) &&
            targetHex.unit !== undefined &&
            this.isUnitEnemy(targetHex.unit) &&
            this.isUnitAlly(attacker) &&
            attacker.hex.isNeighbor(targetHex);
    }

    canActiveUnitActs(): boolean {
        const activeUnit = this.getActiveUnit();

        if (!activeUnit.is("Idle") || !this.isUnitAlly(activeUnit)) {
            return false;
        }
        return true;
    }

    isUnitAlly(unit: Unit): boolean {
        return unit.player === this.#roomState.username;
    }

    isUnitEnemy(unit: Unit): boolean {
        return unit.player === this.#roomState.opponent;
    }
}
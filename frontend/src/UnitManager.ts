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
    #unitIdx: number = 0;

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

    get unitIdx(): number {
        return this.#unitIdx;
    }

    setUnitIdx(unitIdx: number): void {
        this.#unitIdx = unitIdx;
    }

    getActiveUnit(): Unit {
        return this.#units[this.#unitIdx];
    }

    isDead(idx: number) {
        if (idx < 0 || idx >= this.#units.length) {
            throw new Error (`unit idx ${idx} is uncorrect`);
        }
        return this.#units[idx].isDead;
    }

    killOutOfMapUnits(deadUnits: Array<number>): void {
        for (const idx of deadUnits) {
            if (idx < 0 || idx > this.#units.length) {
                throw new Error (`next unit id ${idx} is uncorrect`);
            }
            this.#units[idx].die();
        }
    }

    spawnUnits(player1: string, player2: string): void {
        const hex1 = this.#mapManager.getHex(Hex.hashCode(-(this.#mapManager.n-1), 0))!;
        const hex2 = this.#mapManager.getHex(Hex.hashCode(this.#mapManager.n-1, 0))!;
        const hex3 = this.#mapManager.getHex(Hex.hashCode(this.#mapManager.n-2, 0))!;

        const [x1, y1] = this.#layoutManager.hexToWorld(hex1);
        const [x2, y2] = this.#layoutManager.hexToWorld(hex2);
        const [x3, y3] = this.#layoutManager.hexToWorld(hex3);

        if(player1 === this.#roomState.username && player2 === this.#roomState.opponent) {
            const unit1 = this.#factory.createAlly(hex1, x1, y1, player1, 0);
            const unit2 = this.#factory.createEnemy(undefined, undefined, undefined, player2, 1);
            const unit3 = this.#factory.createEnemy(undefined, undefined, undefined, player2, 2);
            this.setUnits([unit1, unit2, unit3]);
        }
        else if (player1 === this.#roomState.opponent && player2 === this.#roomState.username) {
            const unit1 = this.#factory.createEnemy(undefined, undefined, undefined, player1, 0);
            const unit2 = this.#factory.createAlly(hex2, x2, y2, player2, 1);
            const unit3 = this.#factory.createAlly(hex3, x3, y3, player2, 2);
             this.setUnits([unit1, unit2, unit3]);
        }
    }

    private setUnits(units: Array<Unit>) {
        this.#units = units;
        this.#unitIdx = 0;
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
            if(!this.unitIsEnemy(unit)) {
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
 
    updateUnitDirection(unit: Unit, dx: number): void {
        if (dx > 0) {
            unit.turnRight();
        }
        else if (dx < 0) {
            unit.turnLeft();
        }
    }

    canBeAttacked(targetHex: Hex, attacker: Unit) {
        return targetHex &&
            !targetHex.isObstacle &&
            this.#fovManager.isVisible(targetHex) && 
            targetHex.unit !== undefined &&
            targetHex.unit.player === this.getUnitOpponent(attacker) &&
            attacker.hex &&
            attacker.hex.isNeighbor(targetHex);
    }

    canAttack(attacker: Unit, targetHex: Hex): boolean {
        return !targetHex.isObstacle &&
            this.#fovManager.isVisible(targetHex) &&
            targetHex.unit !== undefined && 
            attacker.hex.isNeighbor(targetHex) && 
            this.unitIsEnemy(targetHex.unit) && 
            this.unitIsAlly(attacker);
    }

    canActiveUnitActs(): boolean {
        const activeUnit = this.getActiveUnit();

        if (!activeUnit.is("Idle") || !this.unitIsAlly(activeUnit)) {
            return false;
        }
        return true;
    }

    private unitIsAlly(unit: Unit): boolean {
        return unit.player === this.#roomState.username;
    }

    private unitIsEnemy(unit: Unit): boolean {
        return unit.player === this.#roomState.opponent;
    }

    getUnitOpponent(unit: Unit): string {
        if (unit.player == this.#roomState.username) {
            return this.#roomState.opponent;
        }
        return this.#roomState.username;
    }
}
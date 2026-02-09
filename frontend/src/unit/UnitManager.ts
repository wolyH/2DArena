import type { MapManager } from "../MapManager";
import { Hex } from "../Hex";
import type { Layout } from "../Layout";
import type { RoomState } from "../RoomState";
import type { Unit } from "./Unit";
import type { UnitFactory } from "./UnitFactory";
import type { FovManager } from "../FovManager";

export class UnitManager {
    readonly #mapManager: MapManager;
    readonly #layout: Layout;
    readonly #factory: UnitFactory;
    readonly #fovManager: FovManager;
    readonly #roomState: RoomState;

    #units: Array<Unit> = [];
    #unitIdx: number = 0;

    constructor(
        mapManager: MapManager,
        layout: Layout,
        factory: UnitFactory,
        fovManager: FovManager,
        roomState: RoomState,
    ) {
        this.#mapManager = mapManager;
        this.#layout = layout;
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

    get units(): ReadonlyArray<Unit> {
        return this.#units;
    }

    getActiveUnit(): Unit {
        return this.#units[this.#unitIdx];
    }

    spawnUnits(player1: string, player2: string): void {
        const hex1 = this.#mapManager.getHex(Hex.hashCode(-(this.#mapManager.n-1), 0))!;
        const hex2 = this.#mapManager.getHex(Hex.hashCode(this.#mapManager.n-1, 0))!;
        const hex3 = this.#mapManager.getHex(Hex.hashCode(this.#mapManager.n-2, 0))!;

        const [x1, y1] = this.#layout.hexToWorld(hex1);
        const [x2, y2] = this.#layout.hexToWorld(hex2);
        const [x3, y3] = this.#layout.hexToWorld(hex3);

        if(player1 === this.#roomState.username && player2 === this.#roomState.opponent) {
            const unit1 = this.#factory.createAlly(hex1, x1, y1, player1);
            const unit2 = this.#factory.createEnemy(hex2, x2, y2, player2);
            const unit3 = this.#factory.createEnemy(hex3, x3, y3, player2);
            this.setUnits([unit1, unit2, unit3]);
        }
        else if (player1 === this.#roomState.opponent && player2 === this.#roomState.username) {
            const unit1 = this.#factory.createEnemy(hex1, x1, y1, player1);
            const unit2 = this.#factory.createAlly(hex2, x2, y2, player2);
            const unit3 = this.#factory.createAlly(hex3, x3, y3, player2);
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
            targetHex.unit.player === this.getUnitOpponent(attacker);
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
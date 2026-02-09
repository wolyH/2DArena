import type { Hex } from "./Hex";

export class MovementManager {
    #path: Array<Hex> = [];
    #pathFov: Array<Set<string>> = [];
    #enemyLocationSnapshots: Array<Map<string, Hex>> = [];

    setMovement(
        path: Array<Hex>,
        pathFov: Array<Array<string>> = [],
        enemyLocationSnapshots: Array<Map<string, Hex>> = []
    ): void {
        this.#path = [...path];
        this.#pathFov = pathFov.map(stepArray => new Set(stepArray));
        this.#enemyLocationSnapshots = [...enemyLocationSnapshots];
    }

    getNextGoal(): Hex {
        return this.#path[0];
    }

    getCurrentFov(): Set<string> {
        return this.#pathFov[0];
    }

    advance(): void{
        this.#path.shift();
        this.#enemyLocationSnapshots.shift();
        this.#pathFov.shift();
    }

    isMoving(): boolean {
        return this.#path.length > 0;
    }
}
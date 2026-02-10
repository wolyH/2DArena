import type { Hex } from "./Hex";

export class MovementManager {
    #path: Array<Hex> = [];
    #pathFov: Array<Set<string>> = [];
    #enemyLocationSnapshots: Array<Map<number, Hex>> = [];

    setMovement(
        path: Array<Hex>,
        pathFov: Array<Array<string>> = [],
        enemyLocationSnapshots: Array<Map<number, Hex>> = []
    ): void {
        this.#path = [...path];
        this.#pathFov = pathFov.map(stepArray => new Set(stepArray));
        this.#enemyLocationSnapshots = [...enemyLocationSnapshots];
    }

    getNextGoal(): Hex {
        return this.#path[0];
    }

    getCurrentFovAndLocation(): {currentFov :Set<string> | undefined, currentLocation: Map<number, Hex> | undefined} {
        return {
            currentFov: this.#pathFov.length === 0 ? undefined : this.#pathFov[0],
            currentLocation: this.#enemyLocationSnapshots.length === 0 ? undefined : this.#enemyLocationSnapshots[0]
        }
    }

    shifPath(): void{
        this.#path.shift();
    }

    shiftFovAndLocation(): void {
        this.#enemyLocationSnapshots.shift();
        this.#pathFov.shift();
    }


    isMoving(): boolean {
        return this.#path.length > 0;
    }
}
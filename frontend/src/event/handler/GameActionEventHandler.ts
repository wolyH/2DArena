import type { NetworkManager } from "../../NetworkManager";
import type { UnitManager } from "../../UnitManager";
import type { AllEvents } from "../events";
import type { EventBus } from "../../utils/EvenBus";

export class GameActionEventHandler {
    readonly #eventBus: EventBus<AllEvents>;
    readonly #networkManager: NetworkManager;
    readonly #unitManager: UnitManager;

    constructor(
        eventBus: EventBus<AllEvents>,
        networkManager: NetworkManager,
        unitManager: UnitManager,
    ) {
        this.#eventBus = eventBus;
        this.#networkManager = networkManager;
        this.#unitManager = unitManager;
    }

    setup() {
        this.#eventBus.on("unit_attack_requested", (hex) => {
            const payload = {
                type: "UNIT_ATTACK", 
                unitIdx: this.#unitManager.activeUnitIdx, 
                goal: {q: hex.q, r: hex.r}
            };

            this.#networkManager.sendGameAction(
                "unit-action",
                payload
            );
        });

        this.#eventBus.on("unit_move_requested", (hex) => {
            const payload = {
                type: "UNIT_MOVE", 
                unitIdx: this.#unitManager.activeUnitIdx, 
                goal: {q: hex.q, r: hex.r}
            };
            this.#networkManager.sendGameAction(  
                "unit-action",
                payload
            );
        });

        this.#eventBus.on("turn_skip_requested", () => {
            if (this.#unitManager.canActiveUnitActs()) {
                this.#networkManager.sendGameAction(  
                    "turn-skip",
                    this.#unitManager.activeUnitIdx
                );
            }
        });

        this.#eventBus.on("forfeit_game",() => {
            this.#networkManager.sendGameAction("game-forfeit")
        })
    }
}
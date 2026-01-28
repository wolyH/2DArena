import type { AuthResponse } from "../dto/AuthResponse";
import type { Notifier } from "../utils.ts";
import type { AllEvents } from "../game.ts";

export class AuthHandler {
    #notifier: Notifier<AllEvents>

    constructor(notifier: Notifier<AllEvents>) {
        this.#notifier = notifier;
    }

    async login(username: string): Promise<void> {
        try {
            const response = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                throw new Error(`${response.status}`);
            }

            const data: AuthResponse = await response.json();

            if (data.authenticated && data.token) {
                this.#notifier.emit("login_completed", username, data.token);
            }
        } catch (error) {
            throw new Error(`Request to http://localhost:8080/api/auth/login failed: ${error}`);
        }
    }
}
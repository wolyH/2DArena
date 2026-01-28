import type { Notifier } from "../utils.ts"
import type { AllEvents } from "../game.ts";
import { UiButton } from "./UiButton.ts";
import type { UiText } from "./UiText.ts";

export abstract class Ui {
    buttons: Array<UiButton>;
    texts: Array<UiText>
    protected notifier: Notifier<AllEvents>;

    constructor(notifier: Notifier<AllEvents>) {
        this.buttons = [];
        this.texts  =[];
        this.notifier = notifier;
    }
}
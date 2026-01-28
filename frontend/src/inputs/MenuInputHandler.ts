import { InputHandler } from "./InputHandler";

export class MenuInputHandler extends InputHandler {
    setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('click', this.handleMouseClick);
        window.addEventListener('mousemove', this.handleMouseMove);
    }

    removeEventListeners(): void {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('click', this.handleMouseClick);
        window.removeEventListener('mousemove', this.handleMouseMove);
    }

    private handleResize = () => {
        const x = window.innerWidth / 2; 
        const y = window.innerHeight / 2;
        this.notifier.emit("window_resized", x, y);
    };

    private handleMouseClick = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event)
        if (button) {
            this.notifier.emit("button_clicked", button);
            return;
        }
    };

    private handleMouseMove = (event: MouseEvent) => {
        const button = this.getButtonFromEvent(event);
        
        if (button && !button.isHovered()) {
            this.notifier.emit("button_hovered", button);
            return;
        }
    };
}
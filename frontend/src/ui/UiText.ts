export class UiText {
    public x: number;
    public y: number;
    public text: string;
    public fontSize: number;
    public color: string;
    public align: CanvasTextAlign;

    constructor(
        x: number, 
        y: number, 
        text: string, 
        fontSize: number = 24, 
        color: string = "white", 
        align: CanvasTextAlign = "center"
    ) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.fontSize = fontSize;
        this.color = color;
        this.align = align;
    }
}
export class AssetManager {
    private sprites: Map<string, Array<HTMLImageElement>>;

    constructor() {
        this.sprites = new Map<string, Array<HTMLImageElement>>();
    }

    async loadSprites(urls: Map<string, Array<string>>) {
        const promises: Array<Promise<void>> = [];

        urls.forEach((spriteUrls, spriteName) => {
            if (!this.sprites.has(spriteName)) {
                this.sprites.set(spriteName, []);
            }
            const arr = this.sprites.get(spriteName)!
            for (let url of spriteUrls) {
                const img = new Image();
                promises.push(new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load ${url}`));
                }))
                arr.push(img)
                img.src = url;
            }
        })

        await Promise.all(promises);
    }

    get(spriteName: string): HTMLImageElement[] | undefined {
        return this.sprites.get(spriteName);
    }
}
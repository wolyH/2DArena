export class AssetManager {
    private spritesMap: Map<string, Array<HTMLImageElement>>;

    constructor() {
        this.spritesMap = new Map<string, Array<HTMLImageElement>>();
    }

    async loadSprites(urls: Array<[string, string, number]>) {
        const promises: Array<Promise<void>> = [];

        urls.forEach(([name, path, numFiles]) => {
            if (!this.spritesMap.has(name)) {
                this.spritesMap.set(name, []);
            }

            const sprites = this.spritesMap.get(name)!;
            for (let i = 1 ; i <= numFiles ; i++) {
                const url  =`${path}/sprite_${i}.png`;
                const img = new Image();
                promises.push(new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error(`Failed to load ${url}`));
                }))
                sprites.push(img);
                img.src = url;
            }
        })

        await Promise.all(promises);
    }

    get(spriteName: string): HTMLImageElement[] | undefined {
        return this.spritesMap.get(spriteName);
    }
}

export type EventBus<T extends Record<string, (...args: any[]) => void>> = {
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => void;
    on: <K extends keyof T>(event: K, callback: T[K]) => void;
    off: <K extends keyof T>(event: K, callback: T[K]) => void;
}

export const createEventBus = <T extends Record<string, (...args: any[]) => void>>() => {
  const eventMap = {} as Record<keyof T, Set<(...args: any[]) => void>>;

  return {
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => {
      (eventMap[event] ?? []).forEach((cb) => cb(...args));
    },

    on: <K extends keyof T>(event: K, callback: T[K]) => {
      if (!eventMap[event]) {
        eventMap[event] = new Set();
      }

      eventMap[event].add(callback);
    },

    off: <K extends keyof T>(event: K, callback: T[K]) => {
      if (!eventMap[event]) {
        return;
      }

      eventMap[event].delete(callback);
    },
  };
};
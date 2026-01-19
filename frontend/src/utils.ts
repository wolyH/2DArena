export class AssetManager {
    private sprites: Map<string, Array<HTMLImageElement>>;

    constructor() {
        this.sprites = new Map<string, Array<HTMLImageElement>>();
    }

    async loadSprites(urls: Array<[string, string, number]>) {
        const promises: Array<Promise<void>> = [];

        urls.forEach(([name, path, numFiles]) => {
            if (!this.sprites.has(name)) {
                this.sprites.set(name, []);
            }

            const arr = this.sprites.get(name)!;
            for (let i = 1 ; i <= numFiles ; i++) {
                const url  =`${path}/sprite_${i}.png`;
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

export type Notifier<T extends Record<string, (...args: any[]) => void>> = {
    emit: <K extends keyof T>(event: K, ...args: Parameters<T[K]>) => void;
    on: <K extends keyof T>(event: K, callback: T[K]) => void;
    off: <K extends keyof T>(event: K, callback: T[K]) => void;
}

export const createNotifier = <T extends Record<string, (...args: any[]) => void>>() => {
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
export declare function foliaRuntimeStatus(): {
    [k: string]: {
        status: string;
        error: string;
    };
};
export declare function ensureFoliaProvider(provider: string): Promise<number>;
export declare function stopFoliaProviders(): void;

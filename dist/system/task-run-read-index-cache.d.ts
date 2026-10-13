export declare function taskRunReadSourceVersion(file: string): Promise<string>;
export declare function readCachedTaskRunIndex(file: string): Promise<any>;
export declare function cacheTaskRunReadIndex(file: string, result: any): Readonly<{
    sourceVersion: any;
    runs: any;
}>;
export declare function clearTaskRunReadIndexCache(): void;

type DirectoryEntry = {
    name: string;
    path: string;
    type: string;
    size_bytes?: number;
};
export declare function addVisibleFileSizes<T extends DirectoryEntry>(items: T[], resolvePath: (relative: string) => string): Promise<T[]>;
export {};

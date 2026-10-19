export declare function pluginRelativePath(value: any): string;
export declare function validatePluginFiles(root: string): {
    files: {
        path: string;
        hash: string;
        size: number;
    }[];
    materialHash: string;
};
export declare function parsePluginMaterial(root: string): {
    files: {
        path: string;
        hash: string;
        size: number;
    }[];
    materialHash: string;
    name: any;
    description: string;
    version: string;
    publisher: string;
    members: any[];
    dependencies: any[];
    hooksIgnored: boolean;
};
export declare function fetchPluginMaterial(sourceUrl: string): Promise<{
    sourceRevision: any;
    sourceUrl: string;
    files: {
        path: string;
        hash: string;
        size: number;
    }[];
    materialHash: string;
    name: any;
    description: string;
    version: string;
    publisher: string;
    members: any[];
    dependencies: any[];
    hooksIgnored: boolean;
    directory: string;
}>;

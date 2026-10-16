export declare const FOLIA_PROVIDERS: readonly ["local", "netease", "qq", "kugou", "navidrome"];
export type FoliaTrack = {
    provider: string;
    instanceId: string;
    sourceId: string;
    filename?: string;
    title?: string;
    artist?: string;
    song?: any;
};
export declare function trackKey(track: FoliaTrack): string;
export declare function cleanTrack(input: any, legacyImport?: boolean): FoliaTrack;
export declare function readFoliaLibrary(owner?: string): any;
export declare function updateFoliaLibrary(owner: string, input: any): any;

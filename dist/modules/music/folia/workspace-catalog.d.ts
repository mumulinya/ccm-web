export declare function isVideoCatalogTrack(track: any): boolean;
export declare function localTrackWorkspace(filename: string): "music" | "video";
export declare function requireMusicFilename(filename: string): void;
export declare function queryWorkspaceCatalog(workspace: 'music' | 'video', query?: string, limit?: number): any[];
export declare function musicLibraryProjection(state: any): any;

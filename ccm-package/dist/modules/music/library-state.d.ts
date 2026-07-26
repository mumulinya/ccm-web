export type MusicPlaylist = {
    id: string;
    name: string;
    tracks: string[];
    createdAt: string;
    updatedAt: string;
};
export type MusicPlayMode = "list" | "random" | "single";
export type MusicQueueSource = {
    label: string;
    addedAt: string;
};
export type MusicPlaybackHistoryEvent = {
    id: string;
    filename: string;
    playedAt: string;
    source: string;
};
export type MusicLibraryState = {
    version: 3;
    favorites: string[];
    playlists: MusicPlaylist[];
    queue: string[];
    queueSources: Record<string, MusicQueueSource>;
    currentFilename: string;
    playMode: MusicPlayMode;
    history: MusicPlaybackHistoryEvent[];
    updatedAt: string;
};
declare class LibraryStateStore {
    private state;
    constructor();
    get(): any;
    toggleFavorite(filename: string, favorite?: boolean): any;
    createPlaylist(name: string): any;
    updatePlaylist(id: string, input: {
        name?: string;
        tracks?: string[];
    }): any;
    deletePlaylist(id: string): any;
    setQueue(tracks: string[], input?: {
        currentFilename?: string;
        playMode?: MusicPlayMode;
        queueSources?: Record<string, MusicQueueSource | string>;
    }): any;
    recordHistory(filename: string, source?: string): any;
    clearHistory(): any;
    removeTrack(filename: string): void;
    private load;
    private save;
}
export declare const musicLibraryState: LibraryStateStore;
export {};

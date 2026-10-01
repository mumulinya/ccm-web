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
    get(): any;
    toggleFavorite(filename: string, favorite?: boolean, expectedRevision?: number): any;
    createPlaylist(name: string, expectedRevision?: number): any;
    updatePlaylist(id: string, input: {
        name?: string;
        tracks?: string[];
        expectedRevision?: number;
    }): any;
    deletePlaylist(id: string, expectedRevision?: number): any;
    setQueue(tracks: string[], input?: {
        currentFilename?: string;
        playMode?: MusicPlayMode;
        queueSources?: Record<string, MusicQueueSource | string>;
        expectedRevision?: number;
    }): any;
    recordHistory(filename: string, source?: string, expectedRevision?: number): any;
    clearHistory(expectedRevision?: number): any;
    removeTrack(filename: string, expectedRevision?: number): any;
    replaceTrackReferences(keepFilename: string, removeFilenames: string[], expectedRevision?: number): any;
    restoreSnapshot(snapshot: any, expectedRevision?: number): any;
}
export declare const musicLibraryState: LibraryStateStore;
export {};

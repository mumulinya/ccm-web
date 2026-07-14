export type MusicPlaylist = {
    id: string;
    name: string;
    tracks: string[];
    createdAt: string;
    updatedAt: string;
};
export type MusicLibraryState = {
    version: 1;
    favorites: string[];
    playlists: MusicPlaylist[];
    queue: string[];
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
    setQueue(tracks: string[]): any;
    removeTrack(filename: string): void;
    private load;
    private save;
}
export declare const musicLibraryState: LibraryStateStore;
export {};

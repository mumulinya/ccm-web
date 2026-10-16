export declare function createSessionPersistence(filename: string, snapshot: () => any): {
    schedule(terminal?: boolean): void;
    flush: () => Promise<void>;
};

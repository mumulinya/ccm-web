export declare function boundedSseSnapshot(): {
    activeConnections: number;
    maxPendingBytes: number;
};
export declare function createBoundedSseWriter(res: any): {
    onClose(callback: () => void): void;
    write(frame: string): boolean;
    end(): void;
};

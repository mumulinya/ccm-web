export interface FileLockHandle {
    file: string;
    token: string;
    pid: number;
}
export interface FileLockOptions {
    timeoutMs?: number;
    retryMs?: number;
    staleMs?: number;
}
export declare function acquireFileLock(targetFile: string, options?: FileLockOptions): FileLockHandle;
export declare function releaseFileLock(handle: FileLockHandle): boolean;
export declare function withFileLock<T>(targetFile: string, operation: () => T, options?: FileLockOptions): T;
export declare function writeJsonAtomic(file: string, value: any): void;
export declare function readJsonWithBackup<T>(file: string, fallback: T): T;

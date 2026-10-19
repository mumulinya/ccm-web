export declare function configureDataDirectoryLifecycle(callback: () => void): void;
export declare function validateRuntimeDataDirectory(target: string): {
    source: string;
    target: string;
    exists: boolean;
    existingCcmData: boolean;
    estimatedBytes: number;
    files: number;
    freeBytes: number;
    writable: boolean;
};
export declare function runtimeDataDirectoryState(): {
    migration: any;
    current: string;
    configured: any;
    configFile: string;
    serviceManagedBy: string;
    environmentOverride: boolean;
};
export declare function migrateRuntimeDataDirectory(target: string, options?: {
    restoreBackup?: boolean;
}): {
    migration: any;
    current: string;
    configured: any;
    configFile: string;
    serviceManagedBy: string;
    environmentOverride: boolean;
};
export declare function cancelRuntimeDataDirectoryMigration(): {
    migration: any;
    current: string;
    configured: any;
    configFile: string;
    serviceManagedBy: string;
    environmentOverride: boolean;
};
export declare function recoverInterruptedDirectoryMigration(): void;

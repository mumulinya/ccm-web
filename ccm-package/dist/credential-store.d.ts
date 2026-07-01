export declare function isCredentialReference(value: any): boolean;
export declare function protectCredential(scope: string, field: string, value: any): string;
export declare function resolveCredential(value: any): string;
export declare function protectObjectSecrets(value: any, scope?: string): any;
export declare function resolveObjectSecrets(value: any): any;
export declare function migrateTomlCredentials(file: string): {
    changed: boolean;
    count: number;
};
export declare function materializeTomlCredentials(content: string): string;
export declare function migrateConfigDirectory(configDir: string): {
    files: number;
    credentials: number;
};
export declare function createPrivateRuntimeConfig(name: string, content: string): string;
export declare function schedulePrivateRuntimeConfigCleanup(file: string, delayMs?: number): void;
export declare function credentialStoreStatus(): {
    protected: boolean;
    backend: string;
    entries: number;
    store_file: string;
    key_file: string;
};
export declare function redactSensitiveText(value: any): string;

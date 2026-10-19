export declare const DEFAULT_DATA_DIRECTORY: string;
export declare const RUNTIME_CONFIG_SCHEMA = "ccm-runtime-config-v1";
export declare function runtimeConfigFile(): string;
export declare function readJson(file: string, fallback?: any): any;
export declare function atomicJson(file: string, value: any): void;
export declare function readDirectoryConfig(file?: string): any;
export declare function writeDirectoryConfig(directory: string, file?: string): {
    schema: string;
    dataDirectory: string;
    updatedAt: string;
};
export declare function resolveDataDirectory(): string;

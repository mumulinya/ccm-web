export declare const pathKey: (p: string) => string;
export declare const samePath: (a: string, b: string) => boolean;
export declare function insidePath(child: string, parent: string): boolean;
export declare function canonicalDirectory(value: string): string;
export declare function looksLikeCcm(directory: string): boolean;
export declare function scanData(directory: string, relative?: string, files?: Array<{
    path: string;
    bytes: number;
}>): {
    path: string;
    bytes: number;
}[];
export declare function validateDirectory(targetInput: string, source: string, options?: {
    packageRoot?: string;
    allowExisting?: boolean;
}): {
    source: string;
    target: string;
    exists: boolean;
    existingCcmData: boolean;
    estimatedBytes: number;
    files: number;
    freeBytes: number;
    writable: boolean;
};
export declare function copyAndVerify(source: string, staging: string, onProgress?: (files: number, bytes: number) => void): Promise<{
    copiedFiles: number;
    copiedBytes: number;
    manifest: {
        path: string;
        bytes: number;
        sha256: string;
    }[];
}>;

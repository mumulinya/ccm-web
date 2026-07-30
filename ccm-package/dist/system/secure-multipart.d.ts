export declare const MAX_MULTIPART_REQUEST_BYTES: number;
export declare const MAX_MULTIPART_FILE_BYTES: number;
export declare const MAX_MULTIPART_TOTAL_FILE_BYTES: number;
export declare const MAX_MULTIPART_FIELD_BYTES: number;
export declare const MAX_MULTIPART_FILES = 10;
export declare function parseSecureMultipartRequest(req: any, options?: {
    timeoutMs?: number;
    maxFiles?: number;
    maxRequestBytes?: number;
    maxFileBytes?: number;
    maxTotalFileBytes?: number;
    allowedExtensions?: string[];
}): Promise<{
    fields: Record<string, string>;
    files: any[];
}>;
export declare function cleanupSecureMultipartFiles(files: any[]): void;

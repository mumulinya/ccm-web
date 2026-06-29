export declare function refreshEnvPath(): void;
export declare const CCM_DIR: string;
export declare const CONFIGS_DIR: string;
export declare const PID_DIR: string;
export declare const LOG_DIR: string;
export declare const SESSIONS_DIR: string;
export declare const SHARED_DIR: string;
export declare const TASKS_FILE: string;
export declare const CRON_FILE: string;
export declare const UPLOAD_DIR: string;
export declare const GROUPS_FILE: string;
export declare const GROUP_MESSAGES_DIR: string;
export declare const GROUP_LOGS_FILE_SHARED: string;
export declare const PUBLIC_DIR: string;
export declare const METRICS_FILE: string;
export declare const FEISHU_CONFIG_FILE: string;
export declare const TEMPLATES_FILE: string;
export declare const PROJECT_CONFIGS_FILE: string;
export declare const GROUP_LOGS_FILE: string;
export declare const MUSIC_CONFIG_FILE: string;
export declare const PETS_FILE: string;
export declare const PET_PID_FILE_GLOBAL: string;
export declare function sendJson(res: any, data: any, status?: number): boolean;
export declare const TEXT_FILE_EXTENSIONS: string[];
export declare const IMAGE_FILE_EXTENSIONS: string[];
export declare const OOXML_FILE_EXTENSIONS: string[];
export declare const MAX_INLINE_FILE_CHARS = 20000;
export declare const MAX_FILE_SNAPSHOT_BYTES: number;
export declare const MAX_DIFF_CHARS = 60000;
export declare const MAX_DIFF_MATRIX_CELLS = 4000000;
export declare function ensureSharedDir(): void;
export declare function isTextFileName(name: string): boolean;
export declare function isImageFileName(name: string): boolean;
export declare function isOoxmlFileName(name: string): boolean;
export declare function getSharedFilePath(name: string): string;
export declare function truncateInlineContent(content: string, maxChars?: number): string;
export declare function decodeXmlEntities(text: string): string;
export declare function xmlToPlainText(xml: string): string;
export declare function getZipEntries(buffer: Buffer): any[];
export declare function readZipEntry(buffer: Buffer, entry: any): Buffer<ArrayBuffer>;
export declare function extractOoxmlText(filePath: string, name: string): string;
export declare function looksBinaryString(content: string): boolean;
export declare function describeFileFromPath(filePath: string, name: string, maxChars?: number): {
    name: string;
    type: string;
    readable: boolean;
    size: number;
    path: string;
    content: string;
} | {
    name: string;
    type: string;
    readable: boolean;
    size: number;
    path: string;
    content?: undefined;
};
export declare function createSharedFileRecord(name: string, source?: string): {
    source: string;
    created_at: string;
    updated_at: string;
    name: string;
    type: string;
    readable: boolean;
    size: number;
    path: string;
    content: string;
} | {
    source: string;
    created_at: string;
    updated_at: string;
    name: string;
    type: string;
    readable: boolean;
    size: number;
    path: string;
    content?: undefined;
};
export declare function normalizeSharedFileRecord(file: any): any;
export declare function normalizeSharedFileList(files: any[]): any[];
export declare function buildFilesContext(files: any[], title?: string): string;
export declare function buildUploadedFilesContext(files: any[], title?: string): string;
export declare function summarizeUploadedFiles(files: any[]): string;
export declare function getMultipartBoundary(contentType: string): string;
export declare function collectRequestBuffer(req: any): Promise<Buffer<ArrayBufferLike>>;
export declare function parseMultipart(buffer: Buffer, boundary: string): {
    files: any[];
    fields: Record<string, string>;
};
export declare function getWorkDirForProject(projectName: string): any;
export declare function parseGitStatus(workDir: string): {
    path: string;
    statusCode: string;
    stat: any;
}[];
export declare function isLikelyTextBuffer(buffer: Buffer): boolean;
export declare function readWorkingFileText(workDir: string, filePath: string): {
    exists: boolean;
    text: string;
    binary: boolean;
    tooLarge: boolean;
    truncated?: undefined;
    size?: undefined;
} | {
    exists: boolean;
    text: string;
    binary: boolean;
    tooLarge: boolean;
    truncated: boolean;
    size: number;
};
export declare function readHeadFileText(workDir: string, filePath: string): {
    exists: boolean;
    text: string;
    binary: boolean;
    tooLarge: boolean;
    truncated?: undefined;
} | {
    exists: boolean;
    text: string;
    binary: boolean;
    tooLarge: boolean;
    truncated: boolean;
};
export declare function createUnifiedDiff(oldText: string, newText: string, filePath: string, contextSize?: number): string;
export declare function buildFileDiff(workDir: string, filePath: string, before: any): {
    available: boolean;
    reason: string;
    beforeExists?: undefined;
    afterExists?: undefined;
    truncated?: undefined;
    diff?: undefined;
    additions?: undefined;
    deletions?: undefined;
} | {
    available: boolean;
    reason: string;
    beforeExists: boolean;
    afterExists: boolean;
    truncated: boolean;
    diff: string;
    additions: number;
    deletions: number;
};
export declare function createFileChangeSnapshot(workDir: string): {
    workDir: string;
    files: Record<string, any>;
};
export declare function getFileChanges(projectName: string, beforeSnapshot?: any): {
    files: {
        statusText: string;
        statusColor: string;
        statusKind: string;
        path: string;
    }[];
    count: number;
};
export declare function describeFileStatus(statusCode: string, before?: any): {
    statusText: string;
    statusColor: string;
    statusKind: string;
};
export declare function calculateTokensAndCost(inputText: string, outputText: string): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
};

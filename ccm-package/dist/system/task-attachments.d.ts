export declare const MAX_TASK_ATTACHMENT_COUNT = 10;
export declare const MAX_TASK_ATTACHMENT_FILE_BYTES: number;
export declare const MAX_TASK_ATTACHMENT_TOTAL_BYTES: number;
export declare function removeUploadedFiles(files: any[]): void;
export declare function validateTaskUploadedFiles(files: any[], retainedCount?: number, retainedBytes?: number): void;
export declare function renderTaskAttachmentContext(contexts: any[]): string;
export declare function buildTaskAttachmentMutation(input: {
    files?: any[];
    currentAttachments?: any[];
    currentContexts?: any[];
    retainedIds?: any;
    userText?: string;
}): Promise<{
    attachments: any[];
    contexts: any[];
    context: string;
    warnings: string[];
    technical: any;
    removed: any[];
}>;
export declare function parseRetainedAttachmentIds(value: any): string[];

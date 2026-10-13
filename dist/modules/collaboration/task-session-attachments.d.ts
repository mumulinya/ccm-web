/** Only a server-created multipart upload may introduce a new task-owned asset. */
export declare function retainTaskSessionUpload(taskId: string, upload: any, expectedChecksum?: string): Promise<any>;
export declare function readTaskSessionAttachment(taskId: string, ref: any): {
    file: string;
    metadata: any;
};
export declare function normalizeTaskSessionAttachments(taskId: string, rows: any[]): any[];

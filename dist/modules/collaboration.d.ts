export declare const FEISHU_SCOPES: string[];
export declare function createAndQueueTask(task: any, ctx: CollabCtx): {
    task: {
        id: string;
        title: any;
        description: any;
        target_project: any;
        group_id: any;
        assign_type: any;
        status: string;
        priority: any;
        auto_execute: boolean;
        created_at: string;
        updated_at: string;
    };
    queueResult: {
        queued: boolean;
        message: string;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
    };
};
export interface CollabCtx {
    PORT: number;
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => string;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    createFileChangeSnapshot: (workDir: string) => any;
    getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
    recordMetric: (agent: string, data: any) => void;
    toolManager: any;
    buildUploadedFilesContext: (files: any[], title?: string) => string;
    summarizeUploadedFiles: (files: any[]) => string;
    buildFilesContext: (files: any[], title?: string) => string;
    collectRequestBuffer: (req: any) => Promise<Buffer>;
    getMultipartBoundary: (contentType: string) => string;
    parseMultipart: (buffer: Buffer, boundary: string) => any;
    getSharedFilePath: (name: string) => string;
    createSharedFileRecord: (name: string, source?: string) => any;
    normalizeSharedFileList: (files: any[]) => any[];
}
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;

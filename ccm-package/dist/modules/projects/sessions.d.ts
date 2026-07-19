export declare const WEB_SESSIONS_DIR: string;
export declare function getProjectSessionDir(projectName: string): string;
export declare function findCcSessionFile(projectName: string): string;
export declare function syncFromCcToFilesystem(projectName: string): void;
export declare function syncToFilesystemToCc(projectName: string): void;
export declare function syncSessions(projectName: string): void;
export declare function getSessions(projectName: string): {
    id: any;
    name: any;
    agent_type: any;
    message_count: any;
    last_message: any;
    created_at: any;
    updated_at: any;
}[];
export declare function getSessionDetail(projectName: string, sessionId: string): any;
export declare function scheduleProjectSessionAutoTitle(project: string, sessionId: string, options?: {
    modelCall?: (request: any) => Promise<any>;
}): Promise<any>;
export declare function handleSessionsApi(pathname: string, req: any, res: any, parsed: any): boolean;

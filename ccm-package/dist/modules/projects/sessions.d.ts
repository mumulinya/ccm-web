export declare const WEB_SESSIONS_DIR: string;
export declare function getProjectSessionDir(projectName: string): string;
export declare function findCcSessionFile(projectName: string): string;
export declare function getProjectFeishuSessionTargets(projectName: string): any[];
export declare function resolveProjectFeishuTargetForAcpSession(projectName: string, acpSessionId: string): {
    target: any;
    resolution: string;
};
export declare function runProjectFeishuSessionSourceSelfTest(): {
    pass: boolean;
    checks: {
        extracts_only_project_store_targets: boolean;
        exposes_active_exact_session: boolean;
        uses_real_chat_name: boolean;
        classifies_historical_feishu_session: boolean;
        classifies_active_feishu_session: boolean;
        leaves_unbound_web_session_web: boolean;
        explicit_web_beats_historical_mapping: boolean;
        preserves_explicit_unbound_feishu_session: boolean;
        resolves_real_acp_session_to_exact_project_session: boolean;
        allows_only_unambiguous_first_turn_fallback: boolean;
        rejects_ambiguous_acp_target_mapping: boolean;
    };
};
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
    source: string;
    feishu_bindings: any[];
}[];
export declare function getSessionDetail(projectName: string, sessionId: string): any;
export declare function createProjectSessionRecord(projectName: string, name?: string, source?: string): {
    project: string;
    sessionId: string;
    name: string;
    created: boolean;
};
export declare function bindProjectFeishuSession(projectName: string, sessionId: string, targetId: string, action?: "bind" | "unbind"): {
    project: string;
    session_id: string;
    action: "bind" | "unbind";
    target: any;
};
export declare function ensureProjectAutomationSession(projectName: string, requestedSessionId?: string, title?: string): {
    project: string;
    sessionId: string;
    name: any;
    created: boolean;
};
export declare function appendProjectSessionTaskMessage(projectName: string, sessionId: string, message: any): any;
export declare function scheduleProjectSessionAutoTitle(project: string, sessionId: string, options?: {
    modelCall?: (request: any) => Promise<any>;
    turn?: {
        userMessage?: string;
        assistantMessage?: string;
        attachmentNames?: string[];
    };
}): Promise<any>;
export declare function handleSessionsApi(pathname: string, req: any, res: any, parsed: any): boolean;

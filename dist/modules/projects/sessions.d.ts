export declare const WEB_SESSIONS_DIR: string;
export declare function getProjectSessionDir(projectName: string): string;
export declare function getSessionFilePath(projectName: string, sessionId: string): string;
export declare function getProjectFeishuSessionTargets(projectName: string): any[];
export declare function resolveProjectFeishuTargetForAcpSession(projectName: string, acpSessionId: string, context?: any): {
    target: any;
    resolution: string;
    changed?: undefined;
} | {
    target: {
        id: string;
        platform_session_key: string;
        label: string;
        chat_id: string;
        open_id: string;
        thread_id: string;
        root_message_id: string;
        latest_message_id: string;
        active_session_id: string;
        session_ids: string[];
        target_type: string;
        project_id: string;
        conversation_key_v2: any;
        thread_scope: string;
    };
    resolution: string;
    changed: boolean;
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
        rejects_unproven_first_turn_fallback: boolean;
        rejects_ambiguous_acp_target_mapping: boolean;
    };
};
export declare function getSessions(projectName: string): {
    id: string;
    name: string;
    agent_type: string;
    message_count: number;
    last_message: string;
    created_at: any;
    updated_at: any;
    source: string;
    session_kind: string;
    feishu_bindings: any[];
}[];
/** Lightweight count used by the project overview endpoint.  It deliberately
 * avoids parsing every transcript just to render the sidebar summary. */
export declare function getSessionCount(projectName: string): number;
export declare function getSessionDetail(projectName: string, sessionId: string): any;
export declare function replaceProjectSessionConversation(projectInput: string, sessionIdInput: string, messages: any[], reason?: string): {
    project: string;
    sessionId: string;
    count: any;
    generation: any;
    data: any;
};
export declare function writeProjectSessionConversationBranch(projectInput: string, name: string, messages: any[]): {
    data: any;
    project: string;
    sessionId: string;
    name: string;
    source: string;
    session_kind: string;
    created: boolean;
};
export declare function createProjectSessionRecord(projectName: string, name?: string, source?: string, options?: any): {
    project: string;
    sessionId: string;
    name: string;
    source: string;
    session_kind: string;
    created: boolean;
};
export declare function applyProjectSessionProvisionalTitle(project: string, sessionId: string, message: any): {
    renamed: boolean;
    reason: string;
    name?: undefined;
    generated?: undefined;
} | {
    renamed: boolean;
    reason: string;
    name: any;
    generated?: undefined;
} | {
    renamed: boolean;
    reason: string;
    name: any;
    generated: import("../../system/session-title").SessionTitleResult;
} | {
    renamed: boolean;
    name: any;
    generated: import("../../system/session-title").SessionTitleResult;
    reason?: undefined;
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
    name: string;
    source: string;
    session_kind: string;
    created: boolean;
} | {
    project: string;
    sessionId: string;
    name: any;
    created: boolean;
};
export declare function appendProjectSessionTaskMessage(projectName: string, sessionId: string, message: any): any;
/** Append a CCM-local transcript record without triggering title generation or
 * rotating the task/session generation. Local slash commands are deliberately
 * invisible to the model and must not disturb an active Agent run. */
export declare function appendProjectSessionLocalCommandRecord(projectName: string, sessionId: string, message: any): any;
export declare function upsertProjectSessionTaskMessage(projectName: string, sessionId: string, message: any): any;
export declare function scheduleProjectSessionAutoTitle(project: string, sessionId: string, options?: {
    modelCall?: (request: any) => Promise<any>;
    turn?: {
        userMessage?: string;
        assistantMessage?: string;
        attachmentNames?: string[];
    };
}): Promise<any>;
export declare function handleSessionsApi(pathname: string, req: any, res: any, parsed: any): boolean;

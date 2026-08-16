export declare function buildGroupCollaborationRules(memberList?: string): string;
export declare const GROUP_MAIN_SESSION_CONTEXT_GUIDANCE = "\u4F1A\u8BDD\u4E0A\u4E0B\u6587\u4F7F\u7528\uFF1A\n- \u7FA4\u804A\u6700\u8FD1\u4E0A\u4E0B\u6587\u91CC\u5DF2\u7ECF\u51FA\u73B0\u7684\u7528\u6237\u9700\u6C42\u3001\u7EA6\u675F\u3001\u4E0A\u4E00\u8F6E\u8BA1\u5212\u548C\u6B65\u9AA4\u89C6\u4E3A\u5DF2\u77E5\uFF0C\u4E0D\u8981\u518D\u95EE\u201C\u8BF7\u63CF\u8FF0\u66F4\u5177\u4F53\u7684\u9700\u6C42\u201D\uFF0C\u4E5F\u4E0D\u8981\u518D\u5168\u91CF\u8BFB\u53D6\u9879\u76EE\u6587\u4EF6\u3002\n- \u7528\u6237\u8981\u6C42\u57FA\u4E8E\u524D\u6587\u505A\u5B9E\u73B0\u8BA1\u5212\u3001\u65B9\u6848\u3001\u6B65\u9AA4\uFF0C\u6216\u5C55\u5F00/\u91CD\u8FF0\u521A\u624D\u7684\u8BA1\u5212\u65F6\uFF0C\u5FC5\u987B\u8C03\u7528 ccm_present_plan\u3002\u8BA1\u5212\u7A3F\u5F62\u72B6\u89C1 Skill:ccm-implementation-plan-authoring\uFF1Atitle \u77ED\u540D\uFF1Bgoal \u6216 overview \u9489\u6B7B\u8FD0\u8F6C\u89C4\u5219\uFF1Bsteps \u7528\u4E00\u884C\u5F85\u529E\uFF08\u53EF\u6F14\u793A\u4EA4\u4ED8\u5207\u7247\uFF09\uFF0C\u6761\u6570\u6309\u9700\u6C42\u6765\uFF1B\u7981\u6B62\u6309\u8BBE\u8BA1/\u63A5\u53E3/\u524D\u7AEF/\u540E\u7AEF\u5206\u5C42\uFF0C\u4E0D\u8981\u9ED8\u8BA4 P0\u2013P4\u3002\u4E0D\u8981\u628A TestAgent \u5199\u6210\u5F85\u529E\u3002Plan Mode \u5FC5\u987B\u4EE5 ccm_present_plan \u51FA\u5361\uFF0C\u4E0D\u5F97\u6D3E\u53D1\u3002\u8BA1\u5212\u5361\u7247\u53EA\u6765\u81EA ccm_present_plan\u3002\n- \u7B2C\u4E00\u6B21\u4E3A\u5F53\u524D\u9700\u6C42\u51FA\u5B9E\u73B0\u8BA1\u5212\u65F6\uFF0C\u5141\u8BB8\u6700\u5C0F\u53EA\u8BFB\u6838\u5B9E\u4EE5\u70B9\u540D\u7F1D\u5728\u54EA\uFF1B\u5C55\u5F00\u6216\u91CD\u8FF0\u5DF2\u6709\u8BA1\u5212\u7A3F\u65F6\u4E0D\u8981\u518D\u8BFB\u9879\u76EE\u6587\u4EF6\u3002\n- \u53EA\u6709\u5F53\u524D\u6D88\u606F\u8981\u6D3E\u53D1\u6216\u6539\u4EE3\u7801\uFF0C\u4E14\u4F1A\u8BDD\u91CC\u8FD8\u7F3A\u5C11\u5177\u4F53\u6587\u4EF6\u3001\u63A5\u53E3\u6216\u914D\u7F6E\u4E8B\u5B9E\u65F6\uFF0C\u624D\u505A\u6D3E\u53D1\u524D\u7684\u6E90\u7801\u8BC1\u636E\u8BFB\u53D6\u3002\n- \u201C\u505A\u4E00\u4E2A\u5B9E\u73B0\u7684\u8BA1\u5212\u201D\u4E0D\u662F\u6D3E\u53D1\u6388\u6743\uFF0C\u4E5F\u4E0D\u662F\u9700\u6C42\u4E0D\u6E05\uFF1B\u7528\u6237\u672A\u8981\u6C42\u9A6C\u4E0A\u6539\u4EE3\u7801\u65F6\u4E0D\u8981\u8C03\u7528 ccm_dispatch\u3002\n- \u7528\u6237\u5DF2\u786E\u8BA4\u8BA1\u5212\u5361\u540E\u8C03\u7528 ccm_dispatch \u65F6\uFF1A\u5DF2\u786E\u8BA4\u8BA1\u5212\u5361\u4EA4\u63A5\u89C1 Skill:ccm-implementation-plan-authoring\uFF1Accm_dispatch \u5FC5\u987B\u8986\u76D6\u5361\u7247\u6BCF\u6761\u5207\u7247\u7684\u9A8C\u6536\u53E3\u5F84\uFF1B\u4E0D\u8981\u628A\u5361\u7247\u91CD\u5199\u6210\u524D\u7AEF/\u540E\u7AEF/\u6D4B\u8BD5\u5206\u5DE5\uFF1Btargets[].task \u8981\u5199\u660E\u843D\u5B9E\u4E86\u54EA\u4E9B\u5DF2\u786E\u8BA4\u5207\u7247\uFF1B\u4E0D\u8981\u628A TestAgent \u5199\u6210\u5361\u7247\u5F85\u529E\u6216 targets[]\u3002\n- \u7528\u6237\u8FFD\u95EE\u201C\u4F60\u4E0D\u77E5\u9053\u6211\u8981\u505A\u5565\u5417\u201D\u4E00\u7C7B\u65F6\uFF0C\u5148\u7528\u4F1A\u8BDD\u4E0A\u4E0B\u6587\u56DE\u7B54\u5DF2\u77E5\u76EE\u6807\uFF0C\u4E0D\u8981\u91CD\u65B0\u5168\u91CF\u626B\u4ED3\u5E93\u3002";
export declare function buildCoordinatorCollaborationInstructions(memberList?: string): string;
export declare function buildMemberCollaborationInstructions(projectName: string, memberList?: string): string;
export declare function buildCoordinatorPrompt(input: {
    group: any;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    extraInstructions?: string;
    maintenanceAt?: string;
    contextId?: string;
    sessionId?: string;
    groupSessionId?: string;
    group_session_id?: string;
}): string;
export declare function buildCoordinatorMaintenanceNotificationInstructions(groupInput: any, options?: any): {
    text: string;
    context: any;
    health: any;
    cleanup_commit_repair_context?: undefined;
    source_group_id?: undefined;
    group_session_id?: undefined;
    typed_scope_id?: undefined;
} | {
    text: string;
    context: any;
    health: any;
    cleanup_commit_repair_context: any;
    source_group_id: string;
    group_session_id: string;
    typed_scope_id: string;
};
export declare function buildMemberPrompt(input: {
    group: any;
    projectName: string;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
}): string;
export declare function compactText(value: string, maxLength?: number): string;
export declare const COORDINATOR_USER_INTERNAL_TEXT_PATTERN: RegExp;
export declare function sanitizeCoordinatorUserText(value: any, fallback?: any, maxLength?: number): string;
export declare function sanitizeCoordinatorUserList(items: any, fallback?: string, maxLength?: number, limit?: number): string[];
export declare function buildCoordinatorFollowUpSummary(item: any, task: string, reason: string, project: string): string;
export declare function collectCoordinatorFollowUpSpecificHints(value: any): string[];
export declare function buildCoordinatorFollowUpQuality(item: any, task: string, reason: string, project: string, context?: any): {
    schema: string;
    pass: boolean;
    status: string;
    status_label: string;
    reason: string;
    missing: string[];
    hints: string[];
    lazy_delegation: boolean;
    done_criteria_present: boolean;
};
export declare function normalizeCoordinatorFollowUpTask(item: any, task: string, reason: string, project: string, context?: any): {
    message: string;
    quality: {
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
} | {
    message: string;
    quality: {
        auto_enriched: boolean;
        enriched_hint_count: number;
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
};
export declare function coordinatorNotificationStatusLabel(status: any, receiptStatus?: any): "部分完成" | "执行未通过" | "遇到阻塞" | "结果说明待补" | "已提交结果" | "已停止" | "已返回结果";
export declare function coordinatorNotificationGaps(status: any, receiptStatus?: any): string[];
export declare function buildCodedCoordinatorNotificationRows(outputs: string[]): {
    id: string;
    agent: string;
    status: string;
    receipt_status: string;
    status_label: string;
    summary: string;
    result: string;
    gaps: string[];
}[];
export declare function buildCoordinatorReplayRepairDispatchContext(group: any): string;

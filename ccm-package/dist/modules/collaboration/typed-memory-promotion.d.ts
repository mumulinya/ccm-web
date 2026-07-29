export declare const PROMOTED_MEMORY_VERSION = 1;
export declare const PROMOTED_MEMORY_DIR: string;
export declare const PROMOTED_MEMORY_SCHEMA = "ccm-promoted-memory-store-v1";
/** 只有这些类别值得跨会话继承；reference 多为一次性链接，不升格。 */
export declare const PROMOTABLE_MEMORY_TYPES: string[];
export declare const PROMOTION_MIN_CONFIDENCE: number;
export declare const PROMOTION_ASSISTED_MIN_CONFIDENCE: number;
export declare const PROMOTION_MIN_USAGE_WEIGHT: number;
export declare const PROMOTED_MEMORY_MAX_ENTRIES: number;
export declare function getPromotedMemoryFile(projectKey: string): string;
export declare function readPromotedMemoryStore(projectKey: string): any;
export declare function listActivePromotedMemory(projectKey: string): any;
/** 升格幂等键：同一项目 + 类别 + 正文，只会有一条。 */
export declare function promotionId(projectKey: string, type: string, text: any): string;
/**
 * 汇总一个群会话 scope 里每个蒸馏文档的使用热度。
 * 消费台账带 30 天半衰期，这里按 rel_path 聚合衰减权重，
 * 「被反复召回并真的用上」的记忆权重更高。
 */
export declare function summarizePromotionUsage(scopeId: string, options?: any): {
    usageByDoc: Map<string, {
        recallCount: number;
        usedCount: number;
        weight: number;
    }>;
    ledgerValid: boolean;
    entryCount: number;
};
/** 单条候选是否够格升格。分成「本身足够确定」与「置信稍低但被反复用过」两条路径。 */
export declare function evaluatePromotionCandidate(input?: any): {
    promote: boolean;
    reason: string;
    confidence: number;
    usageWeight: number;
};
/** 从一个群会话 scope 的蒸馏台账里挑出升格候选。 */
export declare function buildTypedMemoryPromotionCandidates(scopeId: string, options?: any): {
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
};
/**
 * 提交升格。幂等：同一 promotionId 重复提交只更新证据与时间戳，
 * 不会产生第二条；已被用户撤销的条目不会被自动重新升格。
 */
export declare function promoteTypedMemoryCandidates(scopeId: string, options?: any): {
    promoted: number;
    updated: number;
    skippedRevoked: number;
    unchanged: boolean;
    file: string;
    entries: any[];
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
};
/** 撤销一条已升格记忆；撤销后不会被自动升格流程重新写回。 */
export declare function revokePromotedMemory(projectKey: string, targetPromotionId: string, options?: any): {
    project: string;
    entry: any;
    file: string;
};
/**
 * 模型把关的升格：本地阈值只做初筛（挑出「可能值得跨会话记住」的候选），
 * 最终「这条规则是否真的该跨会话继承」交给模型判断。模型不可用时退回纯本地
 * 阈值，并在结果里标注 degraded，降级可见。
 */
export declare function promoteTypedMemoryCandidatesWithModel(scopeId: string, options?: any): Promise<{
    modelJudgment: {
        applied: boolean;
        reason: string;
        degraded?: undefined;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    unchanged: boolean;
    file: string;
    entries: any[];
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        reason: string;
        degraded?: undefined;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        reason: any;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    unchanged: boolean;
    file: string;
    entries: any[];
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        reason: any;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        shortlisted: number;
        admitted: number;
        cacheHits: any;
        modelCalls: any;
        invalidJudgments: any;
        reason?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    unchanged: boolean;
    file: string;
    entries: any[];
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        shortlisted: number;
        admitted: number;
        cacheHits: any;
        modelCalls: any;
        invalidJudgments: any;
        reason?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
}>;
/**
 * 派工路径上的安全包装：升格/继承是增强能力，任何失败都不应该让整次派工失败，
 * 但必须把失败原因带回上下文包，避免静默降级。
 */
export declare function safeMemoryPromotionWithModel(scopeId: string, projectKey: string, options?: any): Promise<{
    modelJudgment: {
        applied: boolean;
        reason: string;
        degraded?: undefined;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        reason: any;
        shortlisted?: undefined;
        admitted?: undefined;
        cacheHits?: undefined;
        modelCalls?: undefined;
        invalidJudgments?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    modelJudgment: {
        applied: boolean;
        degraded: boolean;
        shortlisted: number;
        admitted: number;
        cacheHits: any;
        modelCalls: any;
        invalidJudgments: any;
        reason?: undefined;
    };
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    schema: string;
    scopeId: string;
    project: string;
    promoted: number;
    updated: number;
    failed: boolean;
    error: string;
}>;
export declare function safeMemoryPromotion(scopeId: string, projectKey: string, options?: any): {
    promoted: number;
    updated: number;
    skippedRevoked: number;
    file: string;
    entries: any;
    schema: string;
    scopeId: string;
    project: string;
    usageLedgerValid: boolean;
    candidateCount: number;
    promotableCount: number;
    candidates: any[];
    generatedAt: string;
} | {
    schema: string;
    scopeId: string;
    project: string;
    promoted: number;
    updated: number;
    failed: boolean;
    error: string;
};
export declare function safePromotedMemoryImport(scopeId: string, projectKey: string, options?: any): {
    schema: string;
    scopeId: string;
    project: string;
    imported: any;
    removed: boolean;
    write: any;
} | {
    schema: string;
    scopeId: string;
    project: string;
    imported: number;
    failed: boolean;
    error: string;
};
/**
 * 把项目的已升格记忆导入某个群会话 scope 的 typed memory。
 * 与 importProjectMemoryFilesToGroupTypedMemory 同层，让新会话开场即可继承。
 */
export declare function importPromotedMemoryToGroupTypedMemory(scopeId: string, projectKey: string, options?: any): {
    schema: string;
    scopeId: string;
    project: string;
    imported: any;
    removed: boolean;
    write: any;
};

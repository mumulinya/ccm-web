export declare const MEMORY_MODEL_JUDGMENT_VERSION = 1;
export declare const MEMORY_MODEL_JUDGMENT_CACHE_DIR: string;
export declare const MEMORY_MODEL_JUDGMENT_MAX_OUTPUT_TOKENS = 4000;
/** 每次最多送几条给模型判定，控制 token 成本。 */
export declare const MEMORY_MODEL_JUDGMENT_MAX_ITEMS: number;
export declare const MEMORY_MODEL_JUDGMENT_CACHE_MAX_ENTRIES = 500;
/** 模型判定是否启用：显式开关优先，否则跟随压缩模型是否配置齐全。 */
export declare function isMemoryModelJudgmentEnabled(config?: any): boolean;
export declare function readJudgmentCache(kind: string, scopeId: string): {
    entries: any;
    file: string;
};
/** 准入判定的本地 schema 校验。模型输出不可信，形状不对就当没判。 */
export declare function validateAdmissionJudgment(value: any): {
    valid: boolean;
    issues: string[];
    value: any;
} | {
    valid: boolean;
    issues: any[];
    value: {
        id: string;
        admit: boolean;
        confidence: number;
        why: string;
        howToApply: string;
        reason: string;
        durable: boolean;
        nonObvious: boolean;
    };
};
/** 召回重排判定的本地 schema 校验。 */
export declare function validateRerankJudgment(value: any): {
    valid: boolean;
    issues: string[];
    value: any;
} | {
    valid: boolean;
    issues: any[];
    value: {
        id: string;
        relevance: number;
        applicable: boolean;
        reason: string;
    };
};
/**
 * 模型准入判定。返回 byId 映射；模型不可用/输出不合法时返回 degraded=true，
 * 调用方据此回退到本地启发式。
 */
export declare function judgeMemoryAdmissionWithModel(scopeId: string, candidates?: any[], config?: any): Promise<{
    schema: string;
    scopeId: string;
    requested: number;
    byId: Map<string, any>;
    cacheHits: number;
    modelCalls: number;
    degraded: boolean;
    degradedReason: string;
    invalidJudgments: any[];
}>;
/**
 * 模型召回重排。只对本地初筛出的 top-K 做重排，模型看到的条目很少。
 * 返回每个 relPath 的相关度与是否适用；调用方把它折算成分数调整。
 */
export declare function rerankMemoryRecallWithModel(scopeId: string, query: string, docs?: any[], config?: any): Promise<{
    schema: string;
    scopeId: string;
    requested: number;
    byRelPath: Map<string, any>;
    cacheHits: number;
    modelCalls: number;
    degraded: boolean;
    degradedReason: string;
    invalidJudgments: any[];
}>;
/**
 * 对已构建好的上下文包做模型重排：只重排本地已初筛出的召回结果，
 * 模型判为不适用的下沉，判为高相关的上浮。任何失败都只是保持本地顺序。
 */
export declare function applyModelRecallRerankToBundle(scopeId: string, query: string, bundle: any, config?: any): Promise<{
    schema: string;
    applied: boolean;
    degraded: boolean;
    degradedReason: string;
    rerankedCount: number;
} | {
    applied: boolean;
    reason: string;
    degraded: boolean;
    rerankedCount: number;
}>;
/**
 * 把模型相关度折算成召回分数调整。
 * 判为不适用的直接给强负分（但不硬删，保留可解释性）。
 */
export declare function modelRerankScoreAdjustment(judgment: any, options?: any): {
    adjustment: number;
    applied: boolean;
    reason: any;
    relevance?: undefined;
} | {
    adjustment: number;
    applied: boolean;
    reason: any;
    relevance: number;
};

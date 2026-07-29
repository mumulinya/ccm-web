export declare const TYPED_MEMORY_CONFLICT_VERSION = 1;
export declare const TYPED_MEMORY_CONFLICT_SCHEMA = "ccm-typed-memory-conflict-ledger-v1";
export declare const TYPED_MEMORY_CONFLICT_DIR: string;
/** 未裁决冲突的召回惩罚。不直接过滤，避免「两条都消失」比矛盾更糟。 */
export declare const TYPED_MEMORY_CONFLICT_PENALTY: number;
export declare const TYPED_MEMORY_CONFLICT_MAX_PAIRS = 200;
export declare function getTypedMemoryConflictLedgerFile(scopeId: string): string;
export declare function readTypedMemoryConflictLedger(scopeId: string): any;
/** 冲突对的稳定 id：与两个文档的顺序无关。 */
export declare function conflictPairId(scopeId: string, relPathA: string, relPathB: string): string;
/** 判断两个文档的语义特征是否构成冲突。纯函数，便于自测。 */
export declare function detectSemanticConflict(featuresA: any, featuresB: any): {
    conflict: boolean;
    kind: string;
    severity: string;
    sharedConcepts: string[];
    detail: string[];
};
/** 对一批 typed memory 文档做两两冲突扫描。 */
export declare function scanTypedMemoryConflicts(scopeId: string, docs?: any[], options?: any): {
    schema: string;
    scopeId: string;
    scannedDocCount: number;
    pairCount: number;
    pairs: any[];
    generatedAt: string;
};
/**
 * 落盘冲突台账。已裁决的冲突对保持裁决结果；
 * 只要任一侧文档内容变了（checksum 变化），裁决作废重新待裁。
 */
export declare function recordTypedMemoryConflicts(scopeId: string, docs?: any[], options?: any): {
    persisted: boolean;
    pairs: any;
    file: string;
    schema: string;
    scopeId: string;
    scannedDocCount: number;
    pairCount: number;
    generatedAt: string;
};
/** 用户裁决：保留左侧 / 保留右侧 / 两者共存（说明适用条件不同）。 */
export declare function resolveTypedMemoryConflict(scopeId: string, pairId: string, options?: any): {
    scopeId: string;
    pair: any;
    file: string;
};
/**
 * 召回侧索引：relPath → 本文档参与的未裁决冲突 + 是否已被裁决淘汰。
 * 供打分环节做降权与标注。
 */
export declare function buildTypedMemoryConflictRecallIndex(scopeId: string): {
    pendingByRelPath: Map<string, any[]>;
    losers: Set<string>;
    pairCount: any;
    file: any;
};
/**
 * 召回打分惩罚。未裁决冲突降权但保留（两条都消失比矛盾更糟）；
 * 已被裁决淘汰的一方直接判定为不应召回。
 */
export declare function evaluateTypedMemoryConflictPenalty(relPath: string, conflictIndex: any): {
    adjustment: number;
    suppressed: boolean;
    pendingConflicts: any[];
    reason?: undefined;
} | {
    adjustment: number;
    suppressed: boolean;
    reason: string;
    pendingConflicts: any;
};

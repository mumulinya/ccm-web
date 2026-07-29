/**
 * 独立复核结论的新鲜度（freshness）判定。
 *
 * 背景：复核证据原本只有 (reviewer|subject) 维度的"取最新一条"，没有任何时间或代码版本关联，
 * 门禁结构上无法发现「TestAgent 判定通过之后代码又被改过」。今天之所以安全，是因为所有改代码的
 * 返工路径恰好都会把最新结论压成非通过态；只要将来新增一条"改代码但不驳回结论"的路径就会静默放行。
 *
 * 这里给复核结论盖上被复核的变更指纹（文件路径集合的稳定哈希）与时间戳，门禁在消费时比对当前变更集：
 * 指纹不一致 ⇒ 结论已过期，按 needs_recheck 处理（阻断验收并要求重新复验）。
 *
 * 兼容性：缺指纹的旧证据一律不判定为过期（unknown），保持既有行为，避免历史任务被误拦。
 */
export declare const REVIEW_FRESHNESS_SCHEMA = "ccm-review-freshness-v1";
export type ReviewFreshnessState = "fresh" | "stale" | "unknown";
/** 由变更集合构造稳定指纹：路径去重排序后哈希，忽略顺序与重复。 */
export declare function buildReviewChangeFingerprint(...sources: any[]): string;
/** 生产端：给一条复核结论盖新鲜度戳。reviewedChanges 是本次复核实际覆盖的变更集合。 */
export declare function buildReviewFreshnessStamp(reviewedChanges: any[], at?: string): {
    schema: string;
    reviewedAt: string;
    reviewed_at: string;
    reviewedChangeFingerprint: string;
    reviewed_change_fingerprint: string;
    reviewedChangeCount: number;
};
export declare function readReviewFingerprint(entry: any): string;
/**
 * 消费端：比对复核结论指纹与当前变更集指纹。
 * 任一侧缺指纹都返回 unknown（不阻断），只有两侧都有且不一致才判 stale。
 */
export declare function classifyReviewFreshness(entry: any, currentFingerprint: string): ReviewFreshnessState;
/**
 * 把过期的"通过"结论降级为 needs_recheck，供 buildIndependentReviewGate 消费。
 * 只降级通过态：已经是 failed / needs_* 的结论本来就会阻断，无需改写。
 */
export declare function applyReviewFreshnessToEvidence(evidence: any[], currentFingerprint: string): {
    rows: any[];
    staleCount: number;
};
export declare function runReviewFreshnessSelfTest(): {
    pass: boolean;
    checks: {
        fingerprintIgnoresOrderAndDuplicates: boolean;
        fingerprintChangesWithNewFile: boolean;
        emptyChangesYieldNoFingerprint: boolean;
        stalePassDowngradedToRecheck: boolean;
        freshPassKeptAsPassed: boolean;
        legacyEvidenceNeverStale: boolean;
        failedEvidenceUntouched: boolean;
        noCurrentFingerprintNeverStale: boolean;
    };
};

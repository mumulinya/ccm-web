"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_FRESHNESS_SCHEMA = void 0;
exports.buildReviewChangeFingerprint = buildReviewChangeFingerprint;
exports.buildReviewFreshnessStamp = buildReviewFreshnessStamp;
exports.readReviewFingerprint = readReviewFingerprint;
exports.classifyReviewFreshness = classifyReviewFreshness;
exports.applyReviewFreshnessToEvidence = applyReviewFreshnessToEvidence;
exports.runReviewFreshnessSelfTest = runReviewFreshnessSelfTest;
const crypto = __importStar(require("crypto"));
exports.REVIEW_FRESHNESS_SCHEMA = "ccm-review-freshness-v1";
function normalizeChangePath(value) {
    if (!value)
        return "";
    if (typeof value === "string")
        return value.trim().replace(/\\/g, "/");
    const raw = value.path || value.file || value.filename || value.name || "";
    const project = String(value.project || value.target_project || value.agent || "").trim();
    const normalized = String(raw || "").trim().replace(/\\/g, "/");
    if (!normalized)
        return "";
    return project ? `${project}:${normalized}` : normalized;
}
/** 由变更集合构造稳定指纹：路径去重排序后哈希，忽略顺序与重复。 */
function buildReviewChangeFingerprint(...sources) {
    const paths = new Set();
    const visit = (value) => {
        if (!value)
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (typeof value === "object" && Array.isArray(value.files)) {
            for (const item of value.files)
                visit(item);
            return;
        }
        const normalized = normalizeChangePath(value);
        if (normalized)
            paths.add(normalized);
    };
    for (const source of sources)
        visit(source);
    if (paths.size === 0)
        return "";
    const canonical = [...paths].sort().join("\n");
    return `${paths.size}:${crypto.createHash("sha1").update(canonical).digest("hex").slice(0, 16)}`;
}
/** 生产端：给一条复核结论盖新鲜度戳。reviewedChanges 是本次复核实际覆盖的变更集合。 */
function buildReviewFreshnessStamp(reviewedChanges, at = new Date().toISOString()) {
    const fingerprint = buildReviewChangeFingerprint(reviewedChanges);
    return {
        schema: exports.REVIEW_FRESHNESS_SCHEMA,
        reviewedAt: at,
        reviewed_at: at,
        reviewedChangeFingerprint: fingerprint,
        reviewed_change_fingerprint: fingerprint,
        reviewedChangeCount: fingerprint ? Number(fingerprint.split(":")[0]) : 0,
    };
}
function readReviewFingerprint(entry) {
    return String(entry?.reviewedChangeFingerprint
        || entry?.reviewed_change_fingerprint
        || entry?.freshness?.reviewedChangeFingerprint
        || entry?.freshness?.reviewed_change_fingerprint
        || "").trim();
}
/**
 * 消费端：比对复核结论指纹与当前变更集指纹。
 * 任一侧缺指纹都返回 unknown（不阻断），只有两侧都有且不一致才判 stale。
 */
function classifyReviewFreshness(entry, currentFingerprint) {
    const reviewed = readReviewFingerprint(entry);
    const current = String(currentFingerprint || "").trim();
    if (!reviewed || !current)
        return "unknown";
    return reviewed === current ? "fresh" : "stale";
}
/**
 * 把过期的"通过"结论降级为 needs_recheck，供 buildIndependentReviewGate 消费。
 * 只降级通过态：已经是 failed / needs_* 的结论本来就会阻断，无需改写。
 */
function applyReviewFreshnessToEvidence(evidence, currentFingerprint) {
    const current = String(currentFingerprint || "").trim();
    let staleCount = 0;
    const rows = (Array.isArray(evidence) ? evidence : []).map((item) => {
        const state = classifyReviewFreshness(item, current);
        if (state !== "stale" || item?.status !== "passed") {
            return { ...item, freshness_state: state };
        }
        staleCount += 1;
        return {
            ...item,
            status: "needs_recheck",
            verdict: "needs_recheck",
            freshness_state: "stale",
            stale_reason: "复核通过后代码又发生变更，需要基于最新改动重新复验",
            summary: `${String(item?.summary || "").trim()}（该结论已过期：复核后代码又有改动，需要重新复验）`.trim(),
        };
    });
    return { rows, staleCount };
}
function runReviewFreshnessSelfTest() {
    const changesA = [{ path: "src/a.ts", project: "web" }, { path: "src/b.ts", project: "web" }];
    const changesAReordered = [{ path: "src/b.ts", project: "web" }, { path: "src/a.ts", project: "web" }, { path: "src/a.ts", project: "web" }];
    const changesB = [...changesA, { path: "src/c.ts", project: "web" }];
    const stamp = buildReviewFreshnessStamp(changesA);
    const passedEntry = { reviewer: "test-agent", reviewSubject: "web", status: "passed", summary: "复核通过", ...stamp };
    const failedEntry = { reviewer: "test-agent", reviewSubject: "web", status: "failed", summary: "复核未通过", ...stamp };
    const legacyEntry = { reviewer: "test-agent", reviewSubject: "web", status: "passed", summary: "旧证据无指纹" };
    const fingerprintA = buildReviewChangeFingerprint(changesA);
    const fingerprintB = buildReviewChangeFingerprint(changesB);
    const staleApplied = applyReviewFreshnessToEvidence([passedEntry], fingerprintB);
    const freshApplied = applyReviewFreshnessToEvidence([passedEntry], fingerprintA);
    const legacyApplied = applyReviewFreshnessToEvidence([legacyEntry], fingerprintB);
    const failedApplied = applyReviewFreshnessToEvidence([failedEntry], fingerprintB);
    const checks = {
        fingerprintIgnoresOrderAndDuplicates: buildReviewChangeFingerprint(changesAReordered) === fingerprintA,
        fingerprintChangesWithNewFile: fingerprintA !== fingerprintB && !!fingerprintA && !!fingerprintB,
        emptyChangesYieldNoFingerprint: buildReviewChangeFingerprint([]) === "",
        stalePassDowngradedToRecheck: staleApplied.rows[0].status === "needs_recheck" && staleApplied.staleCount === 1,
        freshPassKeptAsPassed: freshApplied.rows[0].status === "passed" && freshApplied.staleCount === 0,
        legacyEvidenceNeverStale: legacyApplied.rows[0].status === "passed" && legacyApplied.staleCount === 0 && legacyApplied.rows[0].freshness_state === "unknown",
        failedEvidenceUntouched: failedApplied.rows[0].status === "failed" && failedApplied.staleCount === 0,
        noCurrentFingerprintNeverStale: applyReviewFreshnessToEvidence([passedEntry], "").rows[0].status === "passed",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=review-freshness.js.map
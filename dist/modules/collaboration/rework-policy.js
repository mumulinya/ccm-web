"use strict";
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
exports.COORDINATOR_REVIEW_TURN_BUDGET = exports.AUTO_REWORK_MAX_ROUNDS = void 0;
exports.automaticReworkLimit = automaticReworkLimit;
exports.reserveAutomaticRework = reserveAutomaticRework;
exports.createReviewCycleId = createReviewCycleId;
exports.buildReworkExhaustedUpdate = buildReworkExhaustedUpdate;
exports.nextReviewRound = nextReviewRound;
exports.buildReviewCycleResetUpdate = buildReviewCycleResetUpdate;
/**
 * 自动返工轮次策略：全链路唯一配置源。
 * 业务约定为最多 3 轮自动返工；群聊验收、日常开发、项目主 Agent、任务执行器
 * 必须统一引用这里，禁止各自硬编码。
 * 可用环境变量 CCM_AUTO_REWORK_MAX_ROUNDS 覆盖（钳制在 1-10）。
 */
exports.AUTO_REWORK_MAX_ROUNDS = (() => {
    const parsed = Math.floor(Number(process.env.CCM_AUTO_REWORK_MAX_ROUNDS || 3));
    return Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 3;
})();
/**
 * 协调者验收会话轮预算：初次独立复核、实现修复、TestAgent 复验、可选抽查修复、
 * 最终验收各需一轮，因此在返工上限之外再留 2 轮复核开销。
 */
exports.COORDINATOR_REVIEW_TURN_BUDGET = exports.AUTO_REWORK_MAX_ROUNDS + 2;
const dispatch_profile_1 = require("../../agents/dispatch-profile");
function automaticReworkLimit(task) {
    return task?.dispatch_profile_snapshot || task?.task_spec?.dispatch_profile_snapshot ? (0, dispatch_profile_1.reworkLimitForDispatchProfile)((0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task).profile) : exports.AUTO_REWORK_MAX_ROUNDS;
}
/** Reserve before enqueue/start. Evidence contains trusted checksums, never model output. */
function reserveAutomaticRework(task, gaps, evidence) {
    const max = automaticReworkLimit(task);
    const round = Math.max(0, Number(task?.rework_round || 0));
    // Review timestamps and formatting cannot turn the same missing evidence
    // into a new repair. Keep error codes, paths and substantive text intact.
    const stableGaps = gaps.map(gap => String(gap).replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, "<review-time>").replace(/\s+/g, " ").trim());
    const gapChecksum = (0, dispatch_profile_1.dispatchProfileChecksum)([...new Set(stableGaps)].sort());
    const evidenceChecksum = (0, dispatch_profile_1.dispatchProfileChecksum)(evidence || {});
    const previous = task?.rework_progress;
    const reason = evidence?.available === false ? "rework_evidence_unavailable" : round >= max ? "rework_exhausted" : previous?.gapChecksum === gapChecksum && previous?.evidenceChecksum === evidenceChecksum ? "rework_no_progress" : "";
    if (reason)
        return { allowed: false, reason, update: { status: "blocked", acceptance_state: "needs_user", status_detail: reason === "rework_exhausted" ? "自动返工次数已耗尽" : reason === "rework_evidence_unavailable" ? "无法核对可信工作区证据，停止自动返工" : "相同验收缺口没有新增可信证据，停止自动返工", rework_exhausted: { rounds: round, maxRounds: max, reason, at: new Date().toISOString() } } };
    return { allowed: true, reason: "", update: { rework_round: round + 1, rework_max_rounds: max, rework_progress: { gapChecksum, evidenceChecksum }, review_cycle_id: task?.review_cycle_id || createReviewCycleId(task?.id) } };
}
function createReviewCycleId(scope = "review") {
    const normalized = String(scope || "review").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "review";
    return `${normalized}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}
/**
 * 返工耗尽的统一终态标记：项目直派（status=blocked）与群聊验收（needs_user）
 * 两条路径的字面状态不同，但都必须写入同一个 rework_exhausted 结构化标记，
 * 供监工聚合、前端展示与排查时统一识别，不再依赖各自的状态字面量。
 */
function buildReworkExhaustedUpdate(detail, input = { path: "project_direct" }) {
    const frozen = !!input.task?.dispatch_profile_snapshot;
    if (frozen && input.task.rework_exhausted)
        return { rework_exhausted: input.task.rework_exhausted };
    const rounds = frozen ? Math.max(0, Number(input.task.rework_round || 0)) : Math.max(1, Number(input.rounds || exports.AUTO_REWORK_MAX_ROUNDS));
    const maxRounds = frozen ? automaticReworkLimit(input.task) : Math.max(1, Number(input.maxRounds || exports.AUTO_REWORK_MAX_ROUNDS));
    return {
        rework_exhausted: {
            rounds,
            maxRounds,
            reason: rounds >= maxRounds ? "rework_exhausted" : "rework_review_blocked",
            path: input.path,
            detail: String(detail || "").slice(0, 500),
            at: new Date().toISOString(),
        },
    };
}
/**
 * 验收轮次按「返工周期」计算，不跨周期累加。
 * review_round 是本周期已用轮次（重试/继续返工时清零），review_round_total 是全生命周期累计（只增，用于审计）。
 * 历史任务只有 review_round 且可能已达上限，这里不把旧值当作本周期消耗，否则新周期会零返工机会直接 blocked。
 */
function nextReviewRound(task) {
    const used = Math.max(0, Math.floor(Number(task?.review_round || 0)));
    const maxRounds = task?.dispatch_profile_snapshot ? automaticReworkLimit(task) + 1 : exports.AUTO_REWORK_MAX_ROUNDS;
    const round = Math.max(1, Math.min(maxRounds, used + 1));
    const total = Math.max(round, Math.floor(Number(task?.review_round_total || 0)) + 1);
    return {
        round,
        total,
        isFinalRound: round >= maxRounds,
        maxRounds,
    };
}
/** 仅明确的人工 retry 开始新周期；恢复、监控和普通返工保留消耗。 */
function buildReviewCycleResetUpdate(task, reason) {
    const used = Math.max(0, Math.floor(Number(task?.review_round || 0)));
    return {
        review_round: 0,
        rework_round: 0,
        rework_progress: null,
        scope_approval_attempt_id: null,
        review_round_total: Math.max(used, Math.floor(Number(task?.review_round_total || 0))),
        review_cycle_id: createReviewCycleId(String(task?.id || "review")),
        review_cycle_reset: {
            previous_round: used,
            previous_cycle_id: String(task?.review_cycle_id || ""),
            reason: String(reason || "").slice(0, 200),
            at: new Date().toISOString(),
        },
        rework_exhausted: null,
    };
}
const crypto = __importStar(require("crypto"));
//# sourceMappingURL=rework-policy.js.map
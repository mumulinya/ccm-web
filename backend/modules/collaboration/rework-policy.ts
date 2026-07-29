/**
 * 自动返工轮次策略：全链路唯一配置源。
 * 业务约定为最多 3 轮自动返工；群聊验收、日常开发、项目主 Agent、任务执行器
 * 必须统一引用这里，禁止各自硬编码。
 * 可用环境变量 CCM_AUTO_REWORK_MAX_ROUNDS 覆盖（钳制在 1-10）。
 */
export const AUTO_REWORK_MAX_ROUNDS = (() => {
  const parsed = Math.floor(Number(process.env.CCM_AUTO_REWORK_MAX_ROUNDS || 3));
  return Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 3;
})();

/**
 * 协调者验收会话轮预算：初次独立复核、实现修复、TestAgent 复验、可选抽查修复、
 * 最终验收各需一轮，因此在返工上限之外再留 2 轮复核开销。
 */
export const COORDINATOR_REVIEW_TURN_BUDGET = AUTO_REWORK_MAX_ROUNDS + 2;

export function createReviewCycleId(scope = "review") {
  const normalized = String(scope || "review").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "review";
  return `${normalized}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * 返工耗尽的统一终态标记：项目直派（status=blocked）与群聊验收（needs_user）
 * 两条路径的字面状态不同，但都必须写入同一个 rework_exhausted 结构化标记，
 * 供监工聚合、前端展示与排查时统一识别，不再依赖各自的状态字面量。
 */
export function buildReworkExhaustedUpdate(detail: string, input: { path: "project_direct" | "group_review"; rounds?: number } = { path: "project_direct" }) {
  return {
    rework_exhausted: {
      rounds: Math.max(1, Number(input.rounds || AUTO_REWORK_MAX_ROUNDS)),
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
export function nextReviewRound(task: any) {
  const used = Math.max(0, Math.floor(Number(task?.review_round || 0)));
  const round = Math.max(1, Math.min(AUTO_REWORK_MAX_ROUNDS, used + 1));
  const total = Math.max(round, Math.floor(Number(task?.review_round_total || 0)) + 1);
  return {
    round,
    total,
    isFinalRound: round >= AUTO_REWORK_MAX_ROUNDS,
    maxRounds: AUTO_REWORK_MAX_ROUNDS,
  };
}

/** 新一轮返工周期开始（用户重试 / 监工继续返工）时清零本周期轮次，保留累计值。 */
export function buildReviewCycleResetUpdate(task: any, reason: string) {
  const used = Math.max(0, Math.floor(Number(task?.review_round || 0)));
  return {
    review_round: 0,
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
import * as crypto from "crypto";

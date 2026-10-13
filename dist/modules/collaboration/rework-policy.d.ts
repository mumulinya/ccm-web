/**
 * 自动返工轮次策略：全链路唯一配置源。
 * 业务约定为最多 3 轮自动返工；群聊验收、日常开发、项目主 Agent、任务执行器
 * 必须统一引用这里，禁止各自硬编码。
 * 可用环境变量 CCM_AUTO_REWORK_MAX_ROUNDS 覆盖（钳制在 1-10）。
 */
export declare const AUTO_REWORK_MAX_ROUNDS: number;
/**
 * 协调者验收会话轮预算：初次独立复核、实现修复、TestAgent 复验、可选抽查修复、
 * 最终验收各需一轮，因此在返工上限之外再留 2 轮复核开销。
 */
export declare const COORDINATOR_REVIEW_TURN_BUDGET: number;
export declare function automaticReworkLimit(task: any): number;
/** Reserve before enqueue/start. Evidence contains trusted checksums, never model output. */
export declare function reserveAutomaticRework(task: any, gaps: string[], evidence: any): {
    allowed: boolean;
    reason: string;
    update: {
        status: string;
        acceptance_state: string;
        status_detail: string;
        rework_exhausted: {
            rounds: number;
            maxRounds: number;
            reason: string;
            at: string;
        };
        rework_round?: undefined;
        rework_max_rounds?: undefined;
        rework_progress?: undefined;
        review_cycle_id?: undefined;
    };
} | {
    allowed: boolean;
    reason: string;
    update: {
        rework_round: number;
        rework_max_rounds: number;
        rework_progress: {
            gapChecksum: string;
            evidenceChecksum: string;
        };
        review_cycle_id: any;
        status?: undefined;
        acceptance_state?: undefined;
        status_detail?: undefined;
        rework_exhausted?: undefined;
    };
};
export declare function createReviewCycleId(scope?: string): string;
/**
 * 返工耗尽的统一终态标记：项目直派（status=blocked）与群聊验收（needs_user）
 * 两条路径的字面状态不同，但都必须写入同一个 rework_exhausted 结构化标记，
 * 供监工聚合、前端展示与排查时统一识别，不再依赖各自的状态字面量。
 */
export declare function buildReworkExhaustedUpdate(detail: string, input?: {
    path: "project_direct" | "group_review";
    rounds?: number;
    maxRounds?: number;
    task?: any;
}): {
    rework_exhausted: any;
};
/**
 * 验收轮次按「返工周期」计算，不跨周期累加。
 * review_round 是本周期已用轮次（重试/继续返工时清零），review_round_total 是全生命周期累计（只增，用于审计）。
 * 历史任务只有 review_round 且可能已达上限，这里不把旧值当作本周期消耗，否则新周期会零返工机会直接 blocked。
 */
export declare function nextReviewRound(task: any): {
    round: number;
    total: number;
    isFinalRound: boolean;
    maxRounds: number;
};
/** 仅明确的人工 retry 开始新周期；恢复、监控和普通返工保留消耗。 */
export declare function buildReviewCycleResetUpdate(task: any, reason: string): {
    review_round: number;
    rework_round: number;
    rework_progress: any;
    scope_approval_attempt_id: any;
    review_round_total: number;
    review_cycle_id: string;
    review_cycle_reset: {
        previous_round: number;
        previous_cycle_id: string;
        reason: string;
        at: string;
    };
    rework_exhausted: any;
};

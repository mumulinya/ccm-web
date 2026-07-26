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

export declare const TYPED_MEMORY_DISTILLATION_MIN_PENDING_MESSAGES: number;
export declare const TYPED_MEMORY_DISTILLATION_MAX_IDLE_MS: number;
/** 纯决策函数：给定 preflight 信号，判断本轮是否值得进蒸馏事务。 */
export declare function decideTypedMemoryDistillationRun(input?: any): {
    run: boolean;
    reason: string;
    schema: string;
    pendingMessageCount: number;
    minPendingMessages: number;
    maxIdleMs: number;
    idleMs: number;
    lastDistilledAt: string;
};
/**
 * 按节流策略决定是否真正执行蒸馏。惰性 require 目标模块，避免与
 * group-memory-distillation / group-memory-context 之间形成循环依赖。
 */
export declare function runTypedMemoryDistillationIfDue(groupId: string, messages?: any[], memory?: any, options?: any): any;

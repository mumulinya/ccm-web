"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaCcmAiCallConfig = foliaCcmAiCallConfig;
// Folia 的主题、分词和连接探测与上游一致关闭额外推理；仅覆盖本次调用，不修改 CCM 模型配置。
function foliaCcmAiCallConfig(base, timeoutMs = 60000) {
    const timeout = Number(timeoutMs);
    return { ...base, timeoutMs: Number.isFinite(timeout) ? Math.min(120000, Math.max(5000, timeout)) : 60000,
        reasoningEffort: 'off', reasoning_effort: 'off' };
}
//# sourceMappingURL=ai-call-config.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR = exports.MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR = exports.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS = exports.CC_ALIGNED_FILE_READ_MAX_TOKENS = void 0;
exports.boundedToolResultLimit = boundedToolResultLimit;
// Claude Code parity limits. These are raw per-call ceilings. The final
// provider payload gate still applies the active model context window, output
// reserve and compaction buffer before any result reaches the model.
exports.CC_ALIGNED_FILE_READ_MAX_TOKENS = 25_000;
exports.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS = 100_000;
exports.MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";
exports.GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR = "GROUP_MAIN_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";
function boundedToolResultLimit(value) {
    const requested = Number(value ?? exports.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS);
    if (!Number.isFinite(requested) || requested <= 0)
        return exports.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS;
    return Math.max(1, Math.min(exports.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS, Math.floor(requested)));
}
//# sourceMappingURL=cc-tool-result-limits.js.map
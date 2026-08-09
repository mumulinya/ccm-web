// Claude Code parity limits. These are raw per-call ceilings. The final
// provider payload gate still applies the active model context window, output
// reserve and compaction buffer before any result reaches the model.
export const CC_ALIGNED_FILE_READ_MAX_TOKENS = 25_000;
export const CC_ALIGNED_TOOL_RESULT_MAX_TOKENS = 100_000;

export const MAIN_AGENT_TOOL_RESULT_LIMIT_ERROR = "MAIN_AGENT_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";
export const GROUP_MAIN_TOOL_RESULT_LIMIT_ERROR = "GROUP_MAIN_TOOL_RESULT_EXCEEDS_100K_TOKEN_BUDGET";

export function boundedToolResultLimit(value?: number) {
  const requested = Number(value ?? CC_ALIGNED_TOOL_RESULT_MAX_TOKENS);
  if (!Number.isFinite(requested) || requested <= 0) return CC_ALIGNED_TOOL_RESULT_MAX_TOKENS;
  return Math.max(1, Math.min(CC_ALIGNED_TOOL_RESULT_MAX_TOKENS, Math.floor(requested)));
}

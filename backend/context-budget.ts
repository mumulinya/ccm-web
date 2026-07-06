export type ContextBudgetInput = {
  prompt?: any;
  context?: any;
  history?: any[];
  maxChars?: number;
  maxTokens?: number;
  reservedOutputTokens?: number;
  autoCompactBufferTokens?: number;
};

export const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
export const DEFAULT_RESERVED_OUTPUT_TOKENS = 20_000;
export const DEFAULT_AUTO_COMPACT_BUFFER_TOKENS = 13_000;
export const DEFAULT_WARNING_BUFFER_TOKENS = 20_000;
export const DEFAULT_MANUAL_COMPACT_BUFFER_TOKENS = 3_000;

function stringifyContextPart(value: any) {
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function estimateTextTokens(value: any) {
  const text = String(value || "");
  let ascii = 0;
  let nonAscii = 0;
  for (const char of text) {
    if (char.charCodeAt(0) <= 0x7f) ascii += 1;
    else nonAscii += 1;
  }
  return Math.max(1, Math.ceil((ascii / 4 + nonAscii) * (4 / 3)));
}

export function compactPreserveEdges(value: any, max = 1200, marker = "…[中间内容已压缩，可从原始记录恢复]…") {
  const text = String(value || "").replace(/\r/g, "").trim();
  if (text.length <= max) return text;
  const markerWithBreaks = `\n${marker}\n`;
  const head = Math.max(1, Math.floor(max * 0.62));
  const tail = Math.max(1, max - head - markerWithBreaks.length);
  return `${text.slice(0, head)}${markerWithBreaks}${text.slice(-tail)}`;
}

export function buildContextBudget(input: ContextBudgetInput = {}) {
  const parts = [
    input.prompt,
    input.context,
    ...(Array.isArray(input.history) ? input.history.map(item => item?.content || item) : []),
  ].map(stringifyContextPart).filter(Boolean);
  const chars = parts.reduce((sum, item) => sum + item.length, 0);
  const estimatedTokens = parts.reduce((sum, item) => sum + estimateTextTokens(item), 0);
  const maxChars = Number(input.maxChars || 48_000);
  const maxTokens = Number(input.maxTokens || DEFAULT_CONTEXT_WINDOW_TOKENS - DEFAULT_RESERVED_OUTPUT_TOKENS);
  const pressure = maxTokens > 0 ? Math.round((estimatedTokens / maxTokens) * 1000) / 10 : 0;
  return {
    chars,
    estimated_tokens: estimatedTokens,
    max_chars: maxChars,
    max_tokens: maxTokens,
    reserved_output_tokens: Number(input.reservedOutputTokens || DEFAULT_RESERVED_OUTPUT_TOKENS),
    auto_compact_threshold: getAutoCompactThreshold({ maxTokens, reservedOutputTokens: input.reservedOutputTokens, autoCompactBufferTokens: input.autoCompactBufferTokens }),
    warning_threshold: Math.max(0, maxTokens - DEFAULT_WARNING_BUFFER_TOKENS),
    blocking_threshold: Math.max(0, maxTokens - DEFAULT_MANUAL_COMPACT_BUFFER_TOKENS),
    pressure,
    compact_recommended: chars > maxChars || estimatedTokens > maxTokens * 0.82,
    boundary: chars > maxChars
      ? { type: "head_tail", preserved_head_chars: Math.floor(maxChars * 0.58), preserved_tail_chars: Math.floor(maxChars * 0.32) }
      : null,
  };
}

export function getAutoCompactThreshold(input: { maxTokens?: number; reservedOutputTokens?: number; autoCompactBufferTokens?: number } = {}) {
  const contextWindow = Number(input.maxTokens || DEFAULT_CONTEXT_WINDOW_TOKENS);
  const reserved = Math.min(contextWindow - 16_000, Math.max(0, Number(input.reservedOutputTokens ?? DEFAULT_RESERVED_OUTPUT_TOKENS)));
  const buffer = Math.max(0, Number(input.autoCompactBufferTokens ?? DEFAULT_AUTO_COMPACT_BUFFER_TOKENS));
  return Math.max(18_000, contextWindow - reserved - buffer);
}

export function microCompactText(value: any, maxChars = 8000) {
  const text = String(value || "");
  if (text.length <= maxChars) {
    return {
      text,
      compacted: false,
      original_chars: text.length,
      compacted_chars: text.length,
      tokens_before: estimateTextTokens(text),
      tokens_after: estimateTextTokens(text),
    };
  }
  const compacted = compactPreserveEdges(text, maxChars, `…[micro-compact: 原文 ${text.length} 字符，已保留首尾，可按来源回溯]…`);
  return {
    text: compacted,
    compacted: true,
    original_chars: text.length,
    compacted_chars: compacted.length,
    tokens_before: estimateTextTokens(text),
    tokens_after: estimateTextTokens(compacted),
  };
}

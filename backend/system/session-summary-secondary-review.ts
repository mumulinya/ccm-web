import * as crypto from "crypto";
import {
  callAnthropicCompatibleJson,
  callGeminiCompatibleJson,
  callOpenAiCompatibleJson,
} from "../modules/collaboration/group-orchestrator-llm-client";

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function selected(config: any, identity: any) {
  if (config?.summaryReviewerEnabled !== true) return false;
  const rate = Math.max(0, Math.min(1, Number(config?.summaryReviewerSampleRate ?? 0.1)));
  if (rate <= 0) return false;
  const value = parseInt(checksum(identity).slice(0, 8), 16) / 0xffffffff;
  return value < rate;
}

export async function reviewSessionSummaryIfSelected(input: {
  config: any;
  scope: string;
  scopeId?: string;
  sessionId: string;
  boundaryGeneration?: number;
  summary: any;
  reference?: any;
  sourceMessageIds?: string[];
  deterministicQuality?: any;
  modelCall?: (config: any, request: any) => Promise<any>;
}) {
  const identity = {
    scope: input.scope,
    scopeId: input.scopeId || input.sessionId,
    sessionId: input.sessionId,
    boundaryGeneration: Number(input.boundaryGeneration || 0),
    summaryChecksum: checksum(input.summary),
  };
  if (!selected(input.config, identity)) return {
    schema: "ccm-session-summary-secondary-review-v1",
    version: 1,
    selected: false,
    enabled: input.config?.summaryReviewerEnabled === true,
    sampleRate: Math.max(0, Math.min(1, Number(input.config?.summaryReviewerSampleRate ?? 0.1))),
    identityChecksum: checksum(identity),
    contentStored: false,
  };
  const reviewer = {
    enabled: true,
    format: String(input.config?.summaryReviewerFormat || "openai-compatible"),
    apiUrl: String(input.config?.summaryReviewerApiUrl || ""),
    apiKey: String(input.config?.summaryReviewerApiKey || ""),
    model: String(input.config?.summaryReviewerModel || ""),
    timeoutMs: Math.max(5000, Number(input.config?.summaryReviewerTimeoutMs || 30000)),
    temperature: 0,
    providerContextCacheMode: "off",
  };
  if (!reviewer.apiUrl || !reviewer.apiKey || !reviewer.model) {
    const error: any = new Error("摘要双模型抽检已命中，但复核模型配置不完整");
    error.code = "SUMMARY_SECONDARY_REVIEWER_NOT_CONFIGURED";
    throw error;
  }
  const request = {
    system: "你是独立的会话摘要验收模型。只输出 JSON。检查摘要是否遗漏持久约束、是否编造完成状态、是否与边界和参考冲突。字段：passed,missingAnchors,hallucinations,reason。",
    messages: [{ role: "user", content: JSON.stringify({
      scope: input.scope,
      sourceMessageIds: input.sourceMessageIds || [],
      preservationReference: input.reference || null,
      summary: input.summary,
      deterministicQuality: input.deterministicQuality || null,
    }) }],
    maxTokens: 1600,
    timeoutMs: reviewer.timeoutMs,
    retry: false,
    invalidJsonMessage: "摘要复核模型未返回有效 JSON",
  };
  const invoke = input.modelCall || (async (config: any, options: any) => {
    if (config.format === "anthropic-compatible") return callAnthropicCompatibleJson(config, options);
    if (config.format === "gemini-compatible") return callGeminiCompatibleJson(config, options);
    return callOpenAiCompatibleJson(config, options);
  });
  const verdict = await invoke(reviewer, request);
  const passed = verdict?.passed === true
    && (!Array.isArray(verdict?.missingAnchors) || verdict.missingAnchors.length === 0)
    && (!Array.isArray(verdict?.hallucinations) || verdict.hallucinations.length === 0);
  const receipt: any = {
    schema: "ccm-session-summary-secondary-review-v1",
    version: 1,
    selected: true,
    enabled: true,
    scope: input.scope,
    scopeId: String(input.scopeId || input.sessionId),
    sessionId: input.sessionId,
    identityChecksum: checksum(identity),
    reviewerFormat: reviewer.format,
    reviewerModel: reviewer.model,
    passed,
    missingAnchorCount: Array.isArray(verdict?.missingAnchors) ? verdict.missingAnchors.length : 0,
    hallucinationCount: Array.isArray(verdict?.hallucinations) ? verdict.hallucinations.length : 0,
    reason: String(verdict?.reason || "").slice(0, 400),
    reviewedAt: new Date().toISOString(),
    contentStored: false,
    checksum: "",
  };
  receipt.checksum = checksum(receipt);
  if (!passed) {
    const error: any = new Error(`摘要独立抽检未通过：${receipt.reason || "发现遗漏或幻觉"}`);
    error.code = "SUMMARY_SECONDARY_REVIEW_FAILED";
    error.reviewReceipt = receipt;
    throw error;
  }
  return receipt;
}

export async function runSessionSummarySecondaryReviewSelfTest() {
  let calls = 0;
  const disabled = await reviewSessionSummaryIfSelected({
    config: { summaryReviewerEnabled: false }, scope: "project", sessionId: "s1", summary: {},
    modelCall: async () => { calls += 1; return { passed: true }; },
  });
  const selectedReceipt = await reviewSessionSummaryIfSelected({
    config: {
      summaryReviewerEnabled: true,
      summaryReviewerSampleRate: 1,
      summaryReviewerFormat: "openai-compatible",
      summaryReviewerApiUrl: "https://mock.invalid/v1",
      summaryReviewerApiKey: "mock",
      summaryReviewerModel: "mock-reviewer",
    },
    scope: "project", sessionId: "s1", summary: { primaryRequest: "x" }, sourceMessageIds: ["m1"],
    modelCall: async () => { calls += 1; return { passed: true, missingAnchors: [], hallucinations: [], reason: "ok" }; },
  });
  return { pass: disabled.selected === false && selectedReceipt.passed === true && calls === 1, checks: { disabledHasNoCall: calls === 1, selectedPasses: selectedReceipt.passed } };
}

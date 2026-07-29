import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  callAnthropicCompatibleJson,
  callOpenAiCompatibleJson,
  shouldUseAnthropic,
} from "../modules/collaboration/group-orchestrator-llm-client";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import { resolveGroupModelContextCapacity } from "../modules/collaboration/group-compaction-strategy";
import { estimateModelMessagesTokens } from "./model-token-preflight";

export type SemanticDecisionScope = "global" | "group" | "project" | "music" | "test_agent";
export type SemanticDecisionKind =
  | "workflow"
  | "music_intent"
  | "music_selection"
  | "agent_collaboration_route"
  | "test_agent_plan"
  | "memory_extraction"
  | "acceptance_projection"
  | "main_agent_self_verification"
  | "requirement_intake_quality";

export interface SemanticDecisionIdentityV1 {
  scope: SemanticDecisionScope;
  scopeId: string;
  sessionId: string;
  taskId?: string;
  generation?: number;
}

export interface SemanticDecisionReceiptV1 {
  schema: "ccm-semantic-decision-receipt-v1";
  version: 1;
  decisionKind: SemanticDecisionKind;
  identity: SemanticDecisionIdentityV1;
  inputChecksum: string;
  resultChecksum: string;
  provider: string;
  model: string;
  confidence: number;
  status: "confirmed" | "failed";
  decidedAt: string;
  checksum: string;
}

export interface AgentCollaborationRouteDecisionV1 {
  schema: "ccm-agent-collaboration-route-decision-v1";
  targetProject: string;
  action: "ask_agent" | "ask_user" | "reject";
  reason: string;
  confidence: number;
  candidateProjects: string[];
}

export interface TestAgentSemanticPlanV2 {
  schema: "ccm-test-agent-semantic-plan-v2";
  summary: string;
  inspectedFiles: string[];
  projects: any[];
  criterionCoverage: Array<{
    criterion: string;
    status: "planned" | "unsupported" | "needs_user";
    checkNames: string[];
    reason: string;
  }>;
}

export interface MemorySemanticExtractionV1 {
  schema: "ccm-memory-semantic-extraction-v1";
  candidates: Array<{
    type: string;
    operation: "add" | "update" | "supersede" | "ignore";
    text: string;
    evidenceMessageIds: string[];
    evidenceQuotes: string[];
    confidence: number;
    applicableScope: string;
    supersedes?: string[];
  }>;
}

export interface AcceptancePresentationV1 {
  schema: "ccm-acceptance-presentation-v1";
  status: "passed" | "needs_rework" | "needs_user" | "recorded" | "unverified";
  label: string;
  reason: string;
  blocking: boolean;
}

type SemanticDecisionRequest<T> = {
  kind: SemanticDecisionKind;
  identity: SemanticDecisionIdentityV1;
  system: string;
  input: any;
  validate: (value: any) => T;
  confidence?: (value: T) => number;
  maxTokens?: number;
  modelCall?: (request: { config: any; messages: any[]; maxTokens: number }) => Promise<any>;
  config?: any;
};

const DECISION_DIR = process.env.CCM_SEMANTIC_DECISION_DIR
  || path.join(os.homedir(), ".cc-connect", "semantic-decisions");
const inFlight = new Map<string, Promise<any>>();
const completed = new Map<string, { value: any; receipt: SemanticDecisionReceiptV1 }>();

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

export function semanticDecisionChecksum(value: any, length = 64) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, length);
}

function cleanIdentity(identity: SemanticDecisionIdentityV1): SemanticDecisionIdentityV1 {
  const scope = String(identity?.scope || "") as SemanticDecisionScope;
  if (!["global", "group", "project", "music", "test_agent"].includes(scope)) throw new Error("semantic_decision_scope_invalid");
  const scopeId = String(identity?.scopeId || "").trim();
  const sessionId = String(identity?.sessionId || "").trim();
  if (!scopeId || !sessionId) throw new Error("semantic_decision_exact_scope_required");
  return {
    scope,
    scopeId: scopeId.slice(0, 240),
    sessionId: sessionId.slice(0, 240),
    ...(identity.taskId ? { taskId: String(identity.taskId).slice(0, 240) } : {}),
    ...(Number.isFinite(Number(identity.generation)) ? { generation: Math.max(0, Number(identity.generation)) } : {}),
  };
}

function persistReceipt(receipt: SemanticDecisionReceiptV1) {
  fs.mkdirSync(DECISION_DIR, { recursive: true });
  const day = receipt.decidedAt.slice(0, 10);
  fs.appendFileSync(path.join(DECISION_DIR, `${day}.jsonl`), `${JSON.stringify(receipt)}\n`, "utf-8");
}

function configuredProvider(config: any) {
  return shouldUseAnthropic(config) ? "anthropic-compatible" : String(config?.format || "openai-compatible");
}

export async function runSemanticDecision<T>(request: SemanticDecisionRequest<T>): Promise<{ value: T; receipt: SemanticDecisionReceiptV1 }> {
  const identity = cleanIdentity(request.identity);
  const inputChecksum = semanticDecisionChecksum({ kind: request.kind, identity, input: request.input });
  const key = `${request.kind}:${inputChecksum}`;
  const cached = completed.get(key);
  if (cached) return cached;
  const existing = inFlight.get(key);
  if (existing) return existing;

  let resolvedConfig: any = request.config || null;
  const operation = (async () => {
    const config = resolvedConfig || loadOrchestratorConfig();
    resolvedConfig = config;
    if (!config?.enabled || !String(config?.apiUrl || "").trim() || !String(config?.apiKey || "").trim() || !String(config?.model || "").trim()) {
      throw new Error("统一大模型尚未配置，语义决策已安全阻断");
    }
    const messages = [
      { role: "system", content: request.system },
      { role: "user", content: JSON.stringify({ identity, input: request.input }) },
    ];
    const maxTokens = Math.max(200, Math.min(8_000, Number(request.maxTokens || 1_200)));
    const capacity = resolveGroupModelContextCapacity(config);
    const tokenPreflight = estimateModelMessagesTokens(messages, config);
    const availableInputTokens = Math.max(1, Number(capacity.contextWindow || 0) - maxTokens - Number(capacity.reservedOutputTokens || 0));
    if (tokenPreflight.safetyAdjustedTokens > availableInputTokens) {
      const error: any = new Error(`语义决策上下文超过模型容量：${tokenPreflight.safetyAdjustedTokens}/${availableInputTokens}`);
      error.code = "SEMANTIC_DECISION_CONTEXT_OVER_CAPACITY";
      error.estimatedInputTokens = tokenPreflight.safetyAdjustedTokens;
      error.availableInputTokens = availableInputTokens;
      throw error;
    }
    const parsed = request.modelCall
      ? await request.modelCall({ config, messages, maxTokens })
      : shouldUseAnthropic(config)
        ? await callAnthropicCompatibleJson(config, {
            messages,
            maxTokens,
            defaultTimeoutMs: Number(config.timeoutMs || 120_000),
            retryScope: `semantic:${request.kind}`,
            providerContextCache: { scope: identity.scope, scopeId: identity.scopeId, sessionId: identity.sessionId, source: `semantic_${request.kind}` },
          })
        : await callOpenAiCompatibleJson(config, {
            messages,
            maxTokens,
            defaultTimeoutMs: Number(config.timeoutMs || 120_000),
            retryScope: `semantic:${request.kind}`,
            providerContextCache: { scope: identity.scope, scopeId: identity.scopeId, sessionId: identity.sessionId, source: `semantic_${request.kind}` },
          });
    const value = request.validate(parsed);
    const confidence = Math.max(0, Math.min(1, Number(request.confidence?.(value) ?? (value as any)?.confidence ?? 1)));
    const core = {
      schema: "ccm-semantic-decision-receipt-v1" as const,
      version: 1 as const,
      decisionKind: request.kind,
      identity,
      inputChecksum,
      resultChecksum: semanticDecisionChecksum(value),
      provider: configuredProvider(config),
      model: String(config.model || ""),
      confidence,
      status: "confirmed" as const,
      decidedAt: new Date().toISOString(),
    };
    const receipt: SemanticDecisionReceiptV1 = { ...core, checksum: semanticDecisionChecksum(core) };
    const result = { value, receipt };
    persistReceipt(receipt);
    completed.set(key, result);
    if (completed.size > 500) completed.delete(completed.keys().next().value as string);
    return result;
  })().catch(error => {
    const config = resolvedConfig || {};
    const errorCode = String((error as any)?.code || "SEMANTIC_DECISION_FAILED").slice(0, 160);
    const core = {
      schema: "ccm-semantic-decision-receipt-v1" as const,
      version: 1 as const,
      decisionKind: request.kind,
      identity,
      inputChecksum,
      resultChecksum: semanticDecisionChecksum({ status: "failed", errorCode }),
      provider: configuredProvider(config),
      model: String(config?.model || ""),
      confidence: 0,
      status: "failed" as const,
      decidedAt: new Date().toISOString(),
    };
    const receipt: SemanticDecisionReceiptV1 = { ...core, checksum: semanticDecisionChecksum(core) };
    try { persistReceipt(receipt); } catch {}
    (error as any).semanticDecisionReceipt = receipt;
    throw error;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, operation);
  return operation;
}

export function buildExplicitSemanticDecisionReceipt(
  kind: SemanticDecisionKind,
  identityInput: SemanticDecisionIdentityV1,
  input: any,
  value: any,
  confidence = 1,
): SemanticDecisionReceiptV1 {
  const identity = cleanIdentity(identityInput);
  const core = {
    schema: "ccm-semantic-decision-receipt-v1" as const,
    version: 1 as const,
    decisionKind: kind,
    identity,
    inputChecksum: semanticDecisionChecksum({ kind, identity, input }),
    resultChecksum: semanticDecisionChecksum(value),
    provider: "explicit-structured-input",
    model: "",
    confidence: Math.max(0, Math.min(1, Number(confidence || 0))),
    status: "confirmed" as const,
    decidedAt: new Date().toISOString(),
  };
  const receipt: SemanticDecisionReceiptV1 = { ...core, checksum: semanticDecisionChecksum(core) };
  persistReceipt(receipt);
  return receipt;
}

export function normalizeCollaborationRouteDecision(value: any, candidateProjects: string[]): AgentCollaborationRouteDecisionV1 {
  const candidates = [...new Set(candidateProjects.map(item => String(item || "").trim()).filter(Boolean))];
  const action = String(value?.action || "");
  if (!["ask_agent", "ask_user", "reject"].includes(action)) throw new Error("collaboration_route_action_invalid");
  const targetProject = String(value?.targetProject || value?.target_project || "").trim();
  if (action === "ask_agent" && (!targetProject || !candidates.includes(targetProject))) throw new Error("collaboration_route_target_invalid");
  return {
    schema: "ccm-agent-collaboration-route-decision-v1",
    targetProject: action === "ask_agent" ? targetProject : "",
    action: action as AgentCollaborationRouteDecisionV1["action"],
    reason: String(value?.reason || "").trim().slice(0, 1200),
    confidence: Math.max(0, Math.min(1, Number(value?.confidence || 0))),
    candidateProjects: candidates,
  };
}

export function normalizeAcceptancePresentation(value: any): AcceptancePresentationV1 {
  const status = String(value?.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!["passed", "needs_rework", "needs_user", "recorded", "unverified"].includes(status)) {
    throw new Error("acceptance_presentation_status_invalid");
  }
  return {
    schema: "ccm-acceptance-presentation-v1",
    status: status as AcceptancePresentationV1["status"],
    label: String(value?.label || "").trim().slice(0, 120),
    reason: String(value?.reason || "").trim().slice(0, 1_200),
    blocking: status === "needs_rework" || status === "needs_user" || status === "unverified",
  };
}

export function runSemanticDecisionRuntimeSelfTest() {
  const candidates = ["frontend", "backend"];
  const route = normalizeCollaborationRouteDecision({ action: "ask_agent", targetProject: "backend", reason: "接口归属后端", confidence: 0.93 }, candidates);
  const acceptance = normalizeAcceptancePresentation({ status: "unverified", label: "验收状态无法证明", reason: "历史记录缺少结构化回执" });
  let invalidRejected = false;
  try { normalizeCollaborationRouteDecision({ action: "ask_agent", targetProject: "other" }, candidates); } catch { invalidRejected = true; }
  const checksumA = semanticDecisionChecksum({ b: 2, a: 1 });
  const checksumB = semanticDecisionChecksum({ a: 1, b: 2 });
  return {
    pass: route.targetProject === "backend" && acceptance.blocking && invalidRejected && checksumA === checksumB,
    checks: { exactCandidateAccepted: route.targetProject === "backend", unverifiedAcceptanceBlocks: acceptance.blocking, invalidCandidateRejected: invalidRejected, stableChecksum: checksumA === checksumB },
  };
}

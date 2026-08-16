import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-main-first-turn-"));
process.env.HOME = sandbox;
process.env.USERPROFILE = sandbox;
const sandboxCcm = path.join(sandbox, ".cc-connect");
fs.mkdirSync(sandboxCcm, { recursive: true });
fs.writeFileSync(path.join(sandboxCcm, "group-orchestrator-config.json"), JSON.stringify({
  enabled: true,
  format: "openai-compatible",
  apiUrl: "https://provider.invalid/v1",
  apiKey: "selftest-key",
  model: "selftest-model",
  timeoutMs: 5_000,
  fallbackToRules: false,
  providerContextCacheMode: "off",
  providerNativeCacheEnabled: false,
  providerNativeToolsMode: "json",
}, null, 2));
const require = createRequire(import.meta.url);
const dist = (...parts) => require(path.join(root, "ccm-package", "dist", ...parts));

const turnRuntime = dist("agents", "main-agent-turn.js");
const loop = dist("agents", "global", "loop.js");
const orchestrator = dist("modules", "collaboration", "group-orchestrator-routing.js");
const groupLlm = dist("modules", "collaboration", "group-orchestrator-llm.js");

const helloWorkflow = {
  schema: "ccm-model-workflow-decision-v1",
  mode: "answer",
  reason: "普通问候可直接回答",
  confidence: 1,
  needsPlanning: false,
  needsEpicDecomposition: false,
  actionRequired: false,
  continuationKind: "new_task",
  readAction: "none",
  targetRefs: [],
  impactScope: [],
  planSteps: [],
  clarificationQuestions: [],
  selectedSkills: [],
  intentKind: "conversation",
  requiresCodeChanges: false,
  requiresAgentQa: false,
  requiresIndependentReview: false,
  verificationModes: [],
  memoryPolicy: "use",
  authorizationDirective: "preserve",
  riskLevel: "low",
  requiresUserConfirmation: false,
};

let globalModelCalls = 0;
let globalToolCalls = 0;
const globalRun = await loop.startGlobalAgentRun({
  message: "你好",
  originalMessage: "你好",
  sessionId: `global_hello_${Date.now()}`,
  source: "selftest",
  persist: false,
  maxSteps: 4,
  timeoutMs: 30_000,
}, {
  persist: false,
  getContext: () => ({ session_continuity: null }),
  callModel: async () => {
    globalModelCalls += 1;
    return {
      state: "complete",
      message: "你好！有什么可以帮你？",
      workflowDecision: helloWorkflow,
      intent: { category: "conversation", goal: "问候", action_required: false, target_refs: [], impact_scope: [], confidence: 1, authorization_basis: "none", reason: "普通问候" },
      plan: [],
      tool: null,
      completion: { summary: "你好！有什么可以帮你？", evidence: [], risks: [], next_action: "" },
    };
  },
  executeTool: async () => { globalToolCalls += 1; return { ok: true }; },
});
assert.equal(globalRun.status, "completed");
assert.equal(globalModelCalls, 1);
assert.equal(globalToolCalls, 0);

const cachedDecision = turnRuntime.normalizeMainAgentTurnDecision({
  scope: "group",
  scopeId: "group-hello",
  exactSessionId: "gcs_group_hello",
  turnId: "turn-hello",
  workflowDecision: helloWorkflow,
  reply: "你好！我是群聊主 Agent。",
});
const cachedGroupResult = {
  agent: "coordinator",
  delegated: [],
  assignments: [],
  runtime: "llm-api",
  content: "你好！我是群聊主 Agent。",
  workflowDecision: helloWorkflow,
  analysis: { workflowDecision: helloWorkflow, missingInfo: [], needsCoordination: false },
  dispatchPolicy: { action: "direct_answer", reason: "普通问候", nextStep: "已回复" },
  usage: { inputTokens: 10, outputTokens: 8, totalTokens: 18 },
  mainAgentTurnDecision: cachedDecision,
};
const chunks = [];
const reused = await orchestrator.runGroupOrchestrator({
  group: { id: "group-hello", members: [{ project: "coordinator", role: "coordinator" }] },
  message: "你好",
  groupSessionId: "gcs_group_hello",
  mainAgentFirstTurnResult: cachedGroupResult,
  onDelta: value => chunks.push(value),
});
assert.equal(reused.content, cachedGroupResult.content);
assert.equal(reused.mainAgentTurnDecision.checksum, cachedGroupResult.mainAgentTurnDecision.checksum);
assert.equal(chunks.join(""), cachedGroupResult.content);

let uncachedGroupProviderCalls = 0;
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => {
    uncachedGroupProviderCalls += 1;
    const streamedContent = JSON.stringify({
      responseType: "reply",
      friendlyResponse: "这是一个多 Agent 协作开发控制台，还可以继续扩展功能。",
      summary: "介绍当前项目并给出扩展方向",
      shouldDelegate: false,
      workflowDecision: helloWorkflow,
      dispatchPolicy: { action: "direct_answer", reason: "普通项目咨询不需要派发", requiresConfirmation: false },
      targets: [],
      toolRequests: [],
    });
    return {
      ok: true,
      status: 200,
      headers: { get: name => String(name || "").toLowerCase() === "content-type" ? "text/event-stream" : "" },
      async text() {
        return [
          `data: ${JSON.stringify({ choices: [{ delta: { content: streamedContent } }] })}`,
          `data: ${JSON.stringify({ choices: [{ finish_reason: "stop", delta: {} }], usage: { prompt_tokens: 120, completion_tokens: 60, total_tokens: 180 } })}`,
          "data: [DONE]",
          "",
        ].join("\n\n");
      },
    };
  };
  const uncachedGroupResult = await groupLlm.runLlmGroupOrchestrator({
    group: { id: "group-first-turn", members: [{ project: "coordinator", role: "coordinator" }] },
    message: "我这个是一个什么项目，还能新增一些其他的功能吗",
    groupSessionId: "selftest-group-session",
  });
  assert.equal(uncachedGroupProviderCalls, 1, "没有预置 workflowDecision 时必须进入群聊首轮模型调用");
  assert.equal(uncachedGroupResult.workflowDecision?.mode, "answer");
  assert.match(uncachedGroupResult.content, /多 Agent 协作开发控制台/);
} finally {
  globalThis.fetch = originalFetch;
}

const contractFailure = orchestrator.classifyGroupOrchestratorFailure(Object.assign(new Error("大模型返回了无效工作流：空"), { code: "CCM_WORKFLOW_DECISION_INVALID" }));
assert.equal(contractFailure.kind, "workflow_contract");
assert.doesNotMatch(contractFailure.guidance, /Key 是否有效/);
const recovery = dist("modules", "collaboration", "group-model-recovery.js");
const compactMod = dist("modules", "collaboration", "group-main-tool-result-compact.js");
const recoverySelfTest = recovery.runGroupModelRecoverySelfTest();
assert.equal(recoverySelfTest.pass, true, JSON.stringify(recoverySelfTest, null, 2));
const failureSelfTest = orchestrator.runGroupOrchestratorFailureSelfTest();
assert.equal(failureSelfTest.pass, true, JSON.stringify(failureSelfTest, null, 2));
const compactSelfTest = compactMod.runGroupMainToolResultCompactSelfTest();
assert.equal(compactSelfTest.pass, true, JSON.stringify(compactSelfTest, null, 2));

const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
const globalSource = source("backend/modules/global/global-agent-agentic-runtime.ts");
const globalChat = globalSource.slice(globalSource.indexOf("async function runAgenticGlobalRequest"), globalSource.indexOf("async function resumeGlobalAgentLoopsForServer"));
assert.doesNotMatch(globalChat, /decideWorkflowWithModel\s*\(/);
assert.doesNotMatch(globalChat, /searchAgentKnowledge\s*\(input\.message/);
assert.doesNotMatch(globalChat, /global_final_reply/);

const groupIntakeSource = source("backend/modules/collaboration/collaboration-task-intake.ts");
const groupClassifier = groupIntakeSource.slice(groupIntakeSource.indexOf("export async function classifyGroupProjectTaskIntentWithAgent"), groupIntakeSource.indexOf("export function shouldUseProjectAnalysisMode"));
assert.match(groupClassifier, /runGroupOrchestrator\s*\(/);
assert.doesNotMatch(groupClassifier, /decideWorkflowWithModel\s*\(/);
assert.match(groupClassifier, /context:\s*input\.context/);
const groupRouting = source("backend/modules/collaboration/group-orchestrator-routing.ts");
const groupCore = groupRouting.slice(groupRouting.indexOf("export async function runGroupOrchestratorCore"), groupRouting.indexOf("export function streamCanonicalGroupReply"));
assert.doesNotMatch(groupCore, /searchAgentKnowledge\s*\(/);
const groupLoop = source("backend/modules/collaboration/group-orchestrator-llm.ts");
assert.match(groupLoop, /canonicalName:\s*"query_knowledge"/);
assert.doesNotMatch(groupLoop, /canonicalName:\s*"read_project_source"/);
assert.match(groupLoop, /mainAgentToolResults:\s*toolResults/);
assert.match(groupLoop, /compactGroupMainToolResultsForPayload/);
const sharedToolRuntime = source("backend/tools/main-agent-tool-runtime.ts");
const workspaceTools = source("backend/tools/workspace-readonly-tools.ts");
assert.match(sharedToolRuntime, /WORKSPACE_READONLY_TOOL_DEFINITIONS_V3\.filter\(tool => tool\.loadPolicy === "base"\)/);
assert.match(workspaceTools, /name:\s*"glob_files"/);
assert.match(workspaceTools, /name:\s*"grep_text"/);
assert.match(workspaceTools, /name:\s*"read_file"/);

const projectServer = source("backend/server.ts");
const projectChat = projectServer.slice(projectServer.indexOf('pathname === "/api/send-stream"'), projectServer.indexOf('// === 发送消息给 Agent（非流式）==='));
assert.match(projectChat, /runProjectMainAgentFirstTurn\s*\(/);
assert.match(projectChat, /projectFirstTurnVisiblePresentation\s*\(/);
assert.doesNotMatch(projectChat, /answerAsProjectMainAgent\s*\(/);
assert.doesNotMatch(projectChat, /priorToolResults:\s*projectFirstTurn\.toolResults/);
assert.doesNotMatch(projectChat, /classifyProjectChatIntentWithModel\s*\(/);
assert.doesNotMatch(projectChat, /await\s+searchAgentKnowledge\s*\(/);

const projectFirstTurn = source("backend/modules/projects/project-main-agent.ts").slice(
  source("backend/modules/projects/project-main-agent.ts").indexOf("export async function runProjectMainAgentFirstTurn"),
  source("backend/modules/projects/project-main-agent.ts").indexOf("export async function planProjectMainTask"),
);
const projectIdentity = source("backend/agents/main-agent-identity.ts");
assert.match(projectIdentity, /ccm_ask_user/);
assert.match(projectIdentity, /ccm_present_plan/);
assert.match(projectIdentity, /ccm_dispatch/);
assert.match(projectFirstTurn, /buildProjectMainIdentityRules/);
assert.match(projectFirstTurn, /runProjectMainNativeQueryLoop/);
assert.match(projectFirstTurn, /query_knowledge/);
assert.match(projectFirstTurn, /publishGroupPresentedRequirementPlan/);
assert.match(projectFirstTurn, /计划已整理/);
assert.match(projectFirstTurn, /coordinatorVisibleFallbackContent/);
assert.doesNotMatch(projectFirstTurn, /canonicalName:\s*"read_project_source"/);
assert.doesNotMatch(projectFirstTurn, /canonicalName:\s*"read_runtime_diagnostics"/);
assert.match(projectFirstTurn, /let modelCallCount = 0/);
assert.equal(fs.existsSync(path.join(root, "backend/modules/projects/project-main-answer.ts")), false);

const turnComplete = dist("modules", "projects", "project-main-turn-complete.js");
const turnCompleteSelfTest = turnComplete.runProjectMainTurnCompleteSelfTest();
assert.equal(turnCompleteSelfTest.pass, true, JSON.stringify(turnCompleteSelfTest.checks, null, 2));

const globalTools = source("backend/agents/global/global-agent-run-store.ts");
assert.match(globalTools, /name:\s*"read_global_shared_files"/);

process.stdout.write(`${JSON.stringify({
  pass: true,
  schema: "ccm-three-session-main-first-turn-selftest-v1",
  checks: {
    globalGreetingOneProviderCall: globalModelCalls === 1,
    globalGreetingNoTool: globalToolCalls === 0,
    groupFirstTurnReusedWithoutSecondProvider: reused.content === cachedGroupResult.content,
    groupFirstTurnWithoutPresetWorkflowCallsProvider: uncachedGroupProviderCalls === 1,
    workflowContractErrorDoesNotBlameProviderKey: contractFailure.kind === "workflow_contract",
    globalPreclassifierRemoved: true,
    groupPreclassifierRemoved: true,
    groupAutomaticKnowledgeSearchRemoved: true,
    groupExactSessionContextOnFirstTurn: true,
    groupReadToolsAreModelSelected: true,
    projectPreclassifierRemoved: true,
    projectAutomaticKnowledgeSearchRemoved: true,
    projectReadToolsAreModelSelected: true,
    projectPlanFastPath: true,
    projectHasNoAnalysisSecondLoop: true,
    globalSharedFilesAreModelSelected: true,
  },
}, null, 2)}\n`);

try { fs.rmSync(sandbox, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}

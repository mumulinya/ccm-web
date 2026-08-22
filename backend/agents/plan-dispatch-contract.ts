import * as crypto from "crypto";
import { implementationPlanChecksum } from "./implementation-plan";

export const CCM_PLAN_DISPATCH_CONTRACT_SCHEMA = "ccm-plan-dispatch-contract-v1" as const;

export type CcmProviderCapabilities = {
  structuredToolStream?: boolean;
  fileEvents?: boolean;
  streaming?: boolean;
  pause?: boolean;
  resume?: boolean;
  cancel?: boolean;
  worktree?: boolean;
  nativeSession?: boolean;
  structuredReceipt?: boolean;
  writeScope?: boolean;
  sessionBinding?: boolean;
};

export function providerCapabilitiesFromRuntime(runtime: any, options: { sessionBinding?: boolean; structuredReceipt?: boolean; structuredToolStream?: boolean } = {}): CcmProviderCapabilities {
  const source = runtime?.capabilities || runtime || {};
  return {
    structuredToolStream: options.structuredToolStream ?? (source.streaming === true && source.externalRunner === true),
    fileEvents: source.nativeWorkspaceEditing === true,
    streaming: source.streaming === true,
    pause: false,
    resume: source.sessionResume === true,
    cancel: true,
    worktree: source.worktreeIsolation === true,
    nativeSession: source.sessionResume === true,
    structuredReceipt: options.structuredReceipt ?? source.externalRunner === true,
    writeScope: source.nativeWorkspaceEditing === true,
    sessionBinding: options.sessionBinding === true,
  };
}

export type CcmPlanDispatchWorkItem = {
  workItemId: string;
  stepId: string;
  project: string;
  files: string[];
  sourceEvidenceIds: string[];
  dependsOn: string[];
  parallelGroup: string;
  executor: {
    provider: string;
    agentType: string;
    model?: string;
    transport: "acp" | "cli" | "websocket";
    capabilities: string[];
    degraded: boolean;
    degradedReason?: string;
  };
  worktree: { strategy: "isolated" | "shared"; branch?: string };
  allowedTools: string[];
  forbiddenPaths: string[];
  acceptance: string[];
  verification: Array<{ command?: string; expected: string; evidenceRequired: boolean }>;
  artifacts: string[];
  timeoutMs: number;
  maxAttempts: number;
  contractChecksum: string;
  contentStored: false;
};

export type CcmPlanDispatchContractV1 = {
  schema: typeof CCM_PLAN_DISPATCH_CONTRACT_SCHEMA;
  contractId: string;
  planId: string;
  planRevision: number;
  planChecksum: string;
  sourceManifestChecksum: string;
  strategy: "conflict_aware_parallel";
  workItems: CcmPlanDispatchWorkItem[];
  dispatchReady?: boolean;
  blockers?: string[];
  contractChecksum: string;
  contentStored: false;
};

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((out: any, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function text(value: any, max = 800) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(value: any, max = 40, itemMax = 500) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,|;|；|、/) : [];
  return [...new Set(source.map(item => text(item, itemMax)).filter(Boolean))].slice(0, max);
}

function pathKey(value: any) {
  return text(value, 500).replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

function sharedResource(value: string) {
  const path = pathKey(value);
  return /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[^/]+|webpack\.config\.[^/]+|\.env(?:\.[^/]+)?|dockerfile|docker-compose[^/]*|schema|migrations?)(\/|$)/i.test(path)
    || /(^|\/)(api|routes?|types?|contracts?|database|db)(\/|$)/i.test(path);
}

function transportOf(value: any): "acp" | "cli" | "websocket" {
  const candidate = String(value || "").toLowerCase();
  return candidate === "acp" || candidate === "websocket" ? candidate : "cli";
}

function capabilityNames(capabilities: CcmProviderCapabilities) {
  return Object.entries(capabilities).filter(([, value]) => value === true).map(([key]) => key).sort();
}

function normalizeCapabilities(value: any): CcmProviderCapabilities {
  const source = value && typeof value === "object" ? value : {};
  const read = (key: string, snake: string) => source[key] === true || source[snake] === true;
  return {
    structuredToolStream: read("structuredToolStream", "structured_tool_stream"),
    fileEvents: read("fileEvents", "file_events"),
    streaming: read("streaming", "stream"),
    pause: read("pause", "pausable"),
    resume: read("resume", "resumable"),
    cancel: read("cancel", "cancellable"),
    worktree: read("worktree", "worktree_isolation"),
    nativeSession: read("nativeSession", "native_session"),
    structuredReceipt: read("structuredReceipt", "structured_receipt"),
    writeScope: read("writeScope", "write_scope"),
    sessionBinding: read("sessionBinding", "session_binding"),
  };
}

function stepFiles(plan: any, step: any, stepCount: number) {
  const explicit = list(step?.files || step?.filePaths || step?.file_paths || step?.allowedFiles || step?.allowed_files, 80, 500).map(pathKey);
  if (explicit.length) return explicit;
  if (stepCount === 1) return (Array.isArray(plan?.files) ? plan.files : []).map((row: any) => pathKey(row?.path));
  return [];
}

function stepEvidence(plan: any, step: any, files: string[]) {
  const explicit = list(step?.sourceEvidenceIds || step?.source_evidence_ids || step?.evidenceIds, 30, 180);
  if (explicit.length) return explicit;
  const rows = Array.isArray(plan?.files) ? plan.files : [];
  return rows.filter((row: any) => files.includes(pathKey(row?.path))).flatMap((row: any) => list(row?.sourceEvidenceIds || row?.source_evidence_ids, 12, 180));
}

function validateDependencyGraph(steps: any[]) {
  const ids = new Set(steps.map(step => String(step?.id || "").trim()).filter(Boolean));
  const issues: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) { issues.push(`步骤依赖存在环：${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const step = steps.find(row => String(row?.id || "") === id);
    for (const dep of list(step?.dependsOn || step?.depends_on, 20, 100)) {
      if (!ids.has(dep)) issues.push(`步骤 ${id} 依赖不存在：${dep}`);
      else visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
  return [...new Set(issues)];
}

export function validatePlanForDispatch(plan: any, options: { allowedProjects?: string[] } = {}) {
  const issues: string[] = [];
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!plan || plan.schema !== "ccm-implementation-plan-v2") issues.push("计划 schema 无效");
  if (!text(plan?.planId || plan?.plan_id, 240)) issues.push("缺少 planId");
  if (!text(plan?.checksum, 120)) issues.push("缺少计划 checksum");
  if (plan?.schema === "ccm-implementation-plan-v2" && text(plan?.checksum, 120) && implementationPlanChecksum(plan) !== plan.checksum) issues.push("计划 checksum 不匹配");
  if (!text(plan?.sourceManifestChecksum || plan?.source_manifest_checksum || plan?.sourceEvidence?.manifestChecksum, 120)) issues.push("缺少 source manifest checksum");
  issues.push(...validateDependencyGraph(steps));
  const allowed = new Set(list(options.allowedProjects, 40, 180));
  for (const file of Array.isArray(plan?.files) ? plan.files : []) {
    if (!text(file?.path, 500)) issues.push("计划文件缺少路径");
    if (!Array.isArray(file?.sourceEvidenceIds || file?.source_evidence_ids) || !(file.sourceEvidenceIds || file.source_evidence_ids).length) issues.push(`文件缺少证据：${file?.path || "unknown"}`);
    if (allowed.size && file?.project && !allowed.has(String(file.project))) issues.push(`计划包含未授权项目：${file.project}`);
  }
  const stepIds = new Set<string>();
  for (const step of steps) {
    const id = text(step?.id, 100);
    if (!id || stepIds.has(id)) issues.push(`步骤 ID 无效或重复：${id || "unknown"}`);
    stepIds.add(id);
    if (!Array.isArray(step?.acceptance) || !step.acceptance.length) issues.push(`步骤 ${id || "unknown"} 缺少验收标准`);
    const files = stepFiles(plan, step, steps.length);
    const artifacts = list(step?.artifacts || step?.outputs, 20, 300);
    if (steps.length > 1 && !files.length && !artifacts.length) issues.push(`步骤 ${id || "unknown"} 没有明确文件或产出范围`);
    if (!files.length && !artifacts.length && !text(step?.objective || step?.title, 1800)) issues.push(`步骤 ${id || "unknown"} 没有可执行范围`);
    if (files.length && !stepEvidence(plan, step, files).length) issues.push(`步骤 ${id || "unknown"} 的文件缺少来源证据`);
    if (!Array.isArray(step?.verification) && !Array.isArray(plan?.verification)) issues.push(`步骤 ${id || "unknown"} 缺少验证方式`);
  }
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

export function buildPlanDispatchContract(input: {
  plan: any;
  taskId: string;
  generation?: number;
  project?: string;
  sourceManifestChecksum?: string;
  provider?: string;
  agentType?: string;
  model?: string;
  transport?: string;
  capabilities?: CcmProviderCapabilities;
  worktreeStrategy?: "isolated" | "shared";
  allowedTools?: string[];
  forbiddenPaths?: string[];
  timeoutMs?: number;
  maxAttempts?: number;
}) : CcmPlanDispatchContractV1 {
  const plan = input.plan || {};
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const provider = text(input.provider || input.agentType || "claudecode", 80) || "claudecode";
  const agentType = text(input.agentType || provider, 80) || provider;
  const capabilities = normalizeCapabilities(input.capabilities);
  const sourceManifestChecksum = text(input.sourceManifestChecksum || plan.sourceManifestChecksum || plan.source_manifest_checksum || plan.sourceEvidence?.manifestChecksum, 120);
  const planForValidation = sourceManifestChecksum ? { ...plan, sourceManifestChecksum } : plan;
  const blockers = validatePlanForDispatch(planForValidation, { allowedProjects: input.project ? [input.project] : [] }).issues;
  if (capabilities.writeScope !== true) blockers.push("Provider 无法证明写入范围，禁止派发");
  if (capabilities.sessionBinding !== true) blockers.push("Provider 无法证明任务身份绑定，禁止派发");
  const stepToWork = new Map<string, string>();
  for (const step of steps) stepToWork.set(text(step?.id, 100), `wi_${hash([input.taskId, plan.planId, step?.id]).slice(0, 20)}`);
  const workItems: CcmPlanDispatchWorkItem[] = [];
  const usedPaths = new Map<string, string>();
  for (const step of steps) {
    const stepId = text(step?.id, 100);
    const workItemId = stepToWork.get(stepId) || `wi_${hash([input.taskId, stepId]).slice(0, 20)}`;
    const files = stepFiles(plan, step, steps.length);
    const evidence = stepEvidence(plan, step, files);
    const dependencies = list(step?.dependsOn || step?.depends_on, 20, 100).map(dep => stepToWork.get(dep) || dep);
    const conflicts = workItems.filter(item => item.project === (input.project || text(step?.project || plan?.project, 180)) && (
      files.some(file => item.files.includes(file)) || files.some(sharedResource) || item.files.some(sharedResource)
    ));
    if (conflicts.length) for (const conflict of conflicts) if (!dependencies.includes(conflict.workItemId)) dependencies.push(conflict.workItemId);
    const parallelGroup = conflicts.length ? `serial_${conflicts[conflicts.length - 1].workItemId}` : `parallel_${hash([input.taskId, files, stepId]).slice(0, 12)}`;
    const degraded = capabilities.writeScope !== true || capabilities.sessionBinding !== true || capabilities.structuredToolStream !== true || capabilities.structuredReceipt !== true;
    const degradedReason = capabilities.writeScope !== true || capabilities.sessionBinding !== true
      ? "Provider 无法证明写入范围或任务身份绑定，必须由 CCM 重新校验"
      : "Provider 缺少完整结构化流或回执能力，执行后由 CCM 重新读取和验证";
    const core: Omit<CcmPlanDispatchWorkItem, "contractChecksum"> = {
      workItemId, stepId, project: input.project || text(step?.project || plan?.project || "", 180), files, sourceEvidenceIds: evidence,
      dependsOn: dependencies, parallelGroup,
      executor: { provider, agentType, ...(text(input.model, 160) ? { model: text(input.model, 160) } : {}), transport: transportOf(input.transport), capabilities: capabilityNames(capabilities), degraded, ...(degraded ? { degradedReason } : {}) },
      // Worktree isolation is provided by CCM around the Provider process; a
      // Provider's native worktree capability is not required for isolation.
      worktree: { strategy: input.worktreeStrategy || "isolated" },
      allowedTools: list(input.allowedTools || step?.allowedTools || step?.allowed_tools, 30, 120),
      forbiddenPaths: list(input.forbiddenPaths || step?.forbiddenPaths || step?.forbidden_paths, 30, 300),
      acceptance: list(step?.acceptance || step?.acceptanceCriteria || step?.acceptance_criteria, 20, 800),
      verification: (Array.isArray(step?.verification) ? step.verification : (Array.isArray(plan?.verification) ? plan.verification : [])).map((row: any) => ({ ...(text(row?.command, 500) ? { command: text(row.command, 500) } : {}), expected: text(row?.expected || row?.result || row?.description, 800), evidenceRequired: true })).filter((row: any) => row.expected),
      artifacts: list(step?.artifacts || step?.outputs, 20, 300), timeoutMs: Math.max(30_000, Number(step?.timeoutMs || step?.timeout_ms || input.timeoutMs || 1_800_000)), maxAttempts: Math.max(1, Math.min(5, Number(step?.maxAttempts || step?.max_attempts || input.maxAttempts || 2))), contentStored: false,
    };
    workItems.push({ ...core, contractChecksum: hash(core) });
    for (const file of files) usedPaths.set(file, workItemId);
  }
  const contractCore = { schema: CCM_PLAN_DISPATCH_CONTRACT_SCHEMA, contractId: `pdc_${hash([input.taskId, plan.planId, plan.revision, plan.checksum]).slice(0, 24)}`, planId: text(plan.planId || plan.plan_id, 240), planRevision: Math.max(1, Number(plan.revision || 1)), planChecksum: text(plan.checksum, 120), sourceManifestChecksum, strategy: "conflict_aware_parallel" as const, workItems, contentStored: false as const };
  const fatal = blockers.filter(issue => /schema|planId|checksum|manifest|依赖|未授权|缺少路径|缺少证据|缺少验收|没有明确|禁止派发/.test(issue));
  return { ...contractCore, dispatchReady: fatal.length === 0 && workItems.length > 0, blockers: [...new Set(blockers)], contractChecksum: hash(contractCore) };
}

export function validatePlanDispatchContract(contract: any, expected: any = {}) {
  const issues: string[] = [];
  if (contract?.schema !== CCM_PLAN_DISPATCH_CONTRACT_SCHEMA) issues.push("contract_schema_invalid");
  const { contractChecksum: _checksum, dispatchReady: _ready, blockers: _blockers, ...contractCore } = contract || {};
  if (String(contract?.contractChecksum || "") !== hash(contractCore)) issues.push("contract_checksum_invalid");
  for (const [key, value] of Object.entries(expected)) if (value !== undefined && String(contract?.[key] || "") !== String(value || "")) issues.push(`${key}_mismatch`);
  const ids = new Set<string>();
  for (const item of Array.isArray(contract?.workItems) ? contract.workItems : []) {
    if (!item.workItemId || ids.has(item.workItemId)) issues.push("work_item_id_invalid");
    ids.add(item.workItemId);
    if (!item.stepId || !item.project) issues.push("work_item_binding_missing");
    if (!Array.isArray(item.acceptance) || !item.acceptance.length) issues.push(`${item.workItemId}_acceptance_missing`);
    if (!Array.isArray(item.executor?.capabilities) || !item.executor.capabilities.includes("writeScope")) issues.push(`${item.workItemId}_write_scope_unproven`);
  }
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function runPlanDispatchContractSelfTest() {
  const plan: any = { schema: "ccm-implementation-plan-v2", planId: "p1", revision: 1, checksum: "", sourceEvidenceChecksum: "", sourceManifestChecksum: "manifest", files: [{ project: "web", path: "src/a.ts", sourceEvidenceIds: ["e1"] }, { project: "web", path: "src/b.ts", sourceEvidenceIds: ["e2"] }], steps: [{ id: "a", title: "A", objective: "A", files: ["src/a.ts"], sourceEvidenceIds: ["e1"], acceptance: ["A done"], verification: [{ command: "npm test", expected: "pass" }] }, { id: "b", title: "B", objective: "B", files: ["src/b.ts"], sourceEvidenceIds: ["e2"], acceptance: ["B done"], verification: [{ command: "npm test", expected: "pass" }] }] };
  plan.checksum = implementationPlanChecksum(plan);
  const contract = buildPlanDispatchContract({ plan, taskId: "t1", project: "web", capabilities: { writeScope: true, sessionBinding: true, structuredToolStream: true, structuredReceipt: true, worktree: true } });
  const checks = { hasContract: contract.schema === CCM_PLAN_DISPATCH_CONTRACT_SCHEMA, ready: contract.dispatchReady === true, parallel: contract.workItems[0]?.parallelGroup !== contract.workItems[1]?.parallelGroup, validates: validatePlanDispatchContract(contract).valid };
  return { pass: Object.values(checks).every(Boolean), checks, contract };
}

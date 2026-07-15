import * as crypto from "crypto";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export type GroupCoordinationRequestKind = "information" | "implementation" | "review" | "risk";
export type GroupCoordinationRequestStatus =
  | "submitted"
  | "triaged"
  | "waiting_agent"
  | "work_item_created"
  | "executing"
  | "needs_user"
  | "evidence_review"
  | "merging"
  | "merge_conflict"
  | "resolved"
  | "resumed"
  | "failed"
  | "timeout"
  | "cancelled";

export interface GroupCoordinationContext {
  schema?: "ccm-group-coordination-context-v1";
  groupId: string;
  taskId: string;
  groupSessionId?: string;
  sourceProject: string;
  sourceAgentType?: string;
  sourceTaskAgentSessionId?: string;
  sourceNativeSessionId?: string;
  sourceWorkDir?: string;
  role?: "child_agent";
}

export interface GroupCoordinationRequestInput {
  kind?: GroupCoordinationRequestKind;
  summary?: string;
  question?: string;
  reason?: string;
  blocking?: boolean;
  requiredCapabilities?: string[];
  targetHint?: string;
  evidence?: string[];
  acceptanceCriteria?: string[];
  requestedWritePaths?: string[];
  idempotencyKey?: string;
  metadata?: any;
}

export interface GroupCoordinationRequestRecord {
  schema: "ccm-group-coordination-request-v1";
  id: string;
  status: GroupCoordinationRequestStatus;
  kind: GroupCoordinationRequestKind;
  group_id: string;
  task_id: string;
  group_session_id: string;
  source_project: string;
  source_agent_type: string;
  source_task_agent_session_id: string;
  source_native_session_id: string;
  source_work_dir: string;
  summary: string;
  question: string;
  reason: string;
  blocking: boolean;
  required_capabilities: string[];
  target_hint: string;
  evidence: string[];
  acceptance_criteria: string[];
  requested_write_paths: string[];
  idempotency_key: string;
  coordinator_claim_id: string;
  work_item_task_id: string;
  resolution: any;
  metadata: any;
  audit: Array<{ at: string; type: string; detail: string }>;
  created_at: string;
  updated_at: string;
}

interface GroupCoordinationStore {
  schema: "ccm-group-coordination-store-v1";
  version: 1;
  updated_at: string;
  requests: GroupCoordinationRequestRecord[];
}

const MAX_RECORDS = 1600;
const TERMINAL = new Set<GroupCoordinationRequestStatus>(["resumed", "failed", "timeout", "cancelled"]);

function storeFile() {
  return String(process.env.CCM_GROUP_COORDINATION_FILE || "").trim()
    || path.join(CCM_DIR, "group-coordination-requests.json");
}

function emptyStore(): GroupCoordinationStore {
  return { schema: "ccm-group-coordination-store-v1", version: 1, updated_at: new Date().toISOString(), requests: [] };
}

function cleanText(value: any, max = 2000) {
  return String(value || "").replace(/[\0\r\t]+/g, " ").trim().slice(0, max);
}

function cleanList(value: any, maxItems = 30, maxText = 500) {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(rows.map(item => cleanText(item, maxText)).filter(Boolean))).slice(0, maxItems);
}

function normalizeContext(context: GroupCoordinationContext) {
  return {
    groupId: cleanText(context?.groupId, 160),
    taskId: cleanText(context?.taskId, 160),
    groupSessionId: cleanText(context?.groupSessionId, 160),
    sourceProject: cleanText(context?.sourceProject, 160),
    sourceAgentType: cleanText(context?.sourceAgentType, 80),
    sourceTaskAgentSessionId: cleanText(context?.sourceTaskAgentSessionId, 200),
    sourceNativeSessionId: cleanText(context?.sourceNativeSessionId, 240),
    sourceWorkDir: cleanText(context?.sourceWorkDir, 1200),
  };
}

function assertContext(context: ReturnType<typeof normalizeContext>) {
  if (!context.groupId || !context.taskId || !context.sourceProject) {
    throw new Error("协调请求缺少 groupId、taskId 或 sourceProject，已拒绝写入");
  }
}

function loadStore(file = storeFile()) {
  const parsed = readJsonWithBackup<any>(file, emptyStore());
  if (parsed?.schema !== "ccm-group-coordination-store-v1" || !Array.isArray(parsed.requests)) return emptyStore();
  return parsed as GroupCoordinationStore;
}

function mutateStore<T>(operation: (store: GroupCoordinationStore) => T): T {
  const file = storeFile();
  return withFileLock(file, () => {
    const store = loadStore(file);
    const result = operation(store);
    store.requests = store.requests.slice(-MAX_RECORDS);
    store.updated_at = new Date().toISOString();
    writeJsonAtomic(file, store);
    return result;
  });
}

function matchesContext(row: GroupCoordinationRequestRecord, context: ReturnType<typeof normalizeContext>) {
  return row.group_id === context.groupId
    && row.task_id === context.taskId
    && row.source_project === context.sourceProject
    && (!context.sourceTaskAgentSessionId || row.source_task_agent_session_id === context.sourceTaskAgentSessionId);
}

export function submitGroupCoordinationRequest(contextInput: GroupCoordinationContext, input: GroupCoordinationRequestInput) {
  const context = normalizeContext(contextInput);
  assertContext(context);
  const kind = (["information", "implementation", "review", "risk"].includes(String(input?.kind || ""))
    ? input.kind
    : "information") as GroupCoordinationRequestKind;
  const summary = cleanText(input?.summary || input?.question, 1000);
  const question = cleanText(input?.question || input?.summary, 3000);
  if (!summary || summary.length < 4) throw new Error("协调请求需要清晰的 summary 或 question");
  const idempotencyKey = cleanText(input?.idempotencyKey, 300) || crypto.createHash("sha256").update(JSON.stringify({
    group: context.groupId,
    task: context.taskId,
    source: context.sourceProject,
    session: context.sourceTaskAgentSessionId,
    kind,
    summary,
    question,
  })).digest("hex");

  return mutateStore(store => {
    const existing = [...store.requests].reverse().find(row => matchesContext(row, context)
      && row.idempotency_key === idempotencyKey
      && !TERMINAL.has(row.status));
    if (existing) return { record: existing, deduplicated: true };
    const now = new Date().toISOString();
    const record: GroupCoordinationRequestRecord = {
      schema: "ccm-group-coordination-request-v1",
      id: `gcr_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
      status: "submitted",
      kind,
      group_id: context.groupId,
      task_id: context.taskId,
      group_session_id: context.groupSessionId,
      source_project: context.sourceProject,
      source_agent_type: context.sourceAgentType,
      source_task_agent_session_id: context.sourceTaskAgentSessionId,
      source_native_session_id: context.sourceNativeSessionId,
      source_work_dir: context.sourceWorkDir,
      summary,
      question,
      reason: cleanText(input?.reason, 1600),
      blocking: input?.blocking !== false,
      required_capabilities: cleanList(input?.requiredCapabilities, 20, 120),
      target_hint: cleanText(input?.targetHint, 160),
      evidence: cleanList(input?.evidence, 30, 1000),
      acceptance_criteria: cleanList(input?.acceptanceCriteria, 30, 1000),
      requested_write_paths: cleanList(input?.requestedWritePaths, 40, 1000),
      idempotency_key: idempotencyKey,
      coordinator_claim_id: "",
      work_item_task_id: "",
      resolution: null,
      metadata: input?.metadata && typeof input.metadata === "object" ? input.metadata : null,
      audit: [{ at: now, type: "submitted_via_mcp", detail: "子 Agent 已向群聊主 Agent 提交协调请求" }],
      created_at: now,
      updated_at: now,
    };
    store.requests.push(record);
    return { record, deduplicated: false };
  });
}

export function listGroupCoordinationRequests(query: Partial<GroupCoordinationContext> & { statuses?: GroupCoordinationRequestStatus[] } = {}) {
  const context = normalizeContext(query as GroupCoordinationContext);
  const statuses = new Set(query.statuses || []);
  return loadStore().requests.filter(row => {
    if (context.groupId && row.group_id !== context.groupId) return false;
    if (context.taskId && row.task_id !== context.taskId) return false;
    if (context.sourceProject && row.source_project !== context.sourceProject) return false;
    if (context.sourceTaskAgentSessionId && row.source_task_agent_session_id !== context.sourceTaskAgentSessionId) return false;
    return !statuses.size || statuses.has(row.status);
  });
}

export function claimSubmittedGroupCoordinationRequests(contextInput: GroupCoordinationContext, claimId: string) {
  const context = normalizeContext(contextInput);
  assertContext(context);
  const safeClaimId = cleanText(claimId, 240);
  if (!safeClaimId) throw new Error("主 Agent claimId 不能为空");
  return mutateStore(store => {
    const claimed: GroupCoordinationRequestRecord[] = [];
    for (const row of store.requests) {
      const staleTriage = row.status === "triaged" && Date.now() - Date.parse(row.updated_at || row.created_at || "") >= 2 * 60 * 1000;
      if (!matchesContext(row, context) || (row.status !== "submitted" && !staleTriage)) continue;
      const at = new Date().toISOString();
      row.status = "triaged";
      row.coordinator_claim_id = safeClaimId;
      row.updated_at = at;
      row.audit = [...row.audit, { at, type: staleTriage ? "reclaimed_after_restart" : "claimed_by_group_main_agent", detail: staleTriage ? "检测到中断的仲裁，群聊主 Agent 已重新接管" : "群聊主 Agent 已接管并开始判断" }].slice(-60);
      claimed.push(row);
    }
    return claimed;
  });
}

export function updateGroupCoordinationRequest(id: string, patch: Partial<GroupCoordinationRequestRecord> & { auditType?: string; auditDetail?: string }) {
  const safeId = cleanText(id, 240);
  return mutateStore(store => {
    const row = store.requests.find(item => item.id === safeId);
    if (!row) return null;
    const at = new Date().toISOString();
    const { auditType, auditDetail, ...updates } = patch as any;
    Object.assign(row, updates, { id: row.id, schema: row.schema, updated_at: at });
    if (auditType || auditDetail) {
      row.audit = [...row.audit, { at, type: cleanText(auditType || "updated", 120), detail: cleanText(auditDetail || "协调请求已更新", 1000) }].slice(-60);
    }
    return row;
  });
}

export function getGroupCoordinationStoreDiagnostics() {
  const rows = loadStore().requests;
  return {
    schema: "ccm-group-coordination-store-diagnostics-v1",
    file: storeFile(),
    total: rows.length,
    open: rows.filter(row => !TERMINAL.has(row.status)).length,
    by_status: Object.fromEntries(Array.from(new Set(rows.map(row => row.status))).map(status => [status, rows.filter(row => row.status === status).length])),
  };
}

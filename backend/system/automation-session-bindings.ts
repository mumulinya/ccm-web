import * as crypto from "crypto";
import * as path from "path";
import { getConfigs, loadTasks } from "../core/db";
import { CCM_DIR } from "../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { createGroupChatSession, listGroupChatSessions, loadGroups } from "../modules/collaboration/storage";
import { createProjectSessionRecord, getSessionDetail } from "../modules/projects/sessions";

export type AutomationTaskSource = "requirement_pool" | "workbench" | "global_agent";
export type AutomationSessionScope = "project" | "group";

export interface AutomationSessionBinding {
  schema: "ccm-automation-session-binding-v1";
  bindingId: string;
  scope: AutomationSessionScope;
  scopeId: string;
  exactSessionId: string;
  sources: AutomationTaskSource[];
  status: "active" | "draining" | "archived";
  revision: number;
  checksum: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  reason: string;
}

export interface AutomationSessionResolutionSnapshot {
  schema: "ccm-automation-session-resolution-v1";
  taskSource: AutomationTaskSource;
  bindingId: string;
  bindingRevision: number;
  bindingChecksum: string;
  scope: AutomationSessionScope;
  scopeId: string;
  exactSessionId: string;
  resolution: "explicit_binding" | "auto_created";
  resolvedAt: string;
}

interface BindingStore {
  schema: "ccm-automation-session-binding-store-v1";
  revision: number;
  bindings: AutomationSessionBinding[];
  updatedAt: string;
}

const STORE_FILE = path.join(CCM_DIR, "automation-session-bindings.json");
const SOURCE_ORDER: AutomationTaskSource[] = ["requirement_pool", "workbench", "global_agent"];
const SOURCE_TITLES: Record<AutomationTaskSource, string> = {
  requirement_pool: "需求池自动化任务",
  workbench: "工作台自动化任务",
  global_agent: "全局 Agent 自动化任务",
};

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function bindingChecksum(input: Omit<AutomationSessionBinding, "checksum"> | AutomationSessionBinding) {
  const { checksum: _ignored, ...base } = input as any;
  return checksum(base);
}

function emptyStore(): BindingStore {
  return { schema: "ccm-automation-session-binding-store-v1", revision: 0, bindings: [], updatedAt: "" };
}

function normalizeSources(value: any): AutomationTaskSource[] {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return SOURCE_ORDER.filter(source => rows.some(row => normalizeAutomationTaskSource(row) === source));
}

function normalizeBinding(value: any): AutomationSessionBinding | null {
  const scope = String(value?.scope || "").trim() as AutomationSessionScope;
  const scopeId = String(value?.scopeId || value?.scope_id || "").trim();
  const exactSessionId = String(value?.exactSessionId || value?.exact_session_id || "").trim();
  const sources = normalizeSources(value?.sources);
  if (!["project", "group"].includes(scope) || !scopeId || !exactSessionId || !sources.length) return null;
  const createdAt = String(value?.createdAt || value?.created_at || new Date().toISOString());
  const normalized: Omit<AutomationSessionBinding, "checksum"> = {
    schema: "ccm-automation-session-binding-v1",
    bindingId: String(value?.bindingId || value?.binding_id || `asb_${crypto.randomUUID()}`),
    scope,
    scopeId,
    exactSessionId,
    sources,
    status: ["active", "draining", "archived"].includes(String(value?.status)) ? value.status : "active",
    revision: Math.max(1, Math.floor(Number(value?.revision || 1))),
    createdAt,
    updatedAt: String(value?.updatedAt || value?.updated_at || createdAt),
    updatedBy: String(value?.updatedBy || value?.updated_by || "system"),
    reason: String(value?.reason || ""),
  };
  return { ...normalized, checksum: bindingChecksum(normalized) };
}

function loadStore(): BindingStore {
  const raw = readJsonWithBackup<any>(STORE_FILE, emptyStore());
  return {
    schema: "ccm-automation-session-binding-store-v1",
    revision: Math.max(0, Math.floor(Number(raw?.revision || 0))),
    bindings: (Array.isArray(raw?.bindings) ? raw.bindings : []).map(normalizeBinding).filter(Boolean) as AutomationSessionBinding[],
    updatedAt: String(raw?.updatedAt || raw?.updated_at || ""),
  };
}

function saveStore(store: BindingStore) {
  const next = {
    schema: "ccm-automation-session-binding-store-v1" as const,
    revision: Math.max(0, Math.floor(Number(store.revision || 0))) + 1,
    bindings: store.bindings.map(binding => ({ ...binding, checksum: bindingChecksum(binding) })),
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(STORE_FILE, next);
  return next;
}

export function normalizeAutomationTaskSource(value: any): AutomationTaskSource | null {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["requirement_pool", "requirement", "requirements", "requirement_epic"].includes(normalized)) return "requirement_pool";
  if (["workbench", "usability_intake", "usability"].includes(normalized)) return "workbench";
  if (["global_agent", "global", "global_web", "global_feishu", "global_agent_chat", "web_global_agent", "global_agent_request"].includes(normalized)) return "global_agent";
  return null;
}

export function inferAutomationTaskSource(task: any): AutomationTaskSource | null {
  const values = [
    task?.automation_task_source,
    task?.automationTaskSource,
    task?.request_origin,
    task?.requestOrigin,
    task?.workflow_meta?.intake?.source,
    task?.workflowMeta?.intake?.source,
  ];
  for (const value of values) {
    const source = normalizeAutomationTaskSource(value);
    if (source) return source;
  }
  return null;
}

function requireScope(scopeValue: any, scopeIdValue: any) {
  const scope = String(scopeValue || "").trim() as AutomationSessionScope;
  const scopeId = String(scopeIdValue || "").trim();
  if (!["project", "group"].includes(scope) || !scopeId) throw new Error("自动化会话目标无效");
  if (scope === "project" && !getConfigs().some((config: any) => String(config?.name || "") === scopeId)) throw new Error("目标项目不存在或已归档");
  if (scope === "group" && !loadGroups().some((group: any) => String(group?.id || "") === scopeId)) throw new Error("目标群聊不存在或已归档");
  return { scope, scopeId };
}

function sessionInfo(scope: AutomationSessionScope, scopeId: string, exactSessionId: string) {
  if (scope === "project") {
    const session: any = getSessionDetail(scopeId, exactSessionId);
    if (!session) return null;
    return {
      id: exactSessionId,
      title: String(session.name || session.title || exactSessionId),
      sessionKind: String(session.session_kind || session.sessionKind || "conversation"),
      archived: session.archived === true,
    };
  }
  const session: any = listGroupChatSessions(scopeId).sessions.find((item: any) => String(item?.id || "") === exactSessionId);
  if (!session) return null;
  return {
    id: exactSessionId,
    title: String(session.title || session.name || exactSessionId),
    sessionKind: String(session.session_kind || session.sessionKind || "conversation"),
    archived: session.archived === true,
  };
}

function requireAutomationSession(scope: AutomationSessionScope, scopeId: string, exactSessionId: string) {
  const session = sessionInfo(scope, scopeId, exactSessionId);
  if (!session) throw new Error("自动化任务会话不存在");
  if (session.archived) throw new Error("归档会话不能接收新任务");
  if (session.sessionKind !== "automation") throw new Error("普通会话不能绑定自动化任务来源");
  return session;
}

function createAutomationSession(scope: AutomationSessionScope, scopeId: string, source: AutomationTaskSource, title = "") {
  const sessionTitle = String(title || SOURCE_TITLES[source]).trim().slice(0, 80) || SOURCE_TITLES[source];
  if (scope === "project") {
    const created = createProjectSessionRecord(scopeId, sessionTitle, "web", { sessionKind: "automation" });
    return { exactSessionId: String(created.sessionId), title: created.name };
  }
  const created = createGroupChatSession(scopeId, sessionTitle, { sessionKind: "automation" });
  return { exactSessionId: String(created.id), title: created.title };
}

function publicBinding(binding: AutomationSessionBinding) {
  const info = sessionInfo(binding.scope, binding.scopeId, binding.exactSessionId);
  const tasks = loadTasks().filter((task: any) => {
    const taskSession = binding.scope === "project" ? task?.project_session_id : task?.group_session_id;
    return String(taskSession || "") === binding.exactSessionId;
  });
  return {
    ...binding,
    session: info,
    runningTaskCount: tasks.filter((task: any) => ["in_progress", "running", "verifying", "queued"].includes(String(task?.status || ""))).length,
    taskCount: tasks.length,
  };
}

export function listAutomationSessionBindings(scopeValue?: any, scopeIdValue?: any) {
  const scope = scopeValue ? String(scopeValue) : "";
  const scopeId = scopeIdValue ? String(scopeIdValue) : "";
  return loadStore().bindings
    .filter(binding => (!scope || binding.scope === scope) && (!scopeId || binding.scopeId === scopeId))
    .map(publicBinding);
}

export function bindAutomationSessionSources(input: {
  scope: AutomationSessionScope;
  scopeId: string;
  exactSessionId: string;
  sources: AutomationTaskSource[] | string[];
  expectedRevision?: number;
  actor?: string;
  reason?: string;
}) {
  const { scope, scopeId } = requireScope(input.scope, input.scopeId);
  const exactSessionId = String(input.exactSessionId || "").trim();
  const sources = normalizeSources(input.sources);
  if (!sources.length) throw new Error("至少选择一个任务来源");
  requireAutomationSession(scope, scopeId, exactSessionId);
  return withFileLock(STORE_FILE, () => {
    const store = loadStore();
    const existing = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.exactSessionId === exactSessionId && binding.status !== "archived");
    if (input.expectedRevision != null && (!existing || existing.revision !== Number(input.expectedRevision))) throw new Error("绑定状态已经变化，请刷新后重试");
    for (const binding of store.bindings) {
      if (binding.scope !== scope || binding.scopeId !== scopeId || binding.exactSessionId === exactSessionId || binding.status !== "active") continue;
      const remaining = binding.sources.filter(source => !sources.includes(source));
      binding.sources = remaining;
      binding.revision += 1;
      binding.updatedAt = new Date().toISOString();
      binding.updatedBy = String(input.actor || "system");
      binding.reason = `source_transferred:${String(input.reason || "manual_binding")}`;
      if (!remaining.length) binding.status = "archived";
      binding.checksum = bindingChecksum(binding);
    }
    const now = new Date().toISOString();
    let target = existing;
    if (target) {
      target.sources = normalizeSources([...target.sources, ...sources]);
      target.status = "active";
      target.revision += 1;
      target.updatedAt = now;
      target.updatedBy = String(input.actor || "system");
      target.reason = String(input.reason || "manual_binding");
      target.checksum = bindingChecksum(target);
    } else {
      const draft: Omit<AutomationSessionBinding, "checksum"> = {
        schema: "ccm-automation-session-binding-v1",
        bindingId: `asb_${crypto.randomUUID()}`,
        scope,
        scopeId,
        exactSessionId,
        sources,
        status: "active",
        revision: 1,
        createdAt: now,
        updatedAt: now,
        updatedBy: String(input.actor || "system"),
        reason: String(input.reason || "manual_binding"),
      };
      target = { ...draft, checksum: bindingChecksum(draft) };
      store.bindings.push(target);
    }
    saveStore(store);
    return publicBinding(target);
  });
}

export function replaceAutomationSessionSources(input: {
  scope: AutomationSessionScope;
  scopeId: string;
  exactSessionId: string;
  sources: AutomationTaskSource[] | string[];
  expectedRevision?: number;
  actor?: string;
  reason?: string;
}) {
  const { scope, scopeId } = requireScope(input.scope, input.scopeId);
  const exactSessionId = String(input.exactSessionId || "").trim();
  const sources = normalizeSources(input.sources);
  requireAutomationSession(scope, scopeId, exactSessionId);
  return withFileLock(STORE_FILE, () => {
    const store = loadStore();
    const existing = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.exactSessionId === exactSessionId && binding.status !== "archived");
    if (input.expectedRevision != null && (!existing || existing.revision !== Number(input.expectedRevision))) throw new Error("绑定状态已经变化，请刷新后重试");
    for (const binding of store.bindings) {
      if (binding.scope !== scope || binding.scopeId !== scopeId || binding.exactSessionId === exactSessionId || binding.status !== "active") continue;
      const remaining = binding.sources.filter(source => !sources.includes(source));
      if (remaining.length === binding.sources.length) continue;
      binding.sources = remaining;
      binding.status = remaining.length ? binding.status : "archived";
      binding.revision += 1;
      binding.updatedAt = new Date().toISOString();
      binding.updatedBy = String(input.actor || "system");
      binding.reason = `source_transferred:${String(input.reason || "manual_binding_replace")}`;
      binding.checksum = bindingChecksum(binding);
    }
    const now = new Date().toISOString();
    let target = existing;
    if (!target) {
      const draft: Omit<AutomationSessionBinding, "checksum"> = {
        schema: "ccm-automation-session-binding-v1",
        bindingId: `asb_${crypto.randomUUID()}`,
        scope,
        scopeId,
        exactSessionId,
        sources,
        status: sources.length ? "active" : "archived",
        revision: 1,
        createdAt: now,
        updatedAt: now,
        updatedBy: String(input.actor || "system"),
        reason: String(input.reason || "manual_binding_replace"),
      };
      target = { ...draft, checksum: bindingChecksum(draft) };
      store.bindings.push(target);
    } else {
      target.sources = sources;
      target.status = sources.length ? "active" : "archived";
      target.revision += 1;
      target.updatedAt = now;
      target.updatedBy = String(input.actor || "system");
      target.reason = String(input.reason || "manual_binding_replace");
      target.checksum = bindingChecksum(target);
    }
    saveStore(store);
    return publicBinding(target);
  });
}

export function createBoundAutomationSession(input: {
  scope: AutomationSessionScope;
  scopeId: string;
  sources: AutomationTaskSource[] | string[];
  title?: string;
  actor?: string;
  reason?: string;
}) {
  const { scope, scopeId } = requireScope(input.scope, input.scopeId);
  const sources = normalizeSources(input.sources);
  if (!sources.length) throw new Error("至少选择一个任务来源");
  return withFileLock(STORE_FILE, () => {
    const created = createAutomationSession(scope, scopeId, sources[0], input.title);
    // The store lock is already held, so perform the same transfer in-place.
    const store = loadStore();
    for (const binding of store.bindings) {
      if (binding.scope !== scope || binding.scopeId !== scopeId || binding.status !== "active") continue;
      binding.sources = binding.sources.filter(source => !sources.includes(source));
      if (!binding.sources.length) binding.status = "archived";
      binding.revision += 1;
      binding.updatedAt = new Date().toISOString();
      binding.updatedBy = String(input.actor || "system");
      binding.reason = "source_transferred:auto_session_created";
      binding.checksum = bindingChecksum(binding);
    }
    const now = new Date().toISOString();
    const draft: Omit<AutomationSessionBinding, "checksum"> = {
      schema: "ccm-automation-session-binding-v1",
      bindingId: `asb_${crypto.randomUUID()}`,
      scope,
      scopeId,
      exactSessionId: created.exactSessionId,
      sources,
      status: "active",
      revision: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: String(input.actor || "system"),
      reason: String(input.reason || "automation_session_created"),
    };
    const binding = { ...draft, checksum: bindingChecksum(draft) };
    store.bindings.push(binding);
    saveStore(store);
    return publicBinding(binding);
  });
}

export function setAutomationSessionBindingStatus(bindingIdValue: any, statusValue: any, expectedRevision?: any, actor = "system", reason = "") {
  const bindingId = String(bindingIdValue || "").trim();
  const status = String(statusValue || "").trim() as AutomationSessionBinding["status"];
  if (!["active", "draining", "archived"].includes(status)) throw new Error("绑定状态无效");
  return withFileLock(STORE_FILE, () => {
    const store = loadStore();
    const binding = store.bindings.find(item => item.bindingId === bindingId);
    if (!binding) throw new Error("自动化会话绑定不存在");
    if (expectedRevision != null && binding.revision !== Number(expectedRevision)) throw new Error("绑定状态已经变化，请刷新后重试");
    binding.status = status;
    binding.revision += 1;
    binding.updatedAt = new Date().toISOString();
    binding.updatedBy = String(actor || "system");
    binding.reason = String(reason || `binding_${status}`);
    binding.checksum = bindingChecksum(binding);
    saveStore(store);
    return publicBinding(binding);
  });
}

export function resolveAutomationSessionBinding(input: {
  scope: AutomationSessionScope;
  scopeId: string;
  source: AutomationTaskSource | string;
  title?: string;
  actor?: string;
}) {
  const { scope, scopeId } = requireScope(input.scope, input.scopeId);
  const source = normalizeAutomationTaskSource(input.source);
  if (!source) throw new Error("自动化任务来源无效");
  return withFileLock(STORE_FILE, () => {
    const store = loadStore();
    const active = store.bindings.find(binding => binding.scope === scope && binding.scopeId === scopeId && binding.status === "active" && binding.sources.includes(source));
    if (active) {
      const session = sessionInfo(scope, scopeId, active.exactSessionId);
      if (session && session.sessionKind === "automation" && !session.archived) {
        const snapshot: AutomationSessionResolutionSnapshot = {
          schema: "ccm-automation-session-resolution-v1",
          taskSource: source,
          bindingId: active.bindingId,
          bindingRevision: active.revision,
          bindingChecksum: active.checksum,
          scope,
          scopeId,
          exactSessionId: active.exactSessionId,
          resolution: "explicit_binding",
          resolvedAt: new Date().toISOString(),
        };
        return { binding: publicBinding(active), snapshot, created: false };
      }
      active.status = "archived";
      active.revision += 1;
      active.updatedAt = new Date().toISOString();
      active.updatedBy = "system";
      active.reason = "bound_session_missing_or_unwritable";
      active.checksum = bindingChecksum(active);
    }
    const created = createAutomationSession(scope, scopeId, source, input.title);
    const now = new Date().toISOString();
    const draft: Omit<AutomationSessionBinding, "checksum"> = {
      schema: "ccm-automation-session-binding-v1",
      bindingId: `asb_${crypto.randomUUID()}`,
      scope,
      scopeId,
      exactSessionId: created.exactSessionId,
      sources: [source],
      status: "active",
      revision: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: String(input.actor || "system"),
      reason: "first_task_auto_created",
    };
    const binding = { ...draft, checksum: bindingChecksum(draft) };
    store.bindings.push(binding);
    saveStore(store);
    const snapshot: AutomationSessionResolutionSnapshot = {
      schema: "ccm-automation-session-resolution-v1",
      taskSource: source,
      bindingId: binding.bindingId,
      bindingRevision: binding.revision,
      bindingChecksum: binding.checksum,
      scope,
      scopeId,
      exactSessionId: binding.exactSessionId,
      resolution: "auto_created",
      resolvedAt: now,
    };
    return { binding: publicBinding(binding), snapshot, created: true };
  });
}

export function listGlobalDispatchTargets() {
  const projects = getConfigs().map((config: any) => ({
    scope: "project" as const,
    scopeId: String(config?.name || ""),
    canonicalName: String(config?.name || ""),
    displayName: String(config?.display_name || config?.displayName || config?.name || ""),
    ready: !!String(config?.name || ""),
    unavailableReason: "",
  })).filter(item => item.scopeId);
  const groups = loadGroups().map((group: any) => {
    const members = Array.isArray(group?.members) ? group.members : [];
    const ready = members.some((member: any) => !!String(member?.project || member?.id || ""));
    return {
      scope: "group" as const,
      scopeId: String(group?.id || ""),
      canonicalName: String(group?.name || group?.id || ""),
      displayName: String(group?.name || group?.id || ""),
      ready,
      unavailableReason: ready ? "" : "群聊尚未配置可执行成员",
    };
  }).filter(item => item.scopeId);
  return [...groups, ...projects].sort((a, b) => `${a.scope}:${a.displayName}`.localeCompare(`${b.scope}:${b.displayName}`, "zh-CN"));
}

import * as crypto from "crypto";
import { sanitizeMainAgentUserFacingText } from "./user-facing-text";

export type MainAgentWorkItemStatus = "pending" | "in_progress" | "completed" | "blocked" | "failed" | "cancelled";

export type MainAgentWorkItem = {
  id: string;
  taskId: string;
  scopeId: string;
  subject: string;
  description: string;
  activeForm: string;
  owner: string;
  target: string;
  agentType: string;
  status: MainAgentWorkItemStatus;
  blocks: string[];
  blockedBy: string[];
  attempt: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  completedAt: string;
  lastReceipt: any | null;
  evidence: string[];
  filesChanged: string[];
  verification: string[];
  blockers: string[];
  needs: string[];
  requeueReason: string;
};

export type MainAgentWorkItemClaimResult = {
  ok: boolean;
  reason?: "task_not_found" | "already_claimed" | "already_resolved" | "blocked" | "agent_busy";
  item?: MainAgentWorkItem;
  busy?: MainAgentWorkItem;
  items: MainAgentWorkItem[];
  blocking?: string[];
};

export type MainAgentWorkItemUnlockSummary = {
  schema: "ccm-main-agent-work-item-unlock-summary-v1";
  title: string;
  status: "ready_to_dispatch" | "auto_dispatch_deferred" | "auto_dispatch_queued" | "auto_dispatch_blocked";
  status_label: string;
  headline: string;
  rows: Array<{ id: string; target: string; owner: string; subject: string; label: string }>;
  next_claimable: Array<{ id: string; target: string; owner: string; subject: string }>;
  next_action: string;
  display_policy: any;
  technical: any;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const WORK_ITEM_VERIFICATION_PATTERN = /验证|验收|测试|复核|检查|verify|verification|test|qa|lint|build/i;

function compactText(value: any, max = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function workItemVisibleText(value: any, fallback = "", max = 240) {
  const text = sanitizeMainAgentUserFacingText(value || fallback);
  return compactText(text || fallback, max);
}

function stringList(value: any, limit = 20) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|；|;|,|、/)
      : [];
  return [...new Set(source.map(item => compactText(item, 220)).filter(Boolean))].slice(0, limit);
}

function stableId(prefix: string, value: any) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

export function normalizeMainAgentWorkItemStatus(status: any): MainAgentWorkItemStatus {
  const value = String(status || "").toLowerCase().trim();
  if (["done", "completed", "succeeded", "success"].includes(value)) return "completed";
  if (["running", "in_progress", "executing", "reviewing", "ready", "prompt_accepted", "spawning"].includes(value)) return "in_progress";
  if (["blocked", "needs_info", "needs_user", "waiting_user", "partial", "missing_receipt"].includes(value)) return "blocked";
  if (["failed", "error"].includes(value)) return "failed";
  if (["cancelled", "canceled"].includes(value)) return "cancelled";
  return "pending";
}

function normalizeRefList(value: any) {
  return stringList(value, 20).map(item => item.replace(/^@/, "").trim()).filter(Boolean);
}

function workItemReferenceMatches(item: MainAgentWorkItem, ref: any) {
  const value = String(ref || "").replace(/^@/, "").trim().toLowerCase();
  if (!value) return false;
  return [item.id, item.target, item.owner, item.subject].some(candidate => String(candidate || "").toLowerCase() === value);
}

function findWorkItemByRef(items: MainAgentWorkItem[], ref: any) {
  return items.find(item => workItemReferenceMatches(item, ref)) || null;
}

function normalizeReceiptRows(task: any = {}) {
  const summary = task.delivery_summary || {};
  return [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ...(task.receipt ? [task.receipt] : []),
  ];
}

function findReceiptForItem(item: MainAgentWorkItem, receipts: any[]) {
  return receipts.find(receipt => {
    const agent = String(receipt?.agent || receipt?.project || receipt?.target || "").trim().toLowerCase();
    return agent && [item.target, item.owner].some(value => String(value || "").trim().toLowerCase() === agent);
  }) || null;
}

function findExecutionForItem(item: MainAgentWorkItem, executions: any[]) {
  return executions.find(execution => {
    const project = String(execution?.project || execution?.agent || "").trim().toLowerCase();
    return project && [item.target, item.owner].some(value => String(value || "").trim().toLowerCase() === project);
  }) || null;
}

function normalizeWorkItem(raw: any = {}, context: any = {}): MainAgentWorkItem {
  const target = compactText(raw.target || raw.targetName || raw.project || raw.agent || raw.owner || context.target || "", 100);
  const subject = compactText(raw.subject || raw.title || raw.task || raw.message || raw.description || context.subject || "处理子任务", 160);
  const now = context.now || new Date().toISOString();
  const id = compactText(raw.id || raw.work_item_id || raw.workItemId || raw.assignmentId || raw.assignment_id || "", 100)
    || stableId("wi", {
      taskId: context.taskId,
      target,
      subject,
      index: context.index,
      source: raw.source || context.source,
    });
  return {
    id,
    taskId: String(raw.taskId || raw.task_id || context.taskId || "").trim(),
    scopeId: String(raw.scopeId || raw.scope_id || context.scopeId || "").trim(),
    subject,
    description: compactText(raw.description || raw.task || raw.message || subject, 500),
    activeForm: compactText(raw.activeForm || raw.active_form || `正在处理：${subject}`, 180),
    owner: compactText(raw.owner || raw.assignee || raw.project || raw.agent || target, 100),
    target,
    agentType: compactText(raw.agentType || raw.agent_type || raw.executor || raw.runtime || "", 80),
    status: normalizeMainAgentWorkItemStatus(raw.status),
    blocks: normalizeRefList(raw.blocks || raw.blocking || []),
    blockedBy: normalizeRefList(raw.blockedBy || raw.blocked_by || raw.dependsOn || raw.depends_on || raw.depends || []),
    attempt: Math.max(1, Number(raw.attempt || raw.retry_count || 1) || 1),
    source: compactText(raw.source || context.source || "main-agent", 80),
    createdAt: String(raw.createdAt || raw.created_at || now),
    updatedAt: String(raw.updatedAt || raw.updated_at || now),
    startedAt: String(raw.startedAt || raw.started_at || ""),
    completedAt: String(raw.completedAt || raw.completed_at || ""),
    lastReceipt: raw.lastReceipt || raw.last_receipt || raw.receipt || null,
    evidence: stringList([...(Array.isArray(raw.evidence) ? raw.evidence : []), ...(raw.summary ? [raw.summary] : [])], 12),
    filesChanged: stringList(raw.filesChanged || raw.files_changed || raw.files, 30),
    verification: stringList(raw.verification || raw.tests || raw.verification_results, 20),
    blockers: stringList(raw.blockers, 12),
    needs: stringList(raw.needs, 12),
    requeueReason: compactText(raw.requeueReason || raw.requeue_reason || "", 200),
  };
}

function assignmentToWorkItem(assignment: any, task: any, index: number): MainAgentWorkItem {
  return normalizeWorkItem({
    ...assignment,
    source: assignment.source || "assignment_evidence",
    subject: assignment.subject || assignment.task || assignment.message || task.business_goal || task.title,
    target: assignment.targetName || assignment.project || assignment.agent || assignment.target_project,
    owner: assignment.owner || assignment.project || assignment.agent || assignment.targetName || assignment.target_project,
    blockedBy: assignment.blockedBy || assignment.blocked_by || assignment.dependsOn || assignment.depends_on,
  }, {
    taskId: task.id,
    scopeId: task.group_id || task.global_mission_id || task.id,
    index,
    source: "assignment_evidence",
  });
}

function missionTargetToWorkItem(target: any, task: any, index: number): MainAgentWorkItem {
  return normalizeWorkItem({
    source: "mission_plan",
    subject: target.task || target.reason || task.business_goal || task.title,
    description: target.reason || target.task || task.business_goal || task.title,
    target: target.name || target.project || target.group_id || target.coordinator,
    owner: target.coordinator || target.project || target.name,
    agentType: target.type || "",
    blockedBy: target.depends_on || target.dependsOn || [],
  }, {
    taskId: task.id,
    scopeId: task.group_id || task.global_mission_id || task.id,
    index,
    source: "mission_plan",
  });
}

function fallbackTaskWorkItem(task: any): MainAgentWorkItem | null {
  const target = task.target_project || task.mission_target?.name || task.mission_target?.project || "";
  const executable = !!target || ["daily_dev", "project_task"].includes(String(task.workflow_type || ""));
  if (!executable) return null;
  return normalizeWorkItem({
    source: "task_target",
    subject: task.business_goal || task.title || "处理项目任务",
    description: task.description || task.business_goal || task.title,
    target: target || task.group_id || "main-agent",
    owner: target || "",
    status: task.status === "done" ? "completed" : task.status,
  }, {
    taskId: task.id,
    scopeId: task.group_id || task.global_mission_id || task.id,
    index: 0,
    source: "task_target",
  });
}

function applyReceiptAndExecution(item: MainAgentWorkItem, task: any, receipts: any[], executions: any[], now: string): MainAgentWorkItem {
  const receipt = findReceiptForItem(item, receipts);
  const execution = findExecutionForItem(item, executions);
  let status = item.status;
  if (receipt) status = normalizeMainAgentWorkItemStatus(receipt.status || receipt.receipt_status);
  else if (execution) status = normalizeMainAgentWorkItemStatus(execution.state || execution.status);
  else if (task.status === "done" && item.source === "task_target") status = "completed";
  else if (["failed", "cancelled"].includes(String(task.status || "")) && item.source === "task_target") status = normalizeMainAgentWorkItemStatus(task.status);
  const filesChanged = stringList([
    ...item.filesChanged,
    ...(receipt ? stringList(receipt.filesChanged || receipt.files_changed || receipt.files, 30) : []),
  ], 30);
  const verification = stringList([
    ...item.verification,
    ...(receipt ? stringList(receipt.verification || receipt.tests || receipt.verification_results, 20) : []),
  ], 20);
  const blockers = stringList([
    ...item.blockers,
    ...(receipt ? stringList(receipt.blockers, 12) : []),
  ], 12);
  const needs = stringList([
    ...item.needs,
    ...(receipt ? stringList(receipt.needs, 12) : []),
  ], 12);
  const evidence = stringList([
    ...item.evidence,
    ...(receipt?.summary ? [receipt.summary] : []),
    ...(filesChanged.length ? [`修改文件 ${filesChanged.length} 个`] : []),
    ...(verification.length ? [`验证 ${verification.length} 项`] : []),
  ], 12);
  return {
    ...item,
    status,
    lastReceipt: receipt || item.lastReceipt || null,
    filesChanged,
    verification,
    blockers,
    needs,
    evidence,
    startedAt: item.startedAt || (status === "in_progress" ? now : ""),
    completedAt: item.completedAt || (TERMINAL_STATUSES.has(status) ? now : ""),
    updatedAt: receipt || execution ? now : item.updatedAt || now,
  };
}

function dedupeWorkItems(items: MainAgentWorkItem[]) {
  const seen = new Set<string>();
  const result: MainAgentWorkItem[] = [];
  for (const item of items) {
    const key = item.id || `${item.target}|${item.subject}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function workItemHasVerificationSignal(item: MainAgentWorkItem) {
  const text = [
    item.subject,
    item.description,
    item.activeForm,
    item.owner,
    item.target,
    ...item.evidence,
    ...item.verification,
  ].filter(Boolean).join(" ");
  return WORK_ITEM_VERIFICATION_PATTERN.test(text);
}

function workItemUserLabel(item: MainAgentWorkItem | null) {
  if (!item) return "";
  return compactText(item.target || item.owner || item.subject || item.id, 80);
}

function dependencyLabel(items: MainAgentWorkItem[], ref: any) {
  const item = findWorkItemByRef(items, ref);
  return workItemUserLabel(item) || compactText(ref, 80);
}

function workItemDependencyRows(items: MainAgentWorkItem[]) {
  return items
    .filter(item => item.blockedBy.length > 0)
    .map(item => {
      const dependencies = item.blockedBy.map(ref => {
        const dependency = findWorkItemByRef(items, ref);
        const status = dependency?.status || "pending";
        return {
          id: dependency?.id || compactText(ref, 80),
          label: dependencyLabel(items, ref),
          status,
          completed: status === "completed",
        };
      });
      const openDependencies = dependencies.filter(dep => dep.completed !== true);
      const itemLabel = workItemVisibleText(workItemUserLabel(item) || "执行成员", "执行成员", 80);
      const waitingLabels = (openDependencies.length ? openDependencies : dependencies).map(dep => dep.label).filter(Boolean);
      return {
        id: item.id,
        target: item.target || item.owner,
        subject: item.subject,
        status: item.status,
        dependency_count: dependencies.length,
        open_dependency_count: openDependencies.length,
        dependencies,
        label: openDependencies.length
          ? `${itemLabel} 等待 ${waitingLabels.join("、")} 完成后继续`
          : `${itemLabel} 的前置依赖已完成，可以进入下一步`,
        next_action: openDependencies.length
          ? "等待前置工作完成后再派发，避免执行成员提前开工。"
          : "可以派发给对应执行成员继续执行。",
      };
    });
}

function workItemOpenDependencyRefs(items: MainAgentWorkItem[], item: MainAgentWorkItem) {
  return item.blockedBy.filter(ref => {
    const dep = findWorkItemByRef(items, ref);
    return dep && dep.status !== "completed";
  });
}

function isWorkItemClaimableByDependency(items: MainAgentWorkItem[], item: MainAgentWorkItem) {
  return ["pending", "blocked"].includes(String(item.status || "")) && workItemOpenDependencyRefs(items, item).length === 0;
}

function buildWorkItemDependencySummary(items: MainAgentWorkItem[], nextClaimable: MainAgentWorkItem[]) {
  const rows = workItemDependencyRows(items);
  const waiting = rows.filter(row => row.open_dependency_count > 0);
  const readyRows = rows.filter(row => row.open_dependency_count === 0 && ["pending", "blocked"].includes(String(row.status || "")));
  if (!rows.length && !nextClaimable.length) return null;
  const status = waiting.length ? "waiting_dependency" : nextClaimable.length ? "ready_to_dispatch" : "tracking";
  return {
    schema: "ccm-main-agent-work-item-dependency-summary-v1",
    title: "依赖与派发",
    status,
    status_label: status === "waiting_dependency" ? `${waiting.length} 项等待前置` : status === "ready_to_dispatch" ? `${nextClaimable.length} 项可派发` : "已记录",
    headline: waiting.length
      ? `还有 ${waiting.length} 个工作项需要等前置任务完成，我会按依赖顺序派发。`
      : nextClaimable.length
        ? `${nextClaimable.length} 个工作项已经解锁，可以继续派发。`
        : "执行队列依赖关系已记录，我会继续跟踪。",
    rows: rows.slice(0, 8),
    ready: readyRows.map(row => ({ id: row.id, target: row.target, subject: row.subject, label: row.label })).slice(0, 6),
    next_claimable: nextClaimable.map(item => ({ id: item.id, target: item.target, subject: item.subject })).slice(0, 6),
    next_action: nextClaimable.length
      ? "优先派发已解锁工作项，并继续监听前置任务状态。"
      : waiting.length
        ? "等待前置工作完成；完成后我会刷新可派发列表。"
        : "继续跟踪执行队列状态。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function buildWorkItemVerificationReminder(items: MainAgentWorkItem[]) {
  if (items.length < 3) return null;
  if (!items.every(item => item.status === "completed")) return null;
  if (items.some(workItemHasVerificationSignal)) return null;
  return {
    schema: "ccm-main-agent-work-item-verification-reminder-v1",
    status: "needs_verification_work_item",
    title: "执行队列还缺验收",
    headline: "工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。",
    reason: "3 个以上工作项全部完成时，需要在最终总结前补一次真实验收。",
    next_action: "我会补齐验收或说明无法验证的原因，再给出最终交付总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

export function buildMainAgentWorkItems(task: any = {}, options: { executions?: any[]; now?: string } = {}) {
  const now = options.now || new Date().toISOString();
  const summary = task.delivery_summary || {};
  const explicit = Array.isArray(task.work_items || task.workItems) ? (task.work_items || task.workItems) : [];
  const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const missionTargets = Array.isArray(task.mission_plan?.targets) ? task.mission_plan.targets : [];
  const rehearsalPlan = Array.isArray(task.workflow_meta?.sandbox_rehearsal?.agent_plan)
    ? task.workflow_meta.sandbox_rehearsal.agent_plan
    : Array.isArray(task.sandbox_rehearsal?.agent_plan)
      ? task.sandbox_rehearsal.agent_plan
      : [];
  const explicitItems = explicit.map((item: any, index: number) => normalizeWorkItem(item, { taskId: task.id, scopeId: task.group_id || task.global_mission_id || task.id, index, now, source: item.source || "task_work_items" }));
  const derivedItems = [
    ...assignments.map((assignment: any, index: number) => assignmentToWorkItem(assignment, task, index)),
    ...(!assignments.length ? missionTargets.map((target: any, index: number) => missionTargetToWorkItem(target, task, index)) : []),
    ...(!assignments.length && !missionTargets.length
      ? rehearsalPlan.map((assignment: any, index: number) => assignmentToWorkItem({
          ...assignment,
          source: assignment.source || "sandbox_rehearsal_plan",
          targetName: assignment.targetName || assignment.project,
        }, task, index))
      : []),
  ];
  const fallback = !derivedItems.length ? fallbackTaskWorkItem(task) : null;
  const filteredExplicit = derivedItems.length
    ? explicitItems.filter(item => item.source !== "task_target")
    : explicitItems;
  const baseItems = filteredExplicit.length || derivedItems.length
    ? [...filteredExplicit, ...derivedItems]
    : [fallback].filter(Boolean) as MainAgentWorkItem[];
  const receipts = normalizeReceiptRows(task);
  const executions = Array.isArray(options.executions) ? options.executions : [];
  const enriched = dedupeWorkItems(baseItems)
    .map(item => applyReceiptAndExecution(item, task, receipts, executions, now));
  return enriched
    .map(item => {
      const unresolvedDeps = item.blockedBy.filter(ref => {
        const dep = findWorkItemByRef(enriched, ref);
        return dep && dep.status !== "completed";
      });
      if (unresolvedDeps.length && item.status === "pending") return { ...item, status: "blocked" as const, blockers: stringList([...item.blockers, `等待前置工作：${unresolvedDeps.join("、")}`], 12) };
      return item;
    });
}

export function updateMainAgentWorkItem(items: MainAgentWorkItem[], itemRef: string, patch: Partial<MainAgentWorkItem> = {}, now = new Date().toISOString()) {
  return items.map(item => {
    if (!workItemReferenceMatches(item, itemRef)) return item;
    return normalizeWorkItem({ ...item, ...patch, status: patch.status || item.status, updatedAt: now }, { taskId: item.taskId, scopeId: item.scopeId, now, source: item.source });
  });
}

export function claimMainAgentWorkItem(items: MainAgentWorkItem[], itemRef: string, owner: string, options: { checkOwnerBusy?: boolean; now?: string } = {}): MainAgentWorkItemClaimResult {
  const now = options.now || new Date().toISOString();
  const normalizedOwner = compactText(owner, 100);
  const target = findWorkItemByRef(items, itemRef);
  if (!target) return { ok: false, reason: "task_not_found", items };
  if (TERMINAL_STATUSES.has(target.status)) return { ok: false, reason: "already_resolved", item: target, items };
  if (target.owner && target.owner !== normalizedOwner && target.status === "in_progress") {
    return { ok: false, reason: "already_claimed", item: target, items };
  }
  const blocking = target.blockedBy.filter(ref => {
    const dep = findWorkItemByRef(items, ref);
    return dep && dep.status !== "completed";
  });
  if (blocking.length) return { ok: false, reason: "blocked", item: target, items, blocking };
  if (options.checkOwnerBusy) {
    const busy = items.find(item => item.id !== target.id && item.owner === normalizedOwner && item.status === "in_progress");
    if (busy) return { ok: false, reason: "agent_busy", item: target, busy, items };
  }
  const nextItems = items.map(item => item.id === target.id
    ? { ...item, owner: normalizedOwner || item.owner, status: "in_progress" as const, startedAt: item.startedAt || now, updatedAt: now }
    : item);
  return { ok: true, item: nextItems.find(item => item.id === target.id), items: nextItems };
}

export function buildMainAgentWorkItemUnlockSummary(previousItems: MainAgentWorkItem[], nextItems: MainAgentWorkItem[], options: any = {}): MainAgentWorkItemUnlockSummary | null {
  const unlocked = nextItems.filter(item => {
    if (!isWorkItemClaimableByDependency(nextItems, item)) return false;
    const before = findWorkItemByRef(previousItems, item.id) || findWorkItemByRef(previousItems, item.target) || findWorkItemByRef(previousItems, item.subject);
    return before ? workItemOpenDependencyRefs(previousItems, before).length > 0 : item.blockedBy.length > 0;
  });
  if (!unlocked.length) return null;
  const completedAgent = workItemVisibleText(options.completedAgent || options.agent || "前置工作", "前置工作", 80);
  const rows = unlocked.map(item => {
    const label = `${workItemVisibleText(workItemUserLabel(item) || "执行成员", "执行成员", 80)} 的前置依赖已完成，可以进入下一步`;
    return { id: item.id, target: item.target, owner: item.owner, subject: item.subject, label };
  }).slice(0, 8);
  const status = options.status || "ready_to_dispatch";
  const statusLabel: any = {
    ready_to_dispatch: `${rows.length} 项已解锁`,
    auto_dispatch_deferred: "已自动接上",
    auto_dispatch_queued: "已加入队列",
    auto_dispatch_blocked: "等待接续",
  };
  return {
    schema: "ccm-main-agent-work-item-unlock-summary-v1",
    title: "前置完成，下一步已解锁",
    status,
    status_label: options.status_label || statusLabel[status] || "已解锁",
    headline: workItemVisibleText(options.headline || `${completedAgent} 完成后，${rows.length} 个后续工作项已经解锁，我会按顺序继续派发。`, "", 260),
    rows,
    next_claimable: rows.map(row => ({ id: row.id, target: row.target, owner: row.owner, subject: row.subject })),
    next_action: workItemVisibleText(options.next_action || "我会优先接上已解锁工作项，并继续跟踪执行和验证。", "", 220),
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
    technical: {
      completed_agent: completedAgent,
      unlocked_work_item_ids: rows.map(row => row.id),
      auto_dispatch: options.auto_dispatch || null,
    },
  };
}

export function buildMainAgentWorkItemClaimSummary(result: MainAgentWorkItemClaimResult, owner = "", itemRef = "") {
  const item = result.item || null;
  const ownerLabel = workItemVisibleText(owner || item?.owner || item?.target || "执行成员", "执行成员", 80) || "执行成员";
  const subject = compactText(item?.subject || item?.description || itemRef || "当前工作项", 160) || "当前工作项";
  const blockingLabels = (result.blocking || []).map(ref => dependencyLabel(result.items, ref)).filter(Boolean);
  let status = result.ok ? "claimed" : result.reason || "task_not_found";
  let statusLabel = result.ok ? "已派发" : "继续等待";
  let headline = `${ownerLabel} 已接下“${subject}”，我会继续跟踪执行和验证。`;
  let nextAction = "等待执行成员提交结果和验证证据。";

  if (!result.ok && result.reason === "blocked") {
    headline = `“${subject}”还在等待${blockingLabels.length ? ` ${blockingLabels.join("、")} ` : "前置工作"}完成，暂不派发。`;
    nextAction = "前置工作完成后，我会刷新执行队列并继续派发。";
  } else if (!result.ok && result.reason === "agent_busy") {
    const busySubject = compactText(result.busy?.subject || result.busy?.description || "另一个工作项", 160);
    headline = `${ownerLabel} 正在处理“${busySubject}”，“${subject}”会继续等待。`;
    nextAction = "当前工作完成后，我会重新检查并派发这个工作项。";
  } else if (!result.ok && result.reason === "already_claimed") {
    const activeOwner = compactText(item?.owner || item?.target || ownerLabel, 80);
    headline = `“${subject}”正在由 ${activeOwner} 处理，我不会重复派发。`;
    nextAction = "继续等待现有执行结果和验证证据。";
  } else if (!result.ok && result.reason === "already_resolved") {
    statusLabel = "已经处理";
    headline = `“${subject}”已经完成或结束，不需要再次派发。`;
    nextAction = "我会继续检查其他未完成工作项。";
  } else if (!result.ok) {
    status = "task_not_found";
    statusLabel = "队列已刷新";
    headline = "没有找到对应的可派发工作项，我会刷新执行队列。";
    nextAction = "请从更新后的“下一步可派发”列表继续操作。";
  }

  return {
    schema: "ccm-main-agent-work-item-claim-summary-v1",
    title: "派发状态",
    status,
    status_label: statusLabel,
    headline: workItemVisibleText(headline, "", 260),
    next_action: workItemVisibleText(nextAction, "", 220),
    work_item: item ? { id: item.id, target: item.target, owner: item.owner, subject: item.subject } : null,
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
    technical: {
      reason_code: result.reason || "",
      work_item_id: item?.id || compactText(itemRef, 100),
      blocking_refs: result.blocking || [],
      busy_work_item_id: result.busy?.id || "",
    },
  };
}

export function requeueStaleMainAgentWorkItems(items: MainAgentWorkItem[], options: { staleMs?: number; nowMs?: number; reason?: string } = {}) {
  const staleMs = Number(options.staleMs || 30 * 60 * 1000);
  const nowMs = Number(options.nowMs || Date.now());
  const now = new Date(nowMs).toISOString();
  const requeued: MainAgentWorkItem[] = [];
  const next = items.map(item => {
    if (item.status !== "in_progress") return item;
    const last = Date.parse(item.updatedAt || item.startedAt || item.createdAt || now);
    if (!Number.isFinite(last) || nowMs - last < staleMs) return item;
    const updated = {
      ...item,
      status: "pending" as const,
      owner: "",
      attempt: Number(item.attempt || 1) + 1,
      updatedAt: now,
      requeueReason: workItemVisibleText(options.reason || "执行成员长时间无进展，我可以重新分配", "", 200),
    };
    requeued.push(updated);
    return updated;
  });
  return { items: next, requeued };
}

export function buildMainAgentWorkItemSummary(items: MainAgentWorkItem[]) {
  const counts = items.reduce((acc: any, item) => {
    acc[item.status] = Number(acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const nextClaimable = items.filter(item => isWorkItemClaimableByDependency(items, item));
  const verificationReminder = buildWorkItemVerificationReminder(items);
  const dependencySummary = buildWorkItemDependencySummary(items, nextClaimable);
  return {
    total: items.length,
    counts,
    active: items.filter(item => item.status === "in_progress").map(item => item.owner || item.target).filter(Boolean),
    blocked: items.filter(item => item.status === "blocked").map(item => ({ id: item.id, target: item.target, blockers: item.blockers })),
    next_claimable: nextClaimable.map(item => ({ id: item.id, target: item.target, subject: item.subject })),
    dependency_summary: dependencySummary,
    verification_nudge: Boolean(verificationReminder),
    verification_reminder: verificationReminder,
    all_completed: items.length > 0 && items.every(item => item.status === "completed"),
  };
}

export function runMainAgentWorkItemSelfTest() {
  const task = {
    id: "task-work-items",
    group_id: "group-1",
    title: "跨端筛选改造",
    delivery_summary: {
      assignment_evidence: [
        { project: "api", task: "提供 owner 筛选接口" },
        { project: "web", task: "接入 owner 筛选 UI", dependsOn: "api" },
      ],
      receipts: [
        { agent: "api", status: "done", summary: "接口完成", filesChanged: ["backend/api.ts"], verification: ["npm test"] },
      ],
    },
  };
  const items = buildMainAgentWorkItems(task, { now: "2026-07-07T00:00:00.000Z" });
  const blockedBefore = buildMainAgentWorkItems({
    ...task,
    delivery_summary: { ...task.delivery_summary, receipts: [] },
  }, { now: "2026-07-07T00:00:00.000Z" });
  const web = items.find(item => item.target === "web");
  const claimWeb = claimMainAgentWorkItem(items, web?.id || "web", "web", { checkOwnerBusy: true, now: "2026-07-07T00:01:00.000Z" });
  const unlockSummary = buildMainAgentWorkItemUnlockSummary(blockedBefore, items, { completedAgent: "api" });
  const busyItems = [
    normalizeWorkItem({ id: "wi-busy", subject: "处理登录接口", owner: "web", target: "web", status: "in_progress" }, { taskId: "task-work-items", scopeId: "group-1", index: 1, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    normalizeWorkItem({ id: "wi-next", subject: "接入筛选页面", owner: "web", target: "web-next", status: "pending" }, { taskId: "task-work-items", scopeId: "group-1", index: 2, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
  ];
  const busyClaim = claimMainAgentWorkItem(busyItems, "wi-next", "web", { checkOwnerBusy: true });
  const blockedClaim = claimMainAgentWorkItem(blockedBefore, blockedBefore.find(item => item.target === "web")?.id || "web", "web", { checkOwnerBusy: true });
  const alreadyClaimed = claimMainAgentWorkItem(claimWeb.items, claimWeb.item?.id || "web", "other-web", { checkOwnerBusy: true });
  const alreadyResolved = claimMainAgentWorkItem(items, items.find(item => item.target === "api")?.id || "api", "api", { checkOwnerBusy: true });
  const missingClaim = claimMainAgentWorkItem(items, "missing-item", "web", { checkOwnerBusy: true });
  const claimedSummary = buildMainAgentWorkItemClaimSummary(claimWeb, "web", web?.id || "web");
  const blockedSummary = buildMainAgentWorkItemClaimSummary(blockedClaim, "web", "web");
  const busySummary = buildMainAgentWorkItemClaimSummary(busyClaim, "web", "wi-next");
  const claimedElsewhereSummary = buildMainAgentWorkItemClaimSummary(alreadyClaimed, "other-web", claimWeb.item?.id || "web");
  const resolvedSummary = buildMainAgentWorkItemClaimSummary(alreadyResolved, "api", "api");
  const missingSummary = buildMainAgentWorkItemClaimSummary(missingClaim, "web", "missing-item");
  const stale = requeueStaleMainAgentWorkItems(claimWeb.items, { nowMs: Date.parse("2026-07-07T01:00:00.000Z"), staleMs: 1000, reason: "selftest stale" });
  const summary = buildMainAgentWorkItemSummary(items);
  const missingVerificationSummary = buildMainAgentWorkItemSummary([
    normalizeWorkItem({ id: "wi-1", subject: "实现接口", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 1, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    normalizeWorkItem({ id: "wi-2", subject: "接入页面", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 2, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    normalizeWorkItem({ id: "wi-3", subject: "整理说明", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 3, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
  ]);
  const verifiedSummary = buildMainAgentWorkItemSummary([
    normalizeWorkItem({ id: "wi-1", subject: "实现接口", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 1, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    normalizeWorkItem({ id: "wi-2", subject: "接入页面", status: "completed" }, { taskId: "task-work-items", scopeId: "group-1", index: 2, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
    normalizeWorkItem({ id: "wi-3", subject: "运行验证", status: "completed", verification: ["npm test passed"] }, { taskId: "task-work-items", scopeId: "group-1", index: 3, now: "2026-07-07T00:00:00.000Z", source: "selftest" }),
  ]);
  const rehearsalItems = buildMainAgentWorkItems({
    id: "task-rehearsal-plan",
    group_id: "group-1",
    workflow_type: "daily_dev",
    target_project: "coordinator",
    work_items: [{ source: "task_target", target: "coordinator", owner: "coordinator", subject: "placeholder" }],
    workflow_meta: {
      sandbox_rehearsal: {
        agent_plan: [{ project: "runtime-project", task: "修改功能并运行验证", reason: "项目 Agent 负责实现" }],
      },
    },
  }, { now: "2026-07-07T00:00:00.000Z" });
  const visibleSummaryText = JSON.stringify({
    unlockSummary,
    claimedSummary,
    blockedSummary,
    busySummary,
    claimedElsewhereSummary,
    resolvedSummary,
    missingSummary,
    dependencySummary: summary.dependency_summary,
    verificationReminder: missingVerificationSummary.verification_reminder,
  });
  const checks = {
    derivesAssignments: items.length === 2,
    rehearsalPlanTargetsExecutingProject: rehearsalItems.length === 1
      && rehearsalItems[0].target === "runtime-project"
      && rehearsalItems[0].owner === "runtime-project"
      && rehearsalItems[0].source === "sandbox_rehearsal_plan",
    receiptCompletesDependency: items.find(item => item.target === "api")?.status === "completed",
    blocksBeforeDependencyDone: blockedBefore.find(item => item.target === "web")?.status === "blocked",
    claimAfterDependencyDone: claimWeb.ok && claimWeb.item?.status === "in_progress",
    unlockSummaryFriendly: unlockSummary?.schema === "ccm-main-agent-work-item-unlock-summary-v1" && unlockSummary.headline.includes("后续工作项已经解锁") && unlockSummary.next_claimable.some(item => item.target === "web"),
    ownerBusyGuard: busyClaim.reason === "agent_busy" && busyClaim.item?.id === "wi-next" && busyClaim.busy?.id === "wi-busy",
    claimSummaryFriendlySuccess: claimedSummary.status === "claimed" && claimedSummary.headline.includes("已接下") && claimedSummary.technical.reason_code === "",
    claimSummaryFriendlyBlocked: blockedSummary.status === "blocked" && blockedSummary.headline.includes("等待 api 完成") && !blockedSummary.headline.includes("blocked"),
    claimSummaryFriendlyBusy: busySummary.status === "agent_busy" && busySummary.headline.includes("正在处理") && busySummary.headline.includes("会继续等待"),
    claimSummaryFriendlyAlreadyClaimed: claimedElsewhereSummary.status === "already_claimed" && claimedElsewhereSummary.headline.includes("不会重复派发"),
    claimSummaryFriendlyAlreadyResolved: resolvedSummary.status === "already_resolved" && resolvedSummary.headline.includes("不需要再次派发"),
    claimSummaryFriendlyNotFound: missingSummary.status === "task_not_found" && missingSummary.headline.includes("刷新执行队列"),
    claimSummaryKeepsRawReasonTechnical: busySummary.technical.reason_code === "agent_busy" && !busySummary.headline.includes("agent_busy"),
    staleRequeues: stale.requeued.length === 1 && stale.requeued[0].status === "pending",
    summaryCounts: summary.total === 2 && summary.counts.completed === 1,
    dependencySummaryExplainsUnlockedWork: summary.dependency_summary?.schema === "ccm-main-agent-work-item-dependency-summary-v1"
      && summary.dependency_summary?.headline.includes("已经解锁")
      && summary.dependency_summary?.rows?.some((row: any) => row.label.includes("前置依赖已完成")),
    workItemVerificationReminderWhenAllDoneWithoutVerification: missingVerificationSummary.verification_reminder?.schema === "ccm-main-agent-work-item-verification-reminder-v1",
    workItemVerificationReminderSkippedWhenVerificationExists: verifiedSummary.verification_reminder === null && verifiedSummary.verification_nudge === false,
    workItemVisibleTextUsesFriendlyRoles: !/主\s*Agent|子\s*Agent|下游\s*Agent/.test(visibleSummaryText),
  };
  return { pass: Object.values(checks).every(Boolean), checks, items, blockedBefore, claimWeb: { ok: claimWeb.ok, reason: claimWeb.reason }, stale: stale.requeued };
}

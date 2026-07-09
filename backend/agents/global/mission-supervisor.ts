import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";

export type GlobalMissionSupervisorStatus = "monitoring" | "paused" | "waiting_user" | "completed" | "failed" | "cancelled" | "manual_takeover";

export interface GlobalMissionSupervisorRecord {
  version: 1;
  id: string;
  mission_id: string;
  global_run_id: string;
  trace_id: string;
  session_id: string;
  source: string;
  business_goal: string;
  acceptance: string;
  status: GlobalMissionSupervisorStatus;
  phase: string;
  cycle_count: number;
  max_attempts: number;
  poll_interval_ms: number;
  next_check_at: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  last_checked_at?: string;
  last_progress_at?: string;
  last_snapshot?: any;
  actions: any[];
  incidents: any[];
  last_continuation?: any;
  final_report?: any;
  final_notification_sent_at?: string;
  error?: string;
}

export interface GlobalMissionSupervisorRuntime {
  inspectMission: (missionId: string) => Promise<any> | any;
  advanceMission: (missionId: string, options: any) => Promise<any> | any;
  controlMission: (missionId: string, operation: string, payload: any) => Promise<any> | any;
  onCompleted?: (record: GlobalMissionSupervisorRecord, report: any) => Promise<void> | void;
  onProgress?: (record: GlobalMissionSupervisorRecord, event: any) => Promise<void> | void;
  onTerminal?: (record: GlobalMissionSupervisorRecord, outcome: "failed" | "cancelled", report: any) => Promise<void> | void;
  now?: () => number;
}

const STORE_FILE = path.join(CCM_DIR, "global-mission-supervisors.json");
const STORE_BACKUP = `${STORE_FILE}.bak`;
const MAX_RECORDS = 200;
const activeChecks = new Set<string>();
let scheduler: NodeJS.Timeout | null = null;
let schedulerRuntime: GlobalMissionSupervisorRuntime | null = null;

function nowIso(runtime?: GlobalMissionSupervisorRuntime) {
  return new Date(runtime?.now ? runtime.now() : Date.now()).toISOString();
}

function atomicWrite(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, STORE_BACKUP); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function normalizeRecord(value: any): GlobalMissionSupervisorRecord {
  const created = value?.created_at || new Date().toISOString();
  const status = ["monitoring", "paused", "waiting_user", "completed", "failed", "cancelled", "manual_takeover"].includes(value?.status)
    ? value.status
    : "failed";
  return {
    version: 1,
    id: String(value?.id || ""),
    mission_id: String(value?.mission_id || ""),
    global_run_id: String(value?.global_run_id || ""),
    trace_id: ensureTraceId(value?.trace_id, "mission-supervisor"),
    session_id: String(value?.session_id || "default"),
    source: String(value?.source || "global-agent"),
    business_goal: String(value?.business_goal || ""),
    acceptance: String(value?.acceptance || ""),
    status,
    phase: String(value?.phase || "supervising"),
    cycle_count: Number(value?.cycle_count || 0),
    max_attempts: Math.max(1, Math.min(20, Number(value?.max_attempts || 3))),
    poll_interval_ms: Math.max(2_000, Math.min(5 * 60_000, Number(value?.poll_interval_ms || 10_000))),
    next_check_at: value?.next_check_at || created,
    created_at: created,
    updated_at: value?.updated_at || created,
    completed_at: value?.completed_at,
    last_checked_at: value?.last_checked_at,
    last_progress_at: value?.last_progress_at || created,
    last_snapshot: value?.last_snapshot || null,
    actions: Array.isArray(value?.actions) ? value.actions.slice(-100) : [],
    incidents: Array.isArray(value?.incidents) ? value.incidents.slice(-100) : [],
    last_continuation: value?.last_continuation || null,
    final_report: value?.final_report || null,
    final_notification_sent_at: value?.final_notification_sent_at,
    error: String(value?.error || ""),
  };
}

function loadStore(): GlobalMissionSupervisorRecord[] {
  for (const file of [STORE_FILE, STORE_BACKUP]) {
    try {
      if (!fs.existsSync(file)) continue;
      const value = JSON.parse(fs.readFileSync(file, "utf-8"));
      return (Array.isArray(value?.records) ? value.records : []).map(normalizeRecord);
    } catch {}
  }
  return [];
}

function saveRecord(record: GlobalMissionSupervisorRecord) {
  const records = loadStore();
  const index = records.findIndex(item => item.id === record.id);
  if (index >= 0) records[index] = normalizeRecord(record);
  else records.push(normalizeRecord(record));
  records.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  atomicWrite(STORE_FILE, { version: 1, records: records.slice(0, MAX_RECORDS) });
  return record;
}

function stringList(values: any[]) {
  return [...new Set((values || []).map(value => typeof value === "string" ? value : value?.path || value?.file || value?.command || value?.name || JSON.stringify(value)).filter(Boolean))];
}

function globalMissionSummaryRows(mission: any) {
  return Array.isArray(mission?.mission_summary?.children) ? mission.mission_summary.children : [];
}

function globalMissionReportChildGatePassed(row: any) {
  return row?.gate_passed === true
    && row?.strong_acceptance_passed !== false
    && row?.acceptance_evidence_status !== "weak"
    && row?.acceptance_evidence_status !== "missing";
}

function globalMissionReportAllChildrenGatePassed(mission: any, children: any[]) {
  const rows = globalMissionSummaryRows(mission);
  if (!children.length || mission?.mission_summary?.all_passed !== true || !mission?.delivery_summary?.acceptance_gate_passed) return false;
  return children.every((child: any) => {
    const row = rows.find((item: any) => item.task_id === child.id);
    return globalMissionReportChildGatePassed(row);
  });
}

export function buildGlobalMissionFinalReport(snapshot: any) {
  const mission = snapshot?.mission || {};
  const children = Array.isArray(snapshot?.children) ? snapshot.children : [];
  const modifiedFiles = stringList(children.flatMap((child: any) => child.delivery_summary?.actual_file_changes || child.receipt?.filesChanged || child.file_changes?.files || []));
  const verification = stringList(children.flatMap((child: any) => child.delivery_summary?.verification_executed || child.receipt?.verification || []));
  const failedVerification = stringList(children.flatMap((child: any) => child.delivery_summary?.verification_failed || []));
  const blockers = stringList(children.flatMap((child: any) => [...(child.delivery_summary?.blockers || []), ...(child.delivery_summary?.needs || [])]));
  const missionRows = globalMissionSummaryRows(mission);
  const mergeCommits = stringList(missionRows.flatMap((child: any) => child.merge_commits || []));
  const rejectedTargets = stringList((mission.mission_plan?.rejected || []).map((item: any) => item.reason || item.target?.name || item.target?.project || item.target?.group_id));
  const allPassed = globalMissionReportAllChildrenGatePassed(mission, children);
  const risks = stringList([...failedVerification, ...blockers, ...rejectedTargets]);
  return {
    status: allPassed ? "completed" : "incomplete",
    completed: allPassed,
    summary: allPassed
      ? `已完成：${mission.business_goal || mission.title || "全局开发任务"}`
      : `尚未完成：${mission.business_goal || mission.title || "全局开发任务"}`,
    completed_content: children.map((child: any) => ({
      task_id: child.id,
      target: child.mission_target?.name || child.target_project || child.group_id || "",
      summary: child.delivery_summary?.headline || child.receipt?.summary || child.status_detail || child.result || "",
      gate_passed: globalMissionReportChildGatePassed(missionRows.find((row: any) => row.task_id === child.id)),
    })),
    files_modified: modifiedFiles,
    verification_results: verification,
    merge_commits: mergeCommits,
    risks,
    remaining_items: allPassed ? [] : stringList([
      ...blockers,
      ...children.filter((child: any) => {
        const row = missionRows.find((item: any) => item.task_id === child.id);
        return child.status !== "done" || !globalMissionReportChildGatePassed(row);
      }).map((child: any) => {
        const row = missionRows.find((item: any) => item.task_id === child.id);
        const target = child.mission_target?.name || child.target_project || child.group_id || child.id;
        if (child.status === "done" && !globalMissionReportChildGatePassed(row)) {
          return `${target}: 等待真实验证或复核证据`;
        }
        return `${target}: ${child.status_detail || child.status}`;
      }),
    ]),
    acceptance_gate_passed: allPassed,
    generated_at: new Date().toISOString(),
  };
}

export function formatGlobalMissionFinalReport(report: any) {
  const lines = [report.summary || "全局任务交付报告"];
  lines.push(`\n修改文件：${report.files_modified?.length ? `\n- ${report.files_modified.join("\n- ")}` : "无"}`);
  lines.push(`\n验证结果：${report.verification_results?.length ? `\n- ${report.verification_results.join("\n- ")}` : "无已执行验证证据"}`);
  lines.push(`\n合并结果：${report.merge_commits?.length ? `\n- ${report.merge_commits.join("\n- ")}` : "无需独立 worktree 合并"}`);
  lines.push(`\n风险：${report.risks?.length ? `\n- ${report.risks.join("\n- ")}` : "未发现已知风险"}`);
  lines.push(`\n遗留项：${report.remaining_items?.length ? `\n- ${report.remaining_items.join("\n- ")}` : "无"}`);
  return lines.join("\n");
}

export function getGlobalMissionSupervisor(id: string) {
  return loadStore().find(item => item.id === id || item.mission_id === id) || null;
}

export function listGlobalMissionSupervisors(options: { status?: string; limit?: number } = {}) {
  return loadStore()
    .filter(item => !options.status || item.status === options.status)
    .slice(0, Math.max(1, Math.min(200, Number(options.limit || 50))));
}

export function startGlobalMissionSupervisor(input: any) {
  const existing = loadStore().find(item => item.mission_id === String(input.mission_id || input.missionId || "") && !["failed", "cancelled"].includes(item.status));
  if (existing) return existing;
  const created = new Date().toISOString();
  const record = normalizeRecord({
    id: `gms_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    mission_id: input.mission_id || input.missionId,
    global_run_id: input.global_run_id || input.globalRunId || "",
    trace_id: input.trace_id || input.traceId,
    session_id: input.session_id || input.sessionId || "default",
    source: input.source || "global-agent",
    business_goal: input.business_goal || input.businessGoal || "",
    acceptance: input.acceptance || input.acceptance_criteria || "",
    status: "monitoring",
    phase: "supervising",
    cycle_count: 0,
    max_attempts: input.max_attempts || input.maxAttempts || 3,
    poll_interval_ms: input.poll_interval_ms || input.pollIntervalMs || 10_000,
    next_check_at: created,
    created_at: created,
    updated_at: created,
    actions: [],
    incidents: [],
  });
  saveRecord(record);
  appendTraceEvent(record.trace_id, { id: `${record.id}:started`, type: "mission.supervisor_started", status: "ok", task_id: record.mission_id, message: "全局任务持续跟进已启动", data: { supervisor_id: record.id, global_run_id: record.global_run_id } });
  if (schedulerRuntime && input.defer_check !== true && input.deferCheck !== true) void checkGlobalMissionSupervisorNow(record.id, schedulerRuntime);
  return record;
}

export async function checkGlobalMissionSupervisorNow(id: string, runtime: GlobalMissionSupervisorRuntime) {
  const record = getGlobalMissionSupervisor(id);
  if (!record) throw new Error("全局任务跟进记录不存在");
  if (!["monitoring", "waiting_user"].includes(record.status) || activeChecks.has(record.id)) return record;
  activeChecks.add(record.id);
  try {
    const checkedAt = nowIso(runtime);
    const previousStatus = record.status;
    const before = await runtime.inspectMission(record.mission_id);
    if (!before?.mission) throw new Error("全局任务不存在或已被删除");
    if (before.mission.status === "cancelled") {
      record.status = "cancelled";
      record.phase = "cancelled";
      record.updated_at = checkedAt;
      record.completed_at = checkedAt;
      saveRecord(record);
      if (!record.final_notification_sent_at) {
        await runtime.onTerminal?.(record, "cancelled", { summary: "全局任务已取消。", remaining_items: [], risks: [] });
        record.final_notification_sent_at = nowIso(runtime);
        saveRecord(record);
      }
      return record;
    }
    const result = await runtime.advanceMission(record.mission_id, { max_attempts: record.max_attempts, source: "global-mission-supervisor" });
    const snapshot = result?.mission ? { mission: result.mission, children: result.children || [] } : await runtime.inspectMission(record.mission_id);
    const report = buildGlobalMissionFinalReport(snapshot);
    const actions = Array.isArray(result?.actions) ? result.actions : [];
    record.cycle_count += 1;
    record.last_checked_at = checkedAt;
    record.updated_at = checkedAt;
    record.next_check_at = new Date(Date.parse(checkedAt) + record.poll_interval_ms).toISOString();
    record.last_snapshot = {
      mission_status: snapshot?.mission?.status || "",
      mission_summary: snapshot?.mission?.mission_summary || {},
      child_states: (snapshot?.children || []).map((child: any) => {
        const missionRow = (snapshot?.mission?.mission_summary?.children || []).find((row: any) => row.task_id === child.id) || {};
        return {
          id: child.id,
          target_type: child.mission_target?.type || child.assign_type || "",
          target: child.mission_target?.name || child.target_project || child.group_id || "",
          status: missionRow.display_status || (child.status === "done" && !globalMissionReportChildGatePassed(missionRow) ? "reviewing" : child.status),
          status_detail: child.status_detail || "",
          dependencies: child.mission_dependencies || child.mission_target?.depends_on || [],
          receipt_status: child.receipt?.status || missionRow.receipt_status || "",
          gate_passed: globalMissionReportChildGatePassed(missionRow),
          acceptance_evidence_status: missionRow.acceptance_evidence_status || "",
          actual_file_change_count: Number(missionRow.actual_file_change_count || child.delivery_summary?.actual_file_change_count || 0),
          verification_count: Number(missionRow.verification_count || child.delivery_summary?.verification_executed?.length || 0),
          verification_failed: child.delivery_summary?.verification_failed || [],
          merge_required: missionRow.merge_required === true,
          merge_passed: missionRow.merge_passed !== false,
          merge_commits: missionRow.merge_commits || [],
          blockers: missionRow.blockers || [],
          retry_count: child.retry_count || 0,
          gap_rework_count: child.auto_gap_continue_count || 0,
        };
      }),
    };
    if (actions.length > 0) {
      record.last_progress_at = checkedAt;
      record.actions = [...record.actions, ...actions.map((action: any) => ({ at: checkedAt, ...action }))].slice(-100);
      await runtime.onProgress?.(record, { type: "actions", actions });
    }
    if (report.completed) {
      record.status = "completed";
      record.phase = "delivered";
      record.completed_at = checkedAt;
      record.final_report = report;
      saveRecord(record);
      appendTraceEvent(record.trace_id, { id: `${record.id}:completed`, type: "mission.supervisor_completed", status: "ok", task_id: record.mission_id, message: report.summary, data: report });
      if (!record.final_notification_sent_at) {
        await runtime.onCompleted?.(record, report);
        record.final_notification_sent_at = nowIso(runtime);
        saveRecord(record);
      }
      return record;
    }
    const waiting = Array.isArray(result?.waiting_user) ? result.waiting_user : [];
    record.status = waiting.length > 0 ? "waiting_user" : "monitoring";
    record.phase = waiting.length > 0 ? "needs_user" : actions.length > 0 ? "recovering" : "supervising";
    if (waiting.length > 0) {
      record.incidents = [...record.incidents, ...waiting.map((item: any) => ({ at: checkedAt, type: "waiting_user", ...item }))].slice(-100);
      if (previousStatus !== "waiting_user") await runtime.onProgress?.(record, { type: "waiting_user", items: waiting });
    }
    return saveRecord(record);
  } catch (error: any) {
    const failedAt = nowIso(runtime);
    record.error = error?.message || String(error);
    record.updated_at = failedAt;
    record.next_check_at = new Date(Date.parse(failedAt) + record.poll_interval_ms).toISOString();
    record.incidents = [...record.incidents, { at: failedAt, type: "supervisor_error", error: record.error }].slice(-100);
    saveRecord(record);
    appendTraceEvent(record.trace_id, { id: `${record.id}:error:${record.cycle_count}`, type: "mission.supervisor_error", status: "error", task_id: record.mission_id, message: record.error });
    return record;
  } finally {
    activeChecks.delete(record.id);
  }
}

export async function controlGlobalMissionSupervisor(id: string, operation: string, runtime: GlobalMissionSupervisorRuntime, payload: any = {}) {
  const record = getGlobalMissionSupervisor(id);
  if (!record) throw new Error("全局任务跟进记录不存在");
  const op = String(operation || "").toLowerCase();
  const now = nowIso(runtime);
  if (op === "check_now") return checkGlobalMissionSupervisorNow(record.id, runtime);
  if (op === "archive") {
    if (["monitoring", "waiting_user"].includes(record.status)) throw new Error("运行中的持续跟进不能直接归档，请先暂停、取消或人工接管");
    atomicWrite(STORE_FILE, { version: 1, records: loadStore().filter(item => item.id !== record.id) });
    appendTraceEvent(record.trace_id, { id: `${record.id}:archived:${now}`, type: "mission.supervisor_archived", status: "info", task_id: record.mission_id, message: "全局任务跟进记录已归档" });
    return { ...record, archived: true, archived_at: now } as any;
  }
  if (!["pause", "resume", "cancel", "takeover", "update_goal"].includes(op)) throw new Error(`不支持的持续跟进操作：${operation}`);
  if (["completed", "failed", "cancelled"].includes(record.status)) throw new Error("持续跟进已进入终态，不能再修改；请创建新的全局任务");
  await runtime.controlMission(record.mission_id, op, payload);
  if (op === "pause") { record.status = "paused"; record.phase = "paused"; }
  if (op === "resume") { record.status = "monitoring"; record.phase = "supervising"; record.next_check_at = now; }
  if (op === "cancel") { record.status = "cancelled"; record.phase = "cancelled"; record.completed_at = now; }
  if (op === "takeover") { record.status = "manual_takeover"; record.phase = "manual"; }
  if (op === "update_goal") {
    record.business_goal = String(payload.business_goal || payload.businessGoal || payload.goal || record.business_goal);
    record.acceptance = String(payload.acceptance || payload.acceptance_criteria || record.acceptance);
    if (payload.continuation && typeof payload.continuation === "object") {
      record.last_continuation = {
        source: payload.continuation.source || "mission_supervisor_goal_update",
        at: now,
        automatic: false,
        kind: "revise_goal",
        status: "accepted",
        rework_kind: payload.continuation.rework_kind || payload.continuation.reworkKind || "",
        target: payload.continuation.target || payload.continuation.agent || payload.continuation.project || "",
        reason: payload.continuation.reason || payload.continuation.detail || "",
        title: payload.continuation.title || payload.continuation.label || "",
        work_item_id: payload.continuation.work_item_id || payload.continuation.workItemId || "",
      };
    }
    if (["waiting_user", "paused"].includes(record.status)) record.status = "monitoring";
    record.phase = "supervising";
    record.next_check_at = now;
  }
  record.updated_at = now;
  record.actions = [...record.actions, { at: now, type: `user_${op}`, payload: { reason: payload.reason || "", goal_changed: op === "update_goal" } }].slice(-100);
  saveRecord(record);
  appendTraceEvent(record.trace_id, { id: `${record.id}:control:${op}:${now}`, type: `mission.supervisor_${op}`, status: op === "cancel" ? "warning" : "info", task_id: record.mission_id, message: `用户调整持续跟进：${op}` });
  if (record.status === "monitoring") void checkGlobalMissionSupervisorNow(record.id, runtime);
  return record;
}

export function startGlobalMissionSupervisorScheduler(runtime: GlobalMissionSupervisorRuntime, intervalMs = 2_000) {
  schedulerRuntime = runtime;
  if (scheduler) return { started: false, active: true };
  const tick = () => {
    const now = runtime.now ? runtime.now() : Date.now();
    for (const record of loadStore()) {
      if (record.source === "self-test") continue;
      if (!["monitoring", "waiting_user"].includes(record.status)) continue;
      if (Date.parse(record.next_check_at || record.updated_at) > now) continue;
      void checkGlobalMissionSupervisorNow(record.id, runtime);
    }
  };
  scheduler = setInterval(tick, Math.max(1_000, intervalMs));
  scheduler.unref?.();
  tick();
  return { started: true, active: true, resumed: loadStore().filter(item => ["monitoring", "waiting_user"].includes(item.status)).length };
}

export function stopGlobalMissionSupervisorScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
  schedulerRuntime = null;
}

export function getGlobalMissionSupervisorSchedulerStatus() {
  const records = loadStore();
  return {
    active: !!scheduler,
    monitoring: records.filter(item => item.status === "monitoring").length,
    waiting_user: records.filter(item => item.status === "waiting_user").length,
    paused: records.filter(item => item.status === "paused").length,
    active_checks: [...activeChecks],
  };
}

export function runGlobalMissionSupervisorSelfTest() {
  const report = buildGlobalMissionFinalReport({
    mission: {
      business_goal: "测试异步交付",
      delivery_summary: { acceptance_gate_passed: true },
      mission_summary: { all_passed: true, children: [{ task_id: "child-1", gate_passed: true, merge_commits: ["abc123"] }] },
      mission_plan: { rejected: [] },
    },
    children: [{ id: "child-1", status: "done", target_project: "demo", receipt: { summary: "完成", filesChanged: ["src/a.ts"], verification: ["npm test"] }, delivery_summary: { headline: "完成", actual_file_changes: ["src/a.ts"], verification_executed: ["npm test"], blockers: [], needs: [] } }],
  });
  const weakReport = buildGlobalMissionFinalReport({
    mission: {
      business_goal: "弱验收测试",
      delivery_summary: { acceptance_gate_passed: true },
      mission_summary: { all_passed: true, children: [{ task_id: "weak-child", gate_passed: true, acceptance_evidence_status: "weak" }] },
      mission_plan: { rejected: [] },
    },
    children: [{ id: "weak-child", status: "done", target_project: "demo", delivery_summary: { headline: "仅有验收结论", acceptance: ["验收结论：已通过"], blockers: [], needs: [] } }],
  });
  const checks = {
    completedOnlyWithGate: report.completed === true,
    fixedFilesSection: report.files_modified.includes("src/a.ts"),
    fixedVerificationSection: report.verification_results.includes("npm test"),
    mergeTracked: report.merge_commits.includes("abc123"),
    noFalseCompletion: buildGlobalMissionFinalReport({ mission: { business_goal: "x", delivery_summary: { acceptance_gate_passed: false } }, children: [] }).completed === false,
    globalMissionSupervisorWeakChildNotCompleted: weakReport.completed === false && weakReport.remaining_items.some((item: string) => /真实验证|复核证据/.test(item)),
  };
  return { pass: Object.values(checks).every(Boolean), checks, report };
}

export async function runGlobalMissionSupervisorAsyncSelfTest() {
  const missionId = `selftest_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
  let phase: "failed" | "recovering" | "done" = "failed";
  const controlCalls: string[] = [];
  const completedReports: any[] = [];
  const snapshot = () => phase === "done"
    ? {
        mission: {
          id: missionId,
          status: "done",
          business_goal: "持续跟进 E2E",
          delivery_summary: { acceptance_gate_passed: true },
          mission_summary: { all_passed: true, children: [{ task_id: "child", gate_passed: true, merge_commits: ["e2e-commit"] }] },
          mission_plan: { rejected: [] },
        },
        children: [{ id: "child", status: "done", target_project: "sandbox", receipt: { status: "done", summary: "恢复后完成", filesChanged: ["src/e2e.ts"], verification: ["npm test"] }, delivery_summary: { headline: "恢复后完成", actual_file_changes: ["src/e2e.ts"], verification_executed: ["npm test"], verification_failed: [], blockers: [], needs: [] } }],
      }
    : {
        mission: { id: missionId, status: "in_progress", business_goal: "持续跟进 E2E", delivery_summary: { acceptance_gate_passed: false }, mission_summary: { all_passed: false, children: [{ task_id: "child", gate_passed: false }] }, mission_plan: { rejected: [] } },
        children: [{ id: "child", status: phase === "failed" ? "failed" : "pending", target_project: "sandbox", status_detail: phase === "failed" ? "执行器异常" : "恢复排队" }],
      };
  const runtime: GlobalMissionSupervisorRuntime = {
    inspectMission: () => snapshot(),
    advanceMission: () => {
      if (phase === "failed") {
        phase = "recovering";
        const value = snapshot();
        return { success: true, ...value, terminal: false, waiting_user: [], actions: [{ type: "runtime_recovery", task_id: "child" }] };
      }
      const value = snapshot();
      return { success: true, ...value, terminal: phase === "done", waiting_user: [], actions: [] };
    },
    controlMission: (_id, operation) => { controlCalls.push(operation); return { success: true }; },
    onCompleted: (_record, report) => { completedReports.push(report); },
  };
  const record = startGlobalMissionSupervisor({ mission_id: missionId, trace_id: `trace_${missionId}`, business_goal: "持续跟进 E2E", source: "self-test", poll_interval_ms: 2_000, defer_check: true });
  try {
    const recovery = await checkGlobalMissionSupervisorNow(record.id, runtime);
    const reloaded = getGlobalMissionSupervisor(record.id);
    const paused = await controlGlobalMissionSupervisor(record.id, "pause", runtime);
    const resumed = await controlGlobalMissionSupervisor(record.id, "resume", runtime);
    await new Promise(resolve => setTimeout(resolve, 20));
    phase = "done";
    const completed = await checkGlobalMissionSupervisorNow(record.id, runtime);
    const checks = {
      asyncRecoveryActionPersisted: recovery.actions.some((item: any) => item.type === "runtime_recovery"),
      restartReloadKeepsIdentity: reloaded?.id === record.id && reloaded?.mission_id === missionId,
      pauseWorks: paused.status === "paused" && controlCalls.includes("pause"),
      resumeWorks: ["monitoring", "completed"].includes(resumed.status) && controlCalls.includes("resume"),
      finalGateCompletes: completed.status === "completed" && completed.final_report?.acceptance_gate_passed === true,
      fixedFinalReport: completed.final_report?.files_modified?.includes("src/e2e.ts") && completed.final_report?.verification_results?.includes("npm test"),
      completionNotifiedOnce: completedReports.length === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks, supervisor_id: record.id, final_report: completed.final_report };
  } finally {
    const records = loadStore().filter(item => item.id !== record.id);
    atomicWrite(STORE_FILE, { version: 1, records });
  }
}

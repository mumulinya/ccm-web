// 任务回放：需求与交付锚点。
// 回放此前只有"过程"（时间线），缺"要什么"和"最后交了什么"两个锚点，用户看不出业务闭环。
// 本模块只读取任务上已持久化的字段，不参与任何交付判定。
import { iso, safeText, safeTextList } from "./task-replay-shared";

export interface TaskReplayDeliveryView {
  task_id: string;
  status: string;
  headline: string;
  detail: string;
  // 需求锚点
  business_goal: string;
  acceptance_criteria: string[];
  source_documents: string;
  followups: Array<{ at: string; message: string; source: string }>;
  // 交付锚点
  final_report: string;
  user_report: string;
  review: { agent: string; status: string; content: string; gaps: string[]; follow_ups: string[]; conflicts: string[]; confidence: number } | null;
  // 过程结论
  agents: string[];
  actions: string[];
  rework_count: number;
  rework_rounds: Array<{ project: string; summary: string }>;
  verification: { executed: string[]; required: string[]; missing: string[]; failed: string[] };
  blockers: string[];
  needs: string[];
  recovery: { watchdog_count: number; last_recovered_at: string; auto_gap_continue_count: number; continuation_count: number };
}

const REPORT_MAX = 8000;

function splitCriteria(value: any) {
  const text = safeText(value, 1600);
  if (!text) return [];
  const rows = text.split(/\n+|(?<=。)(?=\S)|；/).map(item => item.trim()).filter(Boolean);
  return (rows.length ? rows : [text]).slice(0, 12);
}

function reviewView(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    const content = safeText(value, REPORT_MAX);
    return content ? { agent: "", status: "", content, gaps: [], follow_ups: [], conflicts: [], confidence: 0 } : null;
  }
  if (typeof value !== "object") return null;
  const content = safeText(value.content || value.summary || value.detail, REPORT_MAX);
  const gaps = safeTextList(value.gaps, 8, 300);
  const followUps = safeTextList(value.followUps || value.follow_ups, 8, 300);
  const conflicts = safeTextList(value.conflicts, 8, 300);
  if (!content && !gaps.length && !followUps.length && !conflicts.length) return null;
  return {
    agent: safeText(value.agent, 80),
    status: safeText(value.status, 40),
    content,
    gaps,
    follow_ups: followUps,
    conflicts,
    confidence: Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : 0,
  };
}

// final_report 与 user_report 经常互相包含，重复展示两大段等于没展示；只在实质不同的时候才留第二份。
function distinctReport(primary: string, secondary: string) {
  if (!secondary || !primary) return secondary;
  const normalize = (value: string) => value.replace(/\s+/g, "");
  const a = normalize(primary);
  const b = normalize(secondary);
  return a.includes(b) || b.includes(a) ? "" : secondary;
}

function reworkRounds(summary: any) {
  return (Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []).slice(0, 10).map((item: any) => ({
    project: safeText(item?.project || item?.agent, 100),
    summary: safeText(item?.task || item?.message || item?.reason, 400),
  })).filter((row: { project: string; summary: string }) => row.project || row.summary);
}

export function buildTaskReplayDeliveryView(task: any): TaskReplayDeliveryView | null {
  if (!task || typeof task !== "object") return null;
  const summary = task.delivery_summary || {};
  const finalReport = safeText(task.final_report || summary.final_report, REPORT_MAX);
  const userReport = distinctReport(finalReport, safeText(summary.user_report, REPORT_MAX));
  const review = reviewView(task.review || summary.review);
  const acceptance = splitCriteria(task.acceptance_criteria || summary.acceptance_criteria);
  const followups = (Array.isArray(task.followups) ? task.followups : []).slice(-10).map((item: any) => ({
    at: iso(item?.time || item?.at),
    message: safeText(item?.message || item?.content, 600),
    source: safeText(item?.source, 60),
  })).filter((row: { message: string }) => row.message);
  const verification = {
    executed: safeTextList(summary.verification_executed, 12, 300),
    required: safeTextList(summary.verification_required, 12, 300),
    missing: safeTextList(summary.verification_required_missing, 12, 300),
    failed: safeTextList(summary.verification_failed, 12, 300),
  };
  const recovery = {
    watchdog_count: Array.isArray(task.watchdog_recoveries) ? task.watchdog_recoveries.length : 0,
    last_recovered_at: iso(task.watchdog_recovered_at || task.recovered_after_agent_probe_at),
    auto_gap_continue_count: Math.max(0, Number(task.auto_gap_continue_count || 0) || 0),
    continuation_count: Math.max(0, Number(summary.continuation_count || 0) || 0),
  };
  const view: TaskReplayDeliveryView = {
    task_id: String(task.id || ""),
    status: String(task.status || summary.status || ""),
    headline: safeText(summary.headline, 600),
    detail: safeText(summary.detail, 1200),
    business_goal: safeText(task.business_goal || summary.business_goal, 1200),
    acceptance_criteria: acceptance,
    source_documents: safeText(task.source_documents, 1600),
    followups,
    final_report: finalReport,
    user_report: userReport,
    review,
    agents: safeTextList(summary.agents, 12, 100),
    actions: safeTextList(summary.actions, 20, 300),
    rework_count: Math.max(0, Number(summary.rework_count || 0) || 0),
    rework_rounds: reworkRounds(summary),
    verification,
    blockers: safeTextList(summary.blockers, 10, 300),
    needs: safeTextList(summary.needs, 10, 300),
    recovery,
  };
  const hasContent = view.headline || view.business_goal || view.final_report || view.user_report || view.review
    || acceptance.length || followups.length || view.actions.length || view.agents.length
    || verification.executed.length || verification.required.length || view.blockers.length || view.needs.length
    || view.rework_count || recovery.watchdog_count;
  return hasContent ? view : null;
}

export function runTaskReplayDeliverySelfTest() {
  const task = {
    id: "task-delivery-1",
    status: "done",
    business_goal: "验证主 Agent 能派发子 Agent 完成可验收文件修改",
    acceptance_criteria: "修改 smoke.md，子 Agent 回执 done。主 Agent 复盘 complete。",
    source_documents: "daily-dev smoke target=cc-connect-test",
    final_report: "任务已完成！子 Agent 成功创建文件并通过 git status 验证。",
    followups: [{ time: "2026-06-17T13:37:40.164Z", message: "请继续推进任务，处理 llm-error 阻塞", source: "watchdog" }],
    watchdog_recoveries: [{ at: "2026-06-17T13:00:00.000Z" }],
    auto_gap_continue_count: 2,
    review: { agent: "coordinator", status: "complete", followUps: [], gaps: ["缺少回归测试"], conflicts: [], content: "协调复盘：闭环已完成。", confidence: 1 },
    delivery_summary: {
      headline: "日常开发任务已完成",
      user_report: "任务已完成！子 Agent 成功创建文件并通过 git status 验证。",
      agents: ["cc-connect-test"],
      actions: ["Read 检查已有文件内容", "Write 写入试运行元信息"],
      rework_count: 1,
      rework_evidence: [{ project: "coordinator", task: "主 Agent 返工工作单：补齐验证证据" }],
      verification_executed: ["git status"],
      verification_required: ["npm test"],
      verification_required_missing: ["npm test"],
      continuation_count: 3,
      blockers: [],
      needs: ["需要确认发布窗口"],
    },
  };
  const view = buildTaskReplayDeliveryView(task);
  const leakProbe = buildTaskReplayDeliveryView({
    id: "task-delivery-2",
    final_report: "改动落在 C:\\Users\\admin\\repo\\a.ts，token=xoxb-123456789012345",
    delivery_summary: {},
  });
  const serialized = JSON.stringify(leakProbe);
  const checks = {
    delivery_view_built: view?.final_report.includes("任务已完成") === true && view.status === "done",
    // final_report 与 user_report 内容一致时不重复展示第二份
    duplicate_report_suppressed: view?.user_report === "",
    acceptance_criteria_split: (view?.acceptance_criteria || []).length === 2,
    review_gaps_kept: view?.review?.gaps[0] === "缺少回归测试" && view.review.status === "complete",
    followups_kept: (view?.followups || []).length === 1 && view!.followups[0].source === "watchdog",
    rework_and_recovery_kept: view?.rework_count === 1 && view.rework_rounds.length === 1 && view.recovery.watchdog_count === 1 && view.recovery.auto_gap_continue_count === 2,
    verification_gap_kept: (view?.verification.missing || [])[0] === "npm test",
    empty_task_has_no_delivery: buildTaskReplayDeliveryView({ id: "x" }) === null,
    delivery_text_redacted: !serialized.includes("C:\\Users") && !serialized.includes("xoxb-123456789012345"),
  };
  return { schema: "ccm-task-replay-delivery-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}

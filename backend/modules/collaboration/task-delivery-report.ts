import { compactMemoryText } from "./memory";

type DeliveryStatus = "done" | "waiting" | "failed";

function splitReportValues(value: any) {
  if (Array.isArray(value)) {
    return value.flatMap(splitReportValues);
  }
  const text = String(value || "").trim();
  if (!text || text === "无" || text === "未提供" || text === "未填写") return [];
  return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}

function uniqueReportStrings(...lists: any[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of splitReportValues(list)) {
      if (seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function formatListForGroupReport(items: any, empty = "无", formatter: (item: any) => string = (item) => String(item || "")) {
  const values = Array.isArray(items) ? items.map(formatter).map((item: any) => String(item || "").trim()).filter(Boolean) : [];
  if (values.length === 0) return empty;
  return values.slice(0, 8).map((item: string) => `- ${item}`).join("\n");
}

function formatDeliveryFileItem(item: any) {
  if (!item || typeof item === "string") return String(item || "").trim();
  const pathText = item.path || item.file || "";
  if (!pathText) return "";
  const agent = item.agent ? `${item.agent} · ` : "";
  const status = item.status ? ` (${item.status})` : "";
  const diff = Number(item.additions || item.deletions || 0) > 0 ? ` +${Number(item.additions || 0)}/-${Number(item.deletions || 0)}` : "";
  return `${agent}${pathText}${status}${diff}`.trim();
}

export function formatDeliveryMissingVerification(item: any) {
  const agent = item?.agent || "未知 Agent";
  const required = Array.isArray(item?.required) ? item.required.join(" / ") : "";
  return `${agent}: ${required || "未提供项目验证命令执行证据"}`;
}

export function formatDeliveryReworkItem(item: any) {
  const project = item?.project ? `${item.project}: ` : "";
  const attempt = item?.attempt ? `第 ${item.attempt} 轮 ` : "";
  const reason = item?.reason ? `（${item.reason}）` : "";
  const taskText = item?.task || "主 Agent 已生成返工工作单";
  return compactMemoryText(`${project}${attempt}${taskText}${reason}`, 320);
}

export function formatDeliveryAssignmentItem(item: any) {
  const project = item?.project || "未知 Agent";
  const status = item?.status ? ` [${item.statusText || item.status}]` : "";
  const dependsOn = item?.dependsOn ? `；依赖 ${item.dependsOn}` : "";
  const continuation = item?.continuationStrategy ? `；续跑 ${item.continuationStrategy}` : "";
  const attempt = item?.attempt ? `；第 ${item.attempt} 轮` : "";
  const reason = item?.reason ? `（${item.reason}）` : "";
  return compactMemoryText(`${project}${status}: ${item?.task || "子 Agent 工作单"}${dependsOn}${continuation}${attempt}${reason}`, 360);
}

function formatReportLines(items: any, formatter: (item: any) => string = (item) => String(item || ""), limit = 10) {
  const values = Array.isArray(items) ? items.map(formatter).map(item => String(item || "").trim()).filter(Boolean) : [];
  if (!values.length) return "- 无";
  return values.slice(0, limit).map(item => `- ${item}`).join("\n");
}

export function buildUserDeliveryReport(task: any, summary: any, status: DeliveryStatus, detail = "") {
  const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
  const risks = uniqueReportStrings([...(summary?.blockers || []), ...(summary?.blocking_needs || []), ...(summary?.advisory_needs || []), ...(summary?.risks || [])]);
  const lines = [
    `# ${task?.title || "任务交付"}`,
    "",
    `状态：${statusText}`,
    `完成内容：${compactMemoryText(summary?.headline || detail || task?.status_detail || "任务已处理", 500)}`,
    "",
    `变更文件：${Number(summary?.actual_file_change_count || 0)} 个`,
    formatReportLines(summary?.actual_file_changes || summary?.files_changed, formatDeliveryFileItem, 12),
    "",
    `验证结果：${Array.isArray(summary?.verification_executed) ? summary.verification_executed.length : 0} 项已执行`,
    formatReportLines(summary?.verification_executed, (item) => item, 12),
    risks.length ? "" : "",
    risks.length ? "风险与待确认：" : "风险与待确认：无",
    risks.length ? formatReportLines(risks, (item) => item, 8) : "",
  ];
  return lines.filter(line => line !== "").join("\n");
}

export function buildTaskGroupReportMessage(task: any, status: DeliveryStatus, detail = "") {
  const summary = task?.delivery_summary || {};
  const title = status === "done"
    ? "任务交付完成"
    : status === "waiting"
      ? "任务需要继续处理"
      : "任务执行失败";
  const statusText = status === "done" ? "已完成" : status === "waiting" ? "等待补充/返工" : "失败";
  const fileChanges = summary.actual_file_changes || summary.files_changed || task?.file_changes?.files || [];
  const verification = summary.verification || task?.receipt?.verification || [];
  const blockers = summary.blockers || task?.receipt?.blockers || [];
  const needs = summary.needs || task?.receipt?.needs || [];

  return [
    `【${title}】`,
    `任务：${task?.title || "未命名任务"}`,
    `状态：${statusText}`,
    summary.headline ? `完成内容：${summary.headline}` : "",
    `变更文件：${Number(summary.actual_file_change_count ?? fileChanges.length ?? 0)} 个`,
    formatListForGroupReport(fileChanges, "无", formatDeliveryFileItem),
    `验证结果：${Array.isArray(verification) ? verification.length : 0} 项`,
    formatListForGroupReport(verification, "无", (item) => typeof item === "string" ? item : (item?.command && item?.result ? `${item.command} — ${item.result}` : item?.command || item?.summary || "")),
    blockers.length || needs.length ? `风险与待确认：\n${formatListForGroupReport([...blockers, ...needs])}` : "风险与待确认：无",
  ].filter(Boolean).join("\n");
}

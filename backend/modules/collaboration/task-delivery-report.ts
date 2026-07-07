import { compactMemoryText } from "./memory";
import { buildMainAgentDeliveryReport, formatDeliveryFileItem as formatUnifiedDeliveryFileItem } from "../../agents/delivery-report";

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
  return formatUnifiedDeliveryFileItem(item);
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
  return buildTaskDeliveryReport(task, summary, status, detail).markdown;
}

export function buildTaskDeliveryReport(task: any, summary: any, status: DeliveryStatus, detail = "") {
  return buildMainAgentDeliveryReport({
    surface: "group",
    status,
    title: task?.title || "任务交付",
    goal: task?.business_goal || task?.description || "",
    detail: compactMemoryText(summary?.headline || detail || task?.status_detail || "任务已处理", 500),
    task,
    summary,
    report: summary,
    executed: true,
  });
}

export function buildTaskGroupReportMessage(task: any, status: DeliveryStatus, detail = "") {
  return buildTaskDeliveryReport(task, task?.delivery_summary || {}, status, detail).user_text;
}

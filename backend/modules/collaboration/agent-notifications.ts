import { compactMemoryText } from "./memory";
import { checkTaskFailure, formatAgentReceiptForReview } from "./agent-receipts";

function escapeTaskNotificationText(value: any) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeTaskNotificationText(value: any) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeTaskNotificationStatus(text: string, receipt: any = null) {
  const receiptStatus = String(receipt?.status || "").trim();
  if (!receipt) return "missing_receipt";
  if (receiptStatus === "done") return "completed";
  if (receiptStatus === "failed" || checkTaskFailure(text)) return "failed";
  if (receiptStatus === "blocked" || receiptStatus === "needs_info") return "blocked";
  if (receiptStatus === "partial") return "partial";
  return "completed";
}

function buildTaskNotification(agent: string, text: string, receipt: any = null) {
  const status = normalizeTaskNotificationStatus(text, receipt);
  const summary = receipt?.summary || (status === "missing_receipt" ? "Worker completed without CCM_AGENT_RECEIPT" : compactMemoryText(text, 240));
  return [
    "<task-notification>",
    `<task-id>${escapeTaskNotificationText(agent)}</task-id>`,
    `<status>${escapeTaskNotificationText(status)}</status>`,
    `<receipt-status>${escapeTaskNotificationText(receipt?.status || "missing")}</receipt-status>`,
    `<summary>${escapeTaskNotificationText(summary)}</summary>`,
    `<result>${escapeTaskNotificationText(compactMemoryText(text, 1800))}</result>`,
    `<usage><duration_ms>0</duration_ms></usage>`,
    "</task-notification>",
  ].join("\n");
}

export function extractTaskNotificationTag(text: string, tag: string) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = String(text || "").match(pattern);
  return match ? unescapeTaskNotificationText(match[1].trim()) : "";
}

export function parseTaskNotificationsFromText(text: string) {
  const raw = String(text || "");
  const blocks = [...raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/gi)];
  return blocks.map((match) => {
    const block = `<task-notification>${match[1]}</task-notification>`;
    return {
      task_id: extractTaskNotificationTag(block, "task-id"),
      status: extractTaskNotificationTag(block, "status"),
      receipt_status: extractTaskNotificationTag(block, "receipt-status"),
      summary: compactMemoryText(extractTaskNotificationTag(block, "summary"), 600),
      result: compactMemoryText(extractTaskNotificationTag(block, "result"), 1000),
    };
  }).filter((item: any) => item.task_id || item.status || item.summary);
}

export function getCollectedOutputAgent(output: string) {
  const notificationAgent = extractTaskNotificationTag(output, "task-id");
  if (notificationAgent) return notificationAgent;
  return (String(output || "").match(/^【([^】]+)】/) || [])[1]?.trim() || "";
}

export function getCollectedOutputReceiptStatus(output: string) {
  const receiptStatus = extractTaskNotificationTag(output, "receipt-status");
  if (receiptStatus) return receiptStatus;
  return (String(output || "").match(/-\s*状态：\s*([a-zA-Z_]+)/) || [])[1]?.trim() || "";
}

export function formatCollectedAgentOutput(agent: string, text: string, receipt: any = null) {
  const body = String(text || "").trim();
  return [
    buildTaskNotification(agent, body, receipt),
    "",
    `【${agent}】`,
    body,
    "",
    formatAgentReceiptForReview(receipt),
  ].join("\n");
}

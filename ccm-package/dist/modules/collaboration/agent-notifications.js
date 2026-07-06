"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTaskNotificationTag = extractTaskNotificationTag;
exports.parseTaskNotificationsFromText = parseTaskNotificationsFromText;
exports.getCollectedOutputAgent = getCollectedOutputAgent;
exports.getCollectedOutputReceiptStatus = getCollectedOutputReceiptStatus;
exports.formatCollectedAgentOutput = formatCollectedAgentOutput;
const memory_1 = require("./memory");
const agent_receipts_1 = require("./agent-receipts");
function escapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
function unescapeTaskNotificationText(value) {
    return String(value || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
function normalizeTaskNotificationStatus(text, receipt = null) {
    const receiptStatus = String(receipt?.status || "").trim();
    if (!receipt)
        return "missing_receipt";
    if (receiptStatus === "done")
        return "completed";
    if (receiptStatus === "failed" || (0, agent_receipts_1.checkTaskFailure)(text))
        return "failed";
    if (receiptStatus === "blocked" || receiptStatus === "needs_info")
        return "blocked";
    if (receiptStatus === "partial")
        return "partial";
    return "completed";
}
function buildTaskNotification(agent, text, receipt = null) {
    const status = normalizeTaskNotificationStatus(text, receipt);
    const summary = receipt?.summary || (status === "missing_receipt" ? "Worker completed without CCM_AGENT_RECEIPT" : (0, memory_1.compactMemoryText)(text, 240));
    return [
        "<task-notification>",
        `<task-id>${escapeTaskNotificationText(agent)}</task-id>`,
        `<status>${escapeTaskNotificationText(status)}</status>`,
        `<receipt-status>${escapeTaskNotificationText(receipt?.status || "missing")}</receipt-status>`,
        `<summary>${escapeTaskNotificationText(summary)}</summary>`,
        `<result>${escapeTaskNotificationText((0, memory_1.compactMemoryText)(text, 1800))}</result>`,
        `<usage><duration_ms>0</duration_ms></usage>`,
        "</task-notification>",
    ].join("\n");
}
function extractTaskNotificationTag(text, tag) {
    const pattern = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = String(text || "").match(pattern);
    return match ? unescapeTaskNotificationText(match[1].trim()) : "";
}
function parseTaskNotificationsFromText(text) {
    const raw = String(text || "");
    const blocks = [...raw.matchAll(/<task-notification>([\s\S]*?)<\/task-notification>/gi)];
    return blocks.map((match) => {
        const block = `<task-notification>${match[1]}</task-notification>`;
        return {
            task_id: extractTaskNotificationTag(block, "task-id"),
            status: extractTaskNotificationTag(block, "status"),
            receipt_status: extractTaskNotificationTag(block, "receipt-status"),
            summary: (0, memory_1.compactMemoryText)(extractTaskNotificationTag(block, "summary"), 600),
            result: (0, memory_1.compactMemoryText)(extractTaskNotificationTag(block, "result"), 1000),
        };
    }).filter((item) => item.task_id || item.status || item.summary);
}
function getCollectedOutputAgent(output) {
    const notificationAgent = extractTaskNotificationTag(output, "task-id");
    if (notificationAgent)
        return notificationAgent;
    return (String(output || "").match(/^【([^】]+)】/) || [])[1]?.trim() || "";
}
function getCollectedOutputReceiptStatus(output) {
    const receiptStatus = extractTaskNotificationTag(output, "receipt-status");
    if (receiptStatus)
        return receiptStatus;
    return (String(output || "").match(/-\s*状态：\s*([a-zA-Z_]+)/) || [])[1]?.trim() || "";
}
function formatCollectedAgentOutput(agent, text, receipt = null) {
    const body = String(text || "").trim();
    return [
        buildTaskNotification(agent, body, receipt),
        "",
        `【${agent}】`,
        body,
        "",
        (0, agent_receipts_1.formatAgentReceiptForReview)(receipt),
    ].join("\n");
}
//# sourceMappingURL=agent-notifications.js.map
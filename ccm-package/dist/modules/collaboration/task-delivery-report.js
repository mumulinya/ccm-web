"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDeliveryMissingVerification = formatDeliveryMissingVerification;
exports.formatDeliveryReworkItem = formatDeliveryReworkItem;
exports.formatDeliveryAssignmentItem = formatDeliveryAssignmentItem;
exports.buildUserDeliveryReport = buildUserDeliveryReport;
exports.buildTaskDeliveryReport = buildTaskDeliveryReport;
exports.buildTaskGroupReportMessage = buildTaskGroupReportMessage;
const memory_1 = require("./memory");
const delivery_report_1 = require("../../agents/delivery-report");
function splitReportValues(value) {
    if (Array.isArray(value)) {
        return value.flatMap(splitReportValues);
    }
    const text = String(value || "").trim();
    if (!text || text === "无" || text === "未提供" || text === "未填写")
        return [];
    return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}
function uniqueReportStrings(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const value of splitReportValues(list)) {
            if (seen.has(value))
                continue;
            seen.add(value);
            result.push(value);
        }
    }
    return result;
}
function formatListForGroupReport(items, empty = "无", formatter = (item) => String(item || "")) {
    const values = Array.isArray(items) ? items.map(formatter).map((item) => String(item || "").trim()).filter(Boolean) : [];
    if (values.length === 0)
        return empty;
    return values.slice(0, 8).map((item) => `- ${item}`).join("\n");
}
function formatDeliveryFileItem(item) {
    return (0, delivery_report_1.formatDeliveryFileItem)(item);
}
function formatDeliveryMissingVerification(item) {
    const agent = item?.agent || "未知 Agent";
    const required = Array.isArray(item?.required) ? item.required.join(" / ") : "";
    return `${agent}: ${required || "未提供项目验证命令执行证据"}`;
}
function formatDeliveryReworkItem(item) {
    const project = item?.project ? `${item.project}: ` : "";
    const attempt = item?.attempt ? `第 ${item.attempt} 轮 ` : "";
    const reason = item?.reason ? `（${item.reason}）` : "";
    const taskText = item?.task || "主 Agent 已生成返工工作单";
    return (0, memory_1.compactMemoryText)(`${project}${attempt}${taskText}${reason}`, 320);
}
function formatDeliveryAssignmentItem(item) {
    const project = item?.project || "未知 Agent";
    const status = item?.status ? ` [${item.statusText || item.status}]` : "";
    const dependsOn = item?.dependsOn ? `；依赖 ${item.dependsOn}` : "";
    const continuation = item?.continuationStrategy ? `；续跑 ${item.continuationStrategy}` : "";
    const attempt = item?.attempt ? `；第 ${item.attempt} 轮` : "";
    const reason = item?.reason ? `（${item.reason}）` : "";
    return (0, memory_1.compactMemoryText)(`${project}${status}: ${item?.task || "子 Agent 工作单"}${dependsOn}${continuation}${attempt}${reason}`, 360);
}
function formatReportLines(items, formatter = (item) => String(item || ""), limit = 10) {
    const values = Array.isArray(items) ? items.map(formatter).map(item => String(item || "").trim()).filter(Boolean) : [];
    if (!values.length)
        return "- 无";
    return values.slice(0, limit).map(item => `- ${item}`).join("\n");
}
function buildUserDeliveryReport(task, summary, status, detail = "") {
    return buildTaskDeliveryReport(task, summary, status, detail).markdown;
}
function buildTaskDeliveryReport(task, summary, status, detail = "") {
    return (0, delivery_report_1.buildMainAgentDeliveryReport)({
        surface: "group",
        status,
        title: task?.title || "任务交付",
        goal: task?.business_goal || task?.description || "",
        detail: (0, memory_1.compactMemoryText)(summary?.headline || detail || task?.status_detail || "任务已处理", 500),
        task,
        summary,
        report: summary,
        executed: true,
    });
}
function buildTaskGroupReportMessage(task, status, detail = "") {
    return buildTaskDeliveryReport(task, task?.delivery_summary || {}, status, detail).user_text;
}
//# sourceMappingURL=task-delivery-report.js.map
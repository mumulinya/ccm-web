"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalAgentRunSupervision = createGlobalAgentRunSupervision;
const global_agent_run_replies_1 = require("./global-agent-run-replies");
const delivery_report_1 = require("../delivery-report");
const global_agent_metrics_1 = require("./global-agent-metrics");
function createGlobalAgentRunSupervision(deps) {
    const { appendTraceEvent, buildGlobalDisplayStreamFromWorkchain, buildGlobalRunWorkchain, getGlobalAgentRun, normalizeRun, recordGlobalAgentRuntimeOutput, saveRun, volatileRuns } = deps;
    function attachGlobalAgentRunSupervision(run, link) {
        run.mission_id = String(link.mission_id || "");
        run.supervisor_id = String(link.supervisor_id || "");
        run.supervision_state = String(link.state || "monitoring");
        run.updated_at = new Date().toISOString();
        saveRun(run, !volatileRuns.has(run.id));
        return run;
    }
    function completeGlobalAgentSupervision(id, report, outcome = "completed") {
        const stored = getGlobalAgentRun(id);
        if (!stored)
            return null;
        const run = normalizeRun(stored);
        const completedAt = new Date().toISOString();
        run.supervision_state = outcome;
        run.status = outcome;
        run.phase = outcome === "completed" ? "complete" : run.phase;
        const deliveryReport = (0, delivery_report_1.buildMainAgentDeliveryReport)({
            surface: "global",
            status: outcome,
            title: run.original_user_message || run.user_message || "全局任务",
            goal: run.original_user_message || run.user_message,
            detail: report?.formatted || report?.summary || "",
            run,
            report: report || {},
            summary: report || {},
            executed: true,
        });
        const finalReport = {
            ...(report || {}),
            summary: deliveryReport.headline,
            formatted: deliveryReport.markdown,
            user_text: deliveryReport.user_text,
            delivery_report: deliveryReport,
        };
        run.final_delivery_report = deliveryReport;
        run.final_report = finalReport;
        const workchain = buildGlobalRunWorkchain(run, outcome, deliveryReport.headline, finalReport);
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
        run.workchain = workchain;
        run.display_stream = buildGlobalDisplayStreamFromWorkchain(workchain);
        const visibleReply = (0, global_agent_run_replies_1.buildGlobalVisibleReplyContent)({
            value: (0, delivery_report_1.formatMainAgentDeliveryReply)(deliveryReport),
            rawSource: report?.formatted || report?.summary || deliveryReport.markdown || "",
            status: outcome,
            max: 8000,
        });
        if (visibleReply.technical_content) {
            (0, global_agent_run_replies_1.attachGlobalReplyTechnicalContent)(deliveryReport, visibleReply.technical_content);
            (0, global_agent_run_replies_1.attachGlobalReplyTechnicalContent)(finalReport, visibleReply.technical_content);
            (0, global_agent_run_replies_1.attachGlobalReplyTechnicalContent)(workchain, visibleReply.technical_content);
            (0, global_agent_run_replies_1.attachGlobalReplyTechnicalContent)(run.display_stream, visibleReply.technical_content);
        }
        if (visibleReply.hidden_visible_protocol) {
            deliveryReport.headline = visibleReply.text;
            deliveryReport.user_text = visibleReply.text;
            deliveryReport.markdown = visibleReply.text;
            finalReport.summary = visibleReply.text;
            finalReport.user_text = visibleReply.text;
            finalReport.formatted = visibleReply.text;
        }
        run.final_reply = visibleReply.text;
        run.error = outcome === "failed" ? String(report?.error || "mission_supervision_failed") : "";
        run.completed_at = completedAt;
        run.updated_at = completedAt;
        saveRun(run, !volatileRuns.has(id));
        appendTraceEvent(run.trace_id, { id: `${run.id}:supervision:${outcome}:${completedAt}`, type: `global_agent.supervision_${outcome}`, status: outcome === "completed" ? "ok" : "warning", task_id: run.mission_id || "", message: run.final_reply.slice(0, 1000), data: report || {} });
        if ((0, global_agent_metrics_1.recordGlobalAgentRunMetric)(run, outcome, { source: run.source || "global-agent-supervision", runtime: "global-agent-supervision" }) && run.metrics_recorded === true) {
            saveRun(run, !volatileRuns.has(id));
        }
        return run;
    }
    function globalSupervisionStateVisibleSummary(state) {
        const value = String(state || "monitoring").trim().toLowerCase();
        if (value === "waiting_user" || value === "needs_user" || value === "blocked") {
            return {
                status: "supervising",
                phase: "needs_confirmation",
                reply: "全局任务暂时等你处理一个阻塞点；这还不是完成结果。我会保留当前上下文，等阻塞解除后继续跟踪执行、验收和最终总结。",
                summary: "全局任务暂时等你处理一个阻塞点。",
                next_action: "请先处理子任务提示里的阻塞点；处理后我会继续监督返工、复核和最终总结。",
                timelineType: "global_agent.supervision_waiting_user",
                timelineStatus: "warning",
            };
        }
        if (/rework|reworking|repair|retry|返工|修复/.test(value)) {
            return {
                status: "supervising",
                phase: "execute",
                reply: "全局任务已进入返工跟踪；这还不是完成结果。我会继续盯住原实现成员修复、重新复核和最终交付总结。",
                summary: "全局任务正在按验收缺口返工。",
                next_action: "等待原实现成员修复缺口，并在修复后重新运行 TestAgent/独立复核。",
                timelineType: "global_agent.supervision_rework",
                timelineStatus: "info",
            };
        }
        if (value === "paused") {
            return {
                status: "paused",
                phase: "execute",
                reply: "全局任务已暂停；当前上下文和执行记录已保留。恢复后我会继续跟踪执行、验收和最终总结。",
                summary: "全局任务已暂停，等待恢复。",
                next_action: "需要继续时点恢复，我会从当前上下文接上。",
                timelineType: "global_agent.supervision_paused",
                timelineStatus: "warning",
            };
        }
        return {
            status: "supervising",
            phase: "execute",
            reply: "全局任务仍在持续跟踪；这还不是完成结果。等执行、验收和复核都通过后，我会给你最终交付总结。",
            summary: "全局任务正在持续跟踪执行和验收。",
            next_action: "继续等待子任务结果、验收和最终总结。",
            timelineType: "global_agent.supervision_monitoring",
            timelineStatus: "info",
        };
    }
    function updateGlobalAgentSupervisionState(id, state) {
        const stored = getGlobalAgentRun(id);
        if (!stored)
            return null;
        const run = normalizeRun(stored);
        run.supervision_state = String(state || run.supervision_state || "monitoring");
        const visible = globalSupervisionStateVisibleSummary(run.supervision_state);
        if (!["completed", "failed", "cancelled"].includes(run.status)) {
            run.status = visible.status;
            run.phase = visible.phase;
        }
        const needsReviewRework = /rework|reworking|repair|retry|返工|修复/.test(run.supervision_state);
        const report = {
            summary: visible.summary,
            next_action: visible.next_action,
            risks: visible.status === "paused" || run.supervision_state === "waiting_user" ? [visible.summary] : [],
            independent_review_required: needsReviewRework,
            independent_review_gate_passed: needsReviewRework ? false : undefined,
            independent_review_gate: needsReviewRework ? {
                required: true,
                status: "failed",
                failed_count: 1,
                failed_evidence: [{
                        reviewer: "TestAgent",
                        verdict: "failed",
                        summary: visible.summary,
                        evidence: [visible.next_action],
                    }],
            } : undefined,
        };
        run.final_reply = visible.reply;
        run.final_report = { ...(run.final_report && typeof run.final_report === "object" ? run.final_report : {}), ...report };
        run.workchain = buildGlobalRunWorkchain(run, run.status, visible.reply, report);
        run.display_stream = buildGlobalDisplayStreamFromWorkchain(run.workchain);
        run.updated_at = new Date().toISOString();
        saveRun(run, !volatileRuns.has(id));
        recordGlobalAgentRuntimeOutput(run, { type: "supervision_state", state: run.supervision_state, status: run.status, reply: run.final_reply });
        appendTraceEvent(run.trace_id, {
            id: `${run.id}:supervision-state:${run.supervision_state}:${run.updated_at}`,
            type: visible.timelineType,
            status: visible.timelineStatus,
            task_id: run.mission_id || "",
            message: run.final_reply,
            data: { state: run.supervision_state, mission_id: run.mission_id, supervisor_id: run.supervisor_id },
        });
        return run;
    }
    return { attachGlobalAgentRunSupervision, completeGlobalAgentSupervision, globalSupervisionStateVisibleSummary, updateGlobalAgentSupervisionState };
}
//# sourceMappingURL=global-agent-run-supervision.js.map
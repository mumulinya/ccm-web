"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ACCEPTANCE_FLOW_CHECKS = exports.ACCEPTANCE_FLOW_BUILDERS = void 0;
exports.buildAcceptanceFlowBrowserChecks = buildAcceptanceFlowBrowserChecks;
const acceptance_click_flows_1 = require("./acceptance-click-flows");
const acceptance_clipboard_flows_1 = require("./acceptance-clipboard-flows");
const acceptance_dialog_flows_1 = require("./acceptance-dialog-flows");
const acceptance_download_flows_1 = require("./acceptance-download-flows");
const acceptance_drag_flows_1 = require("./acceptance-drag-flows");
const acceptance_form_flows_1 = require("./acceptance-form-flows");
const acceptance_history_flows_1 = require("./acceptance-history-flows");
const acceptance_hover_flows_1 = require("./acceptance-hover-flows");
const acceptance_keyboard_flows_1 = require("./acceptance-keyboard-flows");
const acceptance_network_state_flows_1 = require("./acceptance-network-state-flows");
const acceptance_popup_flows_1 = require("./acceptance-popup-flows");
const acceptance_repeated_click_checks_1 = require("./acceptance-repeated-click-checks");
const acceptance_responsive_checks_1 = require("./acceptance-responsive-checks");
const acceptance_scroll_flows_1 = require("./acceptance-scroll-flows");
const acceptance_upload_flows_1 = require("./acceptance-upload-flows");
// 这些构建器按验收标准自门控：标准里没提到的交互返回空数组，
// 因此可以整体接入生产路径而不会给纯后端任务凭空造出 UI 检查。
exports.ACCEPTANCE_FLOW_BUILDERS = [
    // 更具体的交互必须先于通用 click；同一验收标准只保留最具体的流程。
    { kind: "repeated_click", build: acceptance_repeated_click_checks_1.buildAcceptanceRepeatedClickBrowserChecks },
    { kind: "form", build: acceptance_form_flows_1.buildAcceptanceFormFlowBrowserChecks },
    { kind: "upload", build: acceptance_upload_flows_1.buildAcceptanceUploadFlowBrowserChecks },
    { kind: "download", build: acceptance_download_flows_1.buildAcceptanceDownloadFlowBrowserChecks },
    { kind: "dialog", build: acceptance_dialog_flows_1.buildAcceptanceDialogFlowBrowserChecks },
    { kind: "popup", build: acceptance_popup_flows_1.buildAcceptancePopupFlowBrowserChecks },
    { kind: "keyboard", build: acceptance_keyboard_flows_1.buildAcceptanceKeyboardFlowBrowserChecks },
    { kind: "hover", build: acceptance_hover_flows_1.buildAcceptanceHoverFlowBrowserChecks },
    { kind: "scroll", build: acceptance_scroll_flows_1.buildAcceptanceScrollFlowBrowserChecks },
    { kind: "drag", build: acceptance_drag_flows_1.buildAcceptanceDragFlowBrowserChecks },
    { kind: "clipboard", build: acceptance_clipboard_flows_1.buildAcceptanceClipboardFlowBrowserChecks },
    { kind: "history", build: acceptance_history_flows_1.buildAcceptanceHistoryFlowBrowserChecks },
    { kind: "network_state", build: acceptance_network_state_flows_1.buildAcceptanceNetworkStateFlowBrowserChecks },
    { kind: "responsive", build: acceptance_responsive_checks_1.buildAcceptanceResponsiveBrowserChecks },
    { kind: "click", build: acceptance_click_flows_1.buildAcceptanceClickFlowBrowserChecks },
];
exports.MAX_ACCEPTANCE_FLOW_CHECKS = 24;
/**
 * 从验收标准派生的浏览器流程检查。每个构建器只在标准命中对应交互时产出检查，
 * 失败的构建器不会中断其余构建器。
 */
function buildAcceptanceFlowBrowserChecks(project, acceptanceCriteria = []) {
    if (!project.targetUrl || !acceptanceCriteria.length)
        return [];
    const checks = [];
    const coveredCriteria = new Set();
    for (const builder of exports.ACCEPTANCE_FLOW_BUILDERS) {
        if (checks.length >= exports.MAX_ACCEPTANCE_FLOW_CHECKS)
            break;
        let produced = [];
        try {
            produced = builder.build(project, acceptanceCriteria) || [];
        }
        catch {
            produced = [];
        }
        for (const check of produced) {
            if (checks.length >= exports.MAX_ACCEPTANCE_FLOW_CHECKS)
                break;
            const criteria = [
                ...(check.context?.acceptanceCriteria || []),
                ...(check.coversAcceptanceCriteria || check.covers_acceptance_criteria || []),
            ].map(item => String(item || "").trim()).filter(Boolean);
            if (criteria.length && criteria.every(criterion => coveredCriteria.has(criterion)))
                continue;
            checks.push({
                ...check,
                // 派生检查同样要留下截图证据，并标注来源便于回溯。
                screenshot: check.screenshot !== false,
                context: {
                    ...(check.context || {}),
                    source: "acceptance_criteria",
                    generatedBy: check.context?.generatedBy || `acceptance_flow_${builder.kind}`,
                    registryBuilder: builder.kind,
                },
            });
            criteria.forEach(criterion => coveredCriteria.add(criterion));
        }
    }
    return checks;
}
//# sourceMappingURL=acceptance-flow-registry.js.map
import { BrowserCheckSpec, NormalizedTestAgentProjectTarget } from "../types";
import { buildAcceptanceClickFlowBrowserChecks } from "./acceptance-click-flows";
import { buildAcceptanceClipboardFlowBrowserChecks } from "./acceptance-clipboard-flows";
import { buildAcceptanceDialogFlowBrowserChecks } from "./acceptance-dialog-flows";
import { buildAcceptanceDownloadFlowBrowserChecks } from "./acceptance-download-flows";
import { buildAcceptanceDragFlowBrowserChecks } from "./acceptance-drag-flows";
import { buildAcceptanceFormFlowBrowserChecks } from "./acceptance-form-flows";
import { buildAcceptanceHistoryFlowBrowserChecks } from "./acceptance-history-flows";
import { buildAcceptanceHoverFlowBrowserChecks } from "./acceptance-hover-flows";
import { buildAcceptanceKeyboardFlowBrowserChecks } from "./acceptance-keyboard-flows";
import { buildAcceptanceNetworkStateFlowBrowserChecks } from "./acceptance-network-state-flows";
import { buildAcceptancePopupFlowBrowserChecks } from "./acceptance-popup-flows";
import { buildAcceptanceRepeatedClickBrowserChecks } from "./acceptance-repeated-click-checks";
import { buildAcceptanceResponsiveBrowserChecks } from "./acceptance-responsive-checks";
import { buildAcceptanceScrollFlowBrowserChecks } from "./acceptance-scroll-flows";
import { buildAcceptanceUploadFlowBrowserChecks } from "./acceptance-upload-flows";

// 这些构建器按验收标准自门控：标准里没提到的交互返回空数组，
// 因此可以整体接入生产路径而不会给纯后端任务凭空造出 UI 检查。
export const ACCEPTANCE_FLOW_BUILDERS: Array<{
  kind: string;
  build: (project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[]) => BrowserCheckSpec[];
}> = [
  // 更具体的交互必须先于通用 click；同一验收标准只保留最具体的流程。
  { kind: "repeated_click", build: buildAcceptanceRepeatedClickBrowserChecks },
  { kind: "form", build: buildAcceptanceFormFlowBrowserChecks },
  { kind: "upload", build: buildAcceptanceUploadFlowBrowserChecks },
  { kind: "download", build: buildAcceptanceDownloadFlowBrowserChecks },
  { kind: "dialog", build: buildAcceptanceDialogFlowBrowserChecks },
  { kind: "popup", build: buildAcceptancePopupFlowBrowserChecks },
  { kind: "keyboard", build: buildAcceptanceKeyboardFlowBrowserChecks },
  { kind: "hover", build: buildAcceptanceHoverFlowBrowserChecks },
  { kind: "scroll", build: buildAcceptanceScrollFlowBrowserChecks },
  { kind: "drag", build: buildAcceptanceDragFlowBrowserChecks },
  { kind: "clipboard", build: buildAcceptanceClipboardFlowBrowserChecks },
  { kind: "history", build: buildAcceptanceHistoryFlowBrowserChecks },
  { kind: "network_state", build: buildAcceptanceNetworkStateFlowBrowserChecks },
  { kind: "responsive", build: buildAcceptanceResponsiveBrowserChecks },
  { kind: "click", build: buildAcceptanceClickFlowBrowserChecks },
];

export const MAX_ACCEPTANCE_FLOW_CHECKS = 24;

/**
 * 从验收标准派生的浏览器流程检查。每个构建器只在标准命中对应交互时产出检查，
 * 失败的构建器不会中断其余构建器。
 */
export function buildAcceptanceFlowBrowserChecks(
  project: NormalizedTestAgentProjectTarget,
  acceptanceCriteria: string[] = [],
): BrowserCheckSpec[] {
  if (!project.targetUrl || !acceptanceCriteria.length) return [];
  const checks: BrowserCheckSpec[] = [];
  const coveredCriteria = new Set<string>();
  for (const builder of ACCEPTANCE_FLOW_BUILDERS) {
    if (checks.length >= MAX_ACCEPTANCE_FLOW_CHECKS) break;
    let produced: BrowserCheckSpec[] = [];
    try {
      produced = builder.build(project, acceptanceCriteria) || [];
    } catch {
      produced = [];
    }
    for (const check of produced) {
      if (checks.length >= MAX_ACCEPTANCE_FLOW_CHECKS) break;
      const criteria = [
        ...((check.context as any)?.acceptanceCriteria || []),
        ...(check.coversAcceptanceCriteria || check.covers_acceptance_criteria || []),
      ].map(item => String(item || "").trim()).filter(Boolean);
      if (criteria.length && criteria.every(criterion => coveredCriteria.has(criterion))) continue;
      checks.push({
        ...check,
        // 派生检查同样要留下截图证据，并标注来源便于回溯。
        screenshot: check.screenshot !== false,
        context: {
          ...(check.context || {}),
          source: "acceptance_criteria",
          generatedBy: (check.context as any)?.generatedBy || `acceptance_flow_${builder.kind}`,
          registryBuilder: builder.kind,
        },
      });
      criteria.forEach(criterion => coveredCriteria.add(criterion));
    }
  }
  return checks;
}

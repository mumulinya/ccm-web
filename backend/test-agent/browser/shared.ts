import {
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
} from "../types";
import { requiredCheckEnabled } from "../utils";
import { buildBrowserChecksForProject } from "./auto-checks";

export function wantsBrowser(workOrder: NormalizedTestAgentWorkOrder) {
  if (workOrder.options.browserProvider === "none") return false;
  if (requiredCheckEnabled(workOrder.requiredChecks, "browser_e2e", "screenshots", "console_errors")) return true;
  return workOrder.projects.some(project => !!project.targetUrl || project.browserChecks.length > 0 || project.adversarialBrowserChecks.length > 0);
}

export function checksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildBrowserChecksForProject(project, acceptanceCriteria);
}

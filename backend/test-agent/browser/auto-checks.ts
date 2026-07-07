import {
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { buildAcceptanceDerivedBrowserAssertions } from "./acceptance-derived-checks";

export const AUTO_BROWSER_SMOKE_PROBE_TYPE = "auto_target_url_smoke";

export function autoPageContentAssertion(): BrowserAssertionSpec {
  return {
    type: "jsTruthy",
    expression: "document.body && (((document.body.innerText || document.body.textContent || '').trim().length > 0) || document.body.children.length > 0)",
  };
}

export function buildAutoBrowserSmokeCheck(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec | null {
  if (!project.targetUrl) return null;
  const acceptanceAssertions = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria).map(item => item.assertion);
  return {
    name: `Auto browser smoke: ${project.name}`,
    url: project.targetUrl,
    probeType: AUTO_BROWSER_SMOKE_PROBE_TYPE,
    actions: [
      { type: "goto", url: project.targetUrl, waitUntil: "domcontentloaded" },
      { type: "waitForTimeout", value: "250" },
    ],
    assertions: [
      autoPageContentAssertion(),
      ...acceptanceAssertions,
      { type: "consoleNoErrors" },
      { type: "networkNoErrors" },
    ],
    screenshot: true,
  };
}

export function buildBrowserChecksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
  if (explicit.length) return explicit;
  const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
  return auto ? [auto] : [];
}

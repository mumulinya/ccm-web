import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckResult,
  BrowserCheckSpec,
  BrowserProviderGapItem,
  BrowserStepResult,
  NormalizedTestAgentWorkOrder,
} from "../types";
import { compactText } from "../utils";
import { hasMultiSessionBrowserScenario } from "./multi-session";
import { checksForProject } from "./shared";
import { browserCheckStabilityRuns } from "./stability-summary";
import { browserCheckRequiresManagedAuthentication, browserStorageStatePath } from "./authentication";
import { browserCheckUsesExistingSession } from "./existing-session";

export interface BrowserProviderPlanWarning {
  provider: string;
  project: string;
  check: string;
  kind: "action" | "assertion" | "context" | "artifact" | "provider";
  item?: string;
  category: "requires_playwright" | "provider_disabled" | "provider_dependent";
  reason: string;
  recommendation: string;
}

const GAP_PATTERNS = [
  /use (the )?playwright provider/i,
  /use playwright/i,
  /use a browser-native/i,
  /not mapped/i,
  /not supported/i,
  /cannot verify/i,
  /cannot read DOM/i,
  /cannot evaluate/i,
  /cannot modify/i,
  /cannot emulate/i,
  /cannot expose/i,
  /does not expose/i,
  /cannot resolve/i,
  /requires .*provider/i,
];

const MISSING_TOOL_PATTERN = /\bmissing\b.*\b(tool|browser_|javascript_|computer|key|type|left_click|screenshot|navigate|evaluate)\b/i;

const MCP_REQUIRES_PLAYWRIGHT_ACTIONS = new Set<BrowserActionSpec["type"]>([
  "uploadFile",
  "dragTo",
  "doubleClick",
  "rightClick",
  "focus",
  "setClipboard",
  "setOffline",
  "setOnline",
  "goBack",
  "goForward",
  "selectOption",
]);

const MCP_REQUIRES_PLAYWRIGHT_ASSERTIONS = new Set<BrowserAssertionSpec["type"]>([
  "focused",
  "notFocused",
  "enabled",
  "disabled",
  "checked",
  "notChecked",
  "selectedValue",
  "selectedTextIncludes",
  "inputValueEquals",
  "inputValueIncludes",
  "attributeEquals",
  "attributeIncludes",
  "computedStyleEquals",
  "computedStyleIncludes",
  "elementCountEquals",
  "elementCountAtLeast",
  "elementCountAtMost",
  "dialogAppeared",
  "dialogMessageIncludes",
  "dialogTypeEquals",
  "popupOpened",
  "popupUrlIncludes",
  "popupTextIncludes",
  "popupTitleIncludes",
  "tableRowIncludes",
  "tableCellTextIncludes",
  "tableCellTextEquals",
  "clipboardTextEquals",
  "clipboardTextIncludes",
  "elementScreenshotNotBlank",
  "accessibleNameEquals",
  "accessibleNameIncludes",
  "accessibleDescriptionEquals",
  "accessibleDescriptionIncludes",
  "ariaExpanded",
  "ariaCollapsed",
  "ariaPressed",
  "ariaNotPressed",
  "ariaSelected",
  "ariaNotSelected",
  "ariaInvalid",
  "ariaValid",
  "ariaRequired",
  "ariaNotRequired",
  "inViewport",
  "noHorizontalOverflow",
  "onlineState",
  "browserOnline",
  "browserOffline",
  "cookieExists",
  "cookieValueEquals",
  "cookieValueIncludes",
  "localStorageEquals",
  "localStorageIncludes",
  "sessionStorageEquals",
  "sessionStorageIncludes",
  "downloadedFile",
]);

function clean(value: any, max = 320) {
  return compactText(String(value || "").replace(/\s+/g, " ").trim(), max);
}

function categoryFor(kind: BrowserProviderGapItem["kind"], text: string): BrowserProviderGapItem["category"] {
  if (MISSING_TOOL_PATTERN.test(text)) return "missing_tool";
  if (/availability|provider unavailable|No browser provider was available/i.test(text)) return "provider_unavailable";
  if (kind === "action") return "unsupported_action";
  if (kind === "assertion") return "unsupported_assertion";
  return "provider_capability_gap";
}

function isProviderGap(text: string) {
  return !!text && (MISSING_TOOL_PATTERN.test(text) || GAP_PATTERNS.some(pattern => pattern.test(text)));
}

function recommendationFor(text: string, provider: string) {
  if (/playwright/i.test(text)) return "Rerun this browser check with the Playwright provider for deterministic DOM/browser-state control.";
  if (/browser-native|DOM|JavaScript|evaluate|network|console|accessibility|ARIA/i.test(text)) {
    return "Use Playwright, Claude in Chrome, or Chrome DevTools MCP for DOM, JavaScript, console, network, and accessibility evidence.";
  }
  if (/missing/i.test(text)) return `Enable the missing browser tool for ${provider || "the selected provider"} or switch to Playwright.`;
  return "Switch to a browser provider that exposes this action/assertion, or rewrite the check to use supported provider capabilities.";
}

function gapFromStep(result: BrowserCheckResult, step: BrowserStepResult): BrowserProviderGapItem | null {
  const text = clean([step.name, step.detail || "", step.error || ""].filter(Boolean).join(" "));
  if (!isProviderGap(text)) return null;
  const provider = result.provider || "none";
  return {
    provider,
    project: result.project,
    check: result.name,
    kind: step.kind,
    step: step.name,
    category: categoryFor(step.kind, text),
    reason: clean(step.error || step.detail || text),
    recommendation: recommendationFor(text, provider),
  };
}

function gapFromResult(result: BrowserCheckResult): BrowserProviderGapItem | null {
  const text = clean(result.error || "");
  if (!isProviderGap(text) && !/availability|provider unavailable|No browser provider was available/i.test(text)) return null;
  const provider = result.provider || "none";
  return {
    provider,
    project: result.project,
    check: result.name,
    kind: "provider",
    category: categoryFor("provider", text),
    reason: text,
    recommendation: recommendationFor(text, provider),
  };
}

function gapKey(item: BrowserProviderGapItem) {
  return [
    item.provider,
    item.project,
    item.check,
    item.kind,
    item.step || "",
    item.category,
    item.reason.toLowerCase(),
  ].join("\0");
}

export function buildBrowserProviderGaps(results: BrowserCheckResult[]) {
  const gaps: BrowserProviderGapItem[] = [];
  for (const result of results) {
    const resultGap = gapFromResult(result);
    if (resultGap) gaps.push(resultGap);
    for (const step of result.steps || []) {
      if (step.status !== "failed") continue;
      const gap = gapFromStep(result, step);
      if (gap) gaps.push(gap);
    }
  }

  const seen = new Set<string>();
  return gaps.filter(item => {
    const key = gapKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

export function formatBrowserProviderGapLine(item: BrowserProviderGapItem) {
  const location = [item.project, item.check, item.step].filter(Boolean).join(" / ");
  return `${item.provider} ${item.category}${location ? ` ${location}` : ""}: ${item.reason} Recommendation: ${item.recommendation}`;
}

function hasBrowserContextOptions(check: BrowserCheckSpec) {
  return Boolean(
    check.viewport
    || check.viewportWidth
    || check.viewport_width
    || check.viewportHeight
    || check.viewport_height
    || check.isMobile
    || check.is_mobile
    || check.deviceScaleFactor
    || check.device_scale_factor
    || check.userAgent
    || check.user_agent
    || check.locale
    || check.timezoneId
    || check.timezone_id
    || check.colorScheme
    || check.color_scheme
    || check.reducedMotion
    || check.reduced_motion
    || (check.permissions || []).length
    || check.geolocation
    || browserStorageStatePath(check)
    || (check.sessions || []).some(session => browserStorageStatePath(session))
  );
}

function browserProviderPlanWarningKey(item: BrowserProviderPlanWarning) {
  return [
    item.provider,
    item.project,
    item.check,
    item.kind,
    item.item || "",
    item.category,
  ].join("\0");
}

function planWarning(input: Omit<BrowserProviderPlanWarning, "recommendation"> & { recommendation?: string }): BrowserProviderPlanWarning {
  return {
    ...input,
    recommendation: input.recommendation || "Use the Playwright provider for this browser check before running TestAgent.",
  };
}

function actionPlanWarning(provider: string, project: string, check: string, action: BrowserActionSpec): BrowserProviderPlanWarning | null {
  if (MCP_REQUIRES_PLAYWRIGHT_ACTIONS.has(action.type)) {
    return planWarning({
      provider,
      project,
      check,
      kind: "action",
      item: action.type,
      category: "requires_playwright",
      reason: `Browser action ${action.type} is not reliably mapped by the MCP browser provider.`,
    });
  }
  if (action.type === "setCookie" && (action.httpOnly === true || action.http_only === true)) {
    return planWarning({
      provider,
      project,
      check,
      kind: "action",
      item: "setCookie.httpOnly",
      category: "requires_playwright",
      reason: "HttpOnly cookie setup requires Playwright browser context control.",
    });
  }
  return null;
}

function assertionPlanWarning(provider: string, project: string, check: string, assertion: BrowserAssertionSpec): BrowserProviderPlanWarning | null {
  if (!MCP_REQUIRES_PLAYWRIGHT_ASSERTIONS.has(assertion.type)) return null;
  return planWarning({
    provider,
    project,
    check,
    kind: "assertion",
    item: assertion.type,
    category: "requires_playwright",
    reason: `Browser assertion ${assertion.type} needs DOM/browser-state evidence that MCP providers cannot verify deterministically.`,
  });
}

export function browserCheckRequiresPlaywright(
  workOrder: NormalizedTestAgentWorkOrder,
  check: BrowserCheckSpec,
) {
  if (browserCheckUsesExistingSession(check)) return false;
  if (hasMultiSessionBrowserScenario(check)) return true;
  if (browserCheckStabilityRuns(check) > 1) return true;
  if (browserCheckRequiresManagedAuthentication(check)) return true;
  if (hasBrowserContextOptions(check)) return true;
  if (workOrder.options.collectBrowserVideo) return true;
  if ((check.actions || []).some(action => Boolean(actionPlanWarning("mcp", "", "", action)))) return true;
  return (check.assertions || []).some(assertion => Boolean(assertionPlanWarning("mcp", "", "", assertion)));
}

export function buildBrowserProviderPlanWarnings(workOrder: NormalizedTestAgentWorkOrder) {
  const provider = workOrder.options.browserProvider || "auto";
  const warnings: BrowserProviderPlanWarning[] = [];
  const browserChecks = workOrder.projects.flatMap(project =>
    checksForProject(project, workOrder.acceptanceCriteria).map(check => ({ project, check }))
  );

  if (provider === "none") {
    for (const { project, check } of browserChecks) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: check.name || "Browser check",
        kind: "provider",
        category: "provider_disabled",
        reason: "Browser provider is disabled, but this work order includes browser verification.",
        recommendation: "Enable Playwright or another browser provider before running TestAgent for browser-facing acceptance criteria.",
      }));
    }
    return warnings.slice(0, 50);
  }

  if (provider !== "mcp" && !browserChecks.some(item => browserCheckUsesExistingSession(item.check))) return [];

  for (const { project, check } of browserChecks) {
    const checkName = check.name || "Browser check";
    const existingSession = browserCheckUsesExistingSession(check);
    if (existingSession && provider === "playwright") {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "provider",
        item: "existingSession",
        category: "provider_dependent",
        reason: "Existing authenticated Chrome sessions cannot be attached to Playwright's isolated browser profile.",
        recommendation: "Expose Claude in Chrome or Chrome DevTools MCP tools; TestAgent will route this check to the authenticated MCP provider.",
      }));
    }
    if (provider !== "mcp" && !existingSession) continue;
    if (hasMultiSessionBrowserScenario(check)) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "provider",
        item: "multiSession",
        category: "requires_playwright",
        reason: "Isolated multi-session browser scenarios require multiple Playwright browser contexts and ordered cross-session steps.",
      }));
    }
    if (browserCheckStabilityRuns(check) > 1) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "provider",
        item: "stabilityRuns",
        category: "requires_playwright",
        reason: "Browser stability runs require a fresh isolated browser context for every run.",
      }));
    }
    if (browserCheckRequiresManagedAuthentication(check)) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "provider",
        item: "browserAuthentication",
        category: "requires_playwright",
        reason: "Credential environment bindings and storage-state files are intentionally kept inside isolated Playwright contexts and are not sent through MCP browser tool calls.",
      }));
    }
    if (hasBrowserContextOptions(check)) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "context",
        item: "browserContext",
        category: "requires_playwright",
        reason: "Viewport/device/locale/permissions/geolocation context options require Playwright for deterministic setup.",
      }));
    }
    if (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo) {
      warnings.push(planWarning({
        provider,
        project: project.name,
        check: checkName,
        kind: "artifact",
        item: workOrder.options.collectBrowserVideo ? "trace/har/video" : "trace/har",
        category: "requires_playwright",
        reason: "Browser trace/HAR/video collection is Playwright-backed in TestAgent.",
      }));
    }
    for (const action of check.actions || []) {
      const warning = actionPlanWarning(provider, project.name, checkName, action);
      if (warning) warnings.push(warning);
    }
    for (const assertion of check.assertions || []) {
      const warning = assertionPlanWarning(provider, project.name, checkName, assertion);
      if (warning) warnings.push(warning);
    }
  }

  const seen = new Set<string>();
  return warnings.filter(item => {
    const key = browserProviderPlanWarningKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 50);
}

export function formatBrowserProviderPlanWarningLine(item: BrowserProviderPlanWarning) {
  const location = [item.project, item.check, item.item].filter(Boolean).join(" / ");
  return `${item.provider} ${item.category}${location ? ` ${location}` : ""}: ${item.reason} Recommendation: ${item.recommendation}`;
}

import {
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";
import { buildAcceptanceDerivedBrowserAssertionsByCriterion } from "./acceptance-derived-checks";

export const AUTO_BROWSER_SMOKE_PROBE_TYPE = "auto_target_url_smoke";

export function autoPageContentAssertion(): BrowserAssertionSpec {
  return { type: "pageNotBlank" };
}

function normalizedUrlKey(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url || "").replace(/\/$/, "");
  }
}

function autoSmokeName(project: NormalizedTestAgentProjectTarget, url: string) {
  const baseKey = normalizedUrlKey(project.targetUrl);
  const urlKey = normalizedUrlKey(url);
  if (!baseKey || baseKey === urlKey) return `Auto browser smoke: ${project.name}`;
  try {
    const parsed = new URL(url);
    return `Auto browser smoke: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Auto browser smoke: ${project.name} ${url}`;
  }
}

function buildAutoBrowserSmokeCheckForUrl(
  project: NormalizedTestAgentProjectTarget,
  url: string,
  acceptanceAssertions: BrowserAssertionSpec[],
  acceptanceCriteria: string[] = [],
  generatedBy = AUTO_BROWSER_SMOKE_PROBE_TYPE,
): BrowserCheckSpec {
  return {
    name: autoSmokeName(project, url),
    url,
    probeType: AUTO_BROWSER_SMOKE_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy,
      acceptanceCriteria,
    },
    actions: [
      { type: "goto", url, waitUntil: "domcontentloaded" },
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

function browserAssertionKey(assertion: BrowserAssertionSpec) {
  return [
    assertion.type,
    assertion.selector,
    assertion.locator,
    assertion.label,
    assertion.role,
    assertion.name,
    assertion.text,
    assertion.value,
    assertion.expression,
    assertion.key,
    assertion.method,
    assertion.urlIncludes,
    assertion.url_includes,
    assertion.url,
    Array.isArray(assertion.status) ? assertion.status.join("|") : assertion.status,
    Array.isArray(assertion.statusCode) ? assertion.statusCode.join("|") : assertion.statusCode,
    Array.isArray(assertion.status_code) ? assertion.status_code.join("|") : assertion.status_code,
    assertion.resourceType,
    assertion.resource_type,
  ].map(value => String(value || "").toLowerCase()).join(":");
}

function addUniqueBrowserAssertion(items: BrowserAssertionSpec[], seen: Set<string>, assertion: BrowserAssertionSpec) {
  const key = browserAssertionKey(assertion);
  if (seen.has(key)) return;
  seen.add(key);
  items.push(assertion);
}

export function buildAutoBrowserSmokeCheck(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec | null {
  if (!project.targetUrl) return null;
  return buildAutoBrowserSmokeCheckForUrl(project, project.targetUrl, [], acceptanceCriteria, "structured_target_url_smoke");
}

export function buildAcceptancePathBrowserSmokeChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  if (!project.targetUrl) return [];
  const grouped = buildAcceptanceDerivedBrowserAssertionsByCriterion(acceptanceCriteria);
  const seen = new Set<string>([normalizedUrlKey(project.targetUrl)]);
  const checksByUrl = new Map<string, { url: string; assertions: BrowserAssertionSpec[]; seenAssertions: Set<string>; criteria: string[] }>();

  for (const group of grouped) {
    const scopedAssertions = group.assertions
      .filter(item => item.reason !== "explicit_url_path")
      .map(item => item.assertion);
    const pathAssertions = group.assertions.filter(item => item.reason === "explicit_url_path");

    for (const pathItem of pathAssertions) {
      const path = String(pathItem.assertion.text || pathItem.assertion.value || "");
      const url = resolveUrl(project.targetUrl, path);
      const key = normalizedUrlKey(url);
      if (!url || seen.has(key)) continue;

      let entry = checksByUrl.get(key);
      if (!entry) {
        entry = { url, assertions: [], seenAssertions: new Set<string>(), criteria: [] };
        checksByUrl.set(key, entry);
      }
      if (!entry.criteria.includes(group.criterion)) entry.criteria.push(group.criterion);

      for (const assertion of scopedAssertions) {
        addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, assertion);
      }
      addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, pathItem.assertion);
    }
  }

  return Array.from(checksByUrl.values()).map(entry => buildAutoBrowserSmokeCheckForUrl(
    project,
    entry.url,
    entry.assertions,
    entry.criteria,
    "acceptance_path_smoke",
  ));
}

export function buildBrowserChecksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
  if (explicit.length) return explicit;
  const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
  return auto ? [auto] : [];
}

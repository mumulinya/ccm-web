import {
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";
import { buildAcceptanceDerivedBrowserAssertions, buildAcceptanceDerivedBrowserAssertionsByCriterion } from "./acceptance-derived-checks";
import { buildAcceptanceDownloadFlowBrowserChecks } from "./acceptance-download-flows";
import { buildAcceptanceFormFlowBrowserChecks } from "./acceptance-form-flows";
import { buildAcceptanceUploadFlowBrowserChecks } from "./acceptance-upload-flows";

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

function buildAutoBrowserSmokeCheckForUrl(project: NormalizedTestAgentProjectTarget, url: string, acceptanceAssertions: BrowserAssertionSpec[]): BrowserCheckSpec {
  return {
    name: autoSmokeName(project, url),
    url,
    probeType: AUTO_BROWSER_SMOKE_PROBE_TYPE,
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
  return `${assertion.type}:${String(assertion.text || assertion.value || assertion.expression || "").toLowerCase()}`;
}

function addUniqueBrowserAssertion(items: BrowserAssertionSpec[], seen: Set<string>, assertion: BrowserAssertionSpec) {
  const key = browserAssertionKey(assertion);
  if (seen.has(key)) return;
  seen.add(key);
  items.push(assertion);
}

export function buildAutoBrowserSmokeCheck(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec | null {
  if (!project.targetUrl) return null;
  const acceptanceAssertions = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria).map(item => item.assertion);
  return buildAutoBrowserSmokeCheckForUrl(project, project.targetUrl, acceptanceAssertions);
}

export function buildAcceptancePathBrowserSmokeChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  if (!project.targetUrl) return [];
  const grouped = buildAcceptanceDerivedBrowserAssertionsByCriterion(acceptanceCriteria);
  const seen = new Set<string>([normalizedUrlKey(project.targetUrl)]);
  const checksByUrl = new Map<string, { url: string; assertions: BrowserAssertionSpec[]; seenAssertions: Set<string> }>();

  for (const group of grouped) {
    const textAssertions = group.assertions
      .filter(item => item.reason === "quoted_text")
      .map(item => item.assertion);
    const pathAssertions = group.assertions.filter(item => item.reason === "explicit_url_path");

    for (const pathItem of pathAssertions) {
      const path = String(pathItem.assertion.text || pathItem.assertion.value || "");
      const url = resolveUrl(project.targetUrl, path);
      const key = normalizedUrlKey(url);
      if (!url || seen.has(key)) continue;

      let entry = checksByUrl.get(key);
      if (!entry) {
        entry = { url, assertions: [], seenAssertions: new Set<string>() };
        checksByUrl.set(key, entry);
      }

      for (const assertion of textAssertions) {
        addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, assertion);
      }
      addUniqueBrowserAssertion(entry.assertions, entry.seenAssertions, pathItem.assertion);
    }
  }

  return Array.from(checksByUrl.values()).map(entry => buildAutoBrowserSmokeCheckForUrl(project, entry.url, entry.assertions));
}

export function buildBrowserChecksForProject(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  const explicit = [...project.browserChecks, ...project.adversarialBrowserChecks];
  if (explicit.length) return explicit;
  const formFlowChecks = buildAcceptanceFormFlowBrowserChecks(project, acceptanceCriteria);
  const downloadFlowChecks = buildAcceptanceDownloadFlowBrowserChecks(project, acceptanceCriteria);
  const uploadFlowChecks = buildAcceptanceUploadFlowBrowserChecks(project, acceptanceCriteria);
  const formFlowUrls = new Set<string>();
  for (const check of formFlowChecks) {
    formFlowUrls.add(normalizedUrlKey(check.url || ""));
    for (const assertion of check.assertions || []) {
      if (assertion.type !== "urlIncludes") continue;
      const urlPath = String(assertion.text || assertion.value || "");
      if (urlPath) formFlowUrls.add(normalizedUrlKey(resolveUrl(project.targetUrl, urlPath)));
    }
  }
  const generatedFlowUrls = new Set<string>(formFlowUrls);
  for (const check of downloadFlowChecks) {
    generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
    for (const assertion of check.assertions || []) {
      if (assertion.type !== "urlIncludes") continue;
      const urlPath = String(assertion.text || assertion.value || "");
      if (urlPath) generatedFlowUrls.add(normalizedUrlKey(resolveUrl(project.targetUrl, urlPath)));
    }
  }
  for (const check of uploadFlowChecks) {
    generatedFlowUrls.add(normalizedUrlKey(check.url || ""));
    for (const assertion of check.assertions || []) {
      if (assertion.type !== "urlIncludes") continue;
      const urlPath = String(assertion.text || assertion.value || "");
      if (urlPath) generatedFlowUrls.add(normalizedUrlKey(resolveUrl(project.targetUrl, urlPath)));
    }
  }
  const pathChecks = buildAcceptancePathBrowserSmokeChecks(project, acceptanceCriteria);
  const remainingPathChecks = pathChecks.filter(check => !generatedFlowUrls.has(normalizedUrlKey(check.url || "")));
  if (formFlowChecks.length || downloadFlowChecks.length || uploadFlowChecks.length || remainingPathChecks.length) return [...formFlowChecks, ...downloadFlowChecks, ...uploadFlowChecks, ...remainingPathChecks];
  const auto = buildAutoBrowserSmokeCheck(project, acceptanceCriteria);
  return auto ? [auto] : [];
}

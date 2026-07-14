import {
  HttpAssertionResult,
  HttpAssertionSpec,
  HttpCheckResult,
  HttpCheckSpec,
  HttpConcurrentRequestResult,
  HttpResourceCheckResult,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
} from "./types";
import {
  buildHttpConcurrencyEvidence,
  buildHttpConcurrencyValueEvidence,
  concurrencyAggregatePaths,
  httpConcurrencySpecFor,
  httpConcurrencyResultStatus,
  interpolateHttpConcurrencyValue,
} from "./http-concurrency";
import {
  expectedHttpResourceContentTypes,
  extractCssPageResources,
  extractHtmlPageResources,
  httpPageResourceFailureDetail,
  httpResourceContentTypeMatches,
  HttpPageResourceCandidate,
  redactHttpPageResourceUrl,
} from "./http-page-resources";
import { compactText, nowIso, resolveUrl, validateTestAgentUrl } from "./utils";
import { browserCheckUsesExistingSession } from "./browser/existing-session";
import { checksForProject } from "./browser/shared";

function wantsHttp(workOrder: NormalizedTestAgentWorkOrder) {
  return workOrder.projects.some(project =>
    project.httpChecks.length > 0
    || project.adversarialHttpChecks.length > 0
    || projectNeedsAutomaticPageProbe(workOrder, project)
  );
}

function projectNeedsAutomaticPageProbe(
  workOrder: NormalizedTestAgentWorkOrder,
  project: NormalizedTestAgentProjectTarget,
) {
  if (!project.targetUrl && !project.startupUrl) return false;
  const checks = checksForProject(project, workOrder.acceptanceCriteria);
  return !checks.length || !checks.every(browserCheckUsesExistingSession);
}

async function fetchWithTimeout(url: string, timeoutMs: number, init: RequestInit = {}) {
  const safety = validateTestAgentUrl(url);
  if (!safety.valid) return { response: null as Response | null, text: "", durationMs: 0, error: safety.error, finalUrl: url, redirectCount: 0 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const redirectMode = init.redirect || "follow";
  let currentUrl = safety.url;
  let currentInit = { ...init };
  let redirectCount = 0;
  try {
    while (true) {
      const response = await fetch(currentUrl, { ...currentInit, signal: controller.signal, redirect: "manual" });
      const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
      const location = isRedirect ? response.headers.get("location") || "" : "";
      if (!isRedirect || !location || redirectMode === "manual") {
        const contentType = response.headers.get("content-type") || "";
        const text = contentType.includes("text/html") || contentType.includes("application/json") || contentType.includes("text/")
          ? await response.text().catch(() => "")
          : "";
        return { response, text, durationMs: Date.now() - started, error: "", finalUrl: currentUrl, redirectCount };
      }
      if (redirectMode === "error") {
        try { await response.body?.cancel(); } catch {}
        return { response: null as Response | null, text: "", durationMs: Date.now() - started, error: "HTTP redirect is not allowed for this request.", finalUrl: currentUrl, redirectCount };
      }
      if (redirectCount >= 10) {
        try { await response.body?.cancel(); } catch {}
        return { response: null as Response | null, text: "", durationMs: Date.now() - started, error: "HTTP redirect limit exceeded.", finalUrl: currentUrl, redirectCount };
      }
      const nextSafety = validateTestAgentUrl(location, currentUrl);
      if (!nextSafety.valid) {
        try { await response.body?.cancel(); } catch {}
        return {
          response: null as Response | null,
          text: "",
          durationMs: Date.now() - started,
          error: `HTTP redirect target was blocked: ${nextSafety.error}`,
          finalUrl: currentUrl,
          redirectCount,
        };
      }

      const currentMethod = String(currentInit.method || "GET").toUpperCase();
      const switchesToGet = response.status === 303 && currentMethod !== "GET" && currentMethod !== "HEAD"
        || (response.status === 301 || response.status === 302) && currentMethod === "POST";
      const headers = new Headers(currentInit.headers || {});
      if (switchesToGet) {
        currentInit = { ...currentInit, method: "GET", body: undefined, headers };
        for (const name of ["content-length", "content-type", "transfer-encoding"]) headers.delete(name);
      } else {
        currentInit = { ...currentInit, headers };
      }
      if (new URL(currentUrl).origin !== new URL(nextSafety.url).origin) {
        for (const name of ["authorization", "proxy-authorization", "cookie", "cookie2"]) headers.delete(name);
      }
      try { await response.body?.cancel(); } catch {}
      currentUrl = nextSafety.url;
      redirectCount += 1;
    }
  } catch (error: any) {
    return { response: null as Response | null, text: "", durationMs: Date.now() - started, error: error.message || String(error), finalUrl: currentUrl, redirectCount };
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string) {
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return undefined; }
}

function pathParts(path: string) {
  return String(path || "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map(item => item.trim())
    .filter(Boolean);
}

function valueAtPath(input: any, path: string) {
  let current = input;
  for (const part of pathParts(path)) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function sameValue(actual: any, expected: any) {
  if (actual === expected) return true;
  if (typeof actual === "number" && typeof expected === "string" && actual === Number(expected)) return true;
  if (typeof expected === "number" && typeof actual === "string" && Number(actual) === expected) return true;
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function assertionResult(name: string, passed: boolean, detail = "", error = ""): HttpAssertionResult {
  return { name, status: passed ? "passed" : "failed", detail, ...(passed ? {} : { error }) };
}

function expectedStatuses(assertion: HttpAssertionSpec) {
  const raw = assertion.status ?? assertion.statusCode ?? assertion.status_code ?? assertion.value;
  return Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : [Number(raw)].filter(Number.isFinite);
}

function runHttpAssertion(assertion: HttpAssertionSpec, signal: {
  statusCode: number | null;
  contentType: string;
  text: string;
  json: any;
}): HttpAssertionResult {
  if (assertion.type === "status") {
    const expected = expectedStatuses(assertion);
    if (!expected.length) return assertionResult("http:status", false, "", "Status assertion requires status/statusCode/value.");
    const passed = signal.statusCode !== null && expected.includes(signal.statusCode);
    return assertionResult("http:status", passed, `expected=${expected.join("|")}; actual=${signal.statusCode}`, `Expected HTTP status ${expected.join(" or ")}, got ${signal.statusCode}.`);
  }
  if (assertion.type === "contentTypeIncludes") {
    const expected = String(assertion.text ?? assertion.value ?? "");
    if (!expected) return assertionResult("http:contentTypeIncludes", false, "", "contentTypeIncludes requires text/value.");
    const passed = signal.contentType.toLowerCase().includes(expected.toLowerCase());
    return assertionResult("http:contentTypeIncludes", passed, expected, `Expected content-type to include "${expected}", got "${signal.contentType}".`);
  }
  if (assertion.type === "textIncludes") {
    const expected = String(assertion.text ?? assertion.value ?? "");
    if (!expected) return assertionResult("http:textIncludes", false, "", "textIncludes requires text/value.");
    const passed = signal.text.includes(expected);
    return assertionResult("http:textIncludes", passed, expected, `Expected response text to include "${expected}".`);
  }
  if (assertion.type === "textNotIncludes") {
    const expected = String(assertion.text ?? assertion.value ?? "");
    if (!expected) return assertionResult("http:textNotIncludes", false, "", "textNotIncludes requires text/value.");
    const passed = !signal.text.includes(expected);
    return assertionResult("http:textNotIncludes", passed, expected, `Response text unexpectedly includes "${expected}".`);
  }
  if (assertion.type === "jsonPathEquals" || assertion.type === "jsonPathIncludes") {
    const path = assertion.path || "";
    if (!path) return assertionResult(`http:${assertion.type}`, false, "", `${assertion.type} requires path.`);
    if (signal.json === undefined) return assertionResult(`http:${assertion.type}`, false, path, "Response body is not valid JSON.");
    const actual = valueAtPath(signal.json, path);
    const expected = assertion.value;
    const passed = assertion.type === "jsonPathEquals"
      ? sameValue(actual, expected)
      : String(actual ?? "").includes(String(expected ?? ""));
    return assertionResult(
      `http:${assertion.type}`,
      passed,
      `${path}=${compactText(JSON.stringify(actual), 500)}`,
      assertion.type === "jsonPathEquals"
        ? `Expected JSON path "${path}" to equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`
        : `Expected JSON path "${path}" to include ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`,
    );
  }
  return assertionResult(`http:${(assertion as any).type}`, false, "", `Unsupported HTTP assertion ${(assertion as any).type}.`);
}

async function checkResource(
  pageUrl: string,
  candidate: HttpPageResourceCandidate,
  timeoutMs: number,
): Promise<{ evidence: HttpResourceCheckResult; text: string }> {
  const pageOrigin = new URL(pageUrl).origin;
  let currentUrl = candidate.url;
  let redirectCount = 0;
  let result = await fetchWithTimeout(currentUrl, timeoutMs, { redirect: "manual" });
  while (result.response && result.response.status >= 300 && result.response.status < 400) {
    const location = result.response.headers.get("location") || "";
    if (!location) {
      return {
        evidence: {
          url: redactHttpPageResourceUrl(candidate.url),
          finalUrl: redactHttpPageResourceUrl(currentUrl),
          status: "failed",
          statusCode: result.response.status,
          contentType: result.response.headers.get("content-type") || "",
          kind: candidate.kind,
          source: candidate.source,
          discoveredFrom: redactHttpPageResourceUrl(candidate.discoveredFrom),
          redirectCount,
          expectedContentTypes: expectedHttpResourceContentTypes(candidate.kind),
          contentTypeMatched: httpResourceContentTypeMatches(candidate.kind, result.response.headers.get("content-type") || ""),
          error: `HTTP ${result.response.status} redirect is missing Location.`,
        },
        text: result.text,
      };
    }
    if (redirectCount >= 3) {
      return {
        evidence: {
          url: redactHttpPageResourceUrl(candidate.url),
          finalUrl: redactHttpPageResourceUrl(currentUrl),
          status: "failed",
          statusCode: result.response.status,
          contentType: result.response.headers.get("content-type") || "",
          kind: candidate.kind,
          source: candidate.source,
          discoveredFrom: redactHttpPageResourceUrl(candidate.discoveredFrom),
          redirectCount,
          expectedContentTypes: expectedHttpResourceContentTypes(candidate.kind),
          contentTypeMatched: httpResourceContentTypeMatches(candidate.kind, result.response.headers.get("content-type") || ""),
          error: "Page resource exceeded the same-origin redirect limit.",
        },
        text: result.text,
      };
    }
    const nextUrl = new URL(location, currentUrl);
    if (!/^https?:$/.test(nextUrl.protocol) || nextUrl.origin !== pageOrigin) {
      return {
        evidence: {
          url: redactHttpPageResourceUrl(candidate.url),
          finalUrl: redactHttpPageResourceUrl(currentUrl),
          status: "failed",
          statusCode: result.response.status,
          contentType: result.response.headers.get("content-type") || "",
          kind: candidate.kind,
          source: candidate.source,
          discoveredFrom: redactHttpPageResourceUrl(candidate.discoveredFrom),
          redirectCount,
          expectedContentTypes: expectedHttpResourceContentTypes(candidate.kind),
          contentTypeMatched: httpResourceContentTypeMatches(candidate.kind, result.response.headers.get("content-type") || ""),
          error: "Page resource redirected outside the verified page origin.",
        },
        text: result.text,
      };
    }
    redirectCount += 1;
    currentUrl = nextUrl.toString();
    result = await fetchWithTimeout(currentUrl, timeoutMs, { redirect: "manual" });
  }
  const statusCode = result.response?.status ?? null;
  const contentType = result.response?.headers.get("content-type") || "";
  const expectedContentTypes = expectedHttpResourceContentTypes(candidate.kind);
  const contentTypeMatched = httpResourceContentTypeMatches(candidate.kind, contentType);
  const base = {
    url: redactHttpPageResourceUrl(candidate.url),
    finalUrl: redactHttpPageResourceUrl(currentUrl),
    statusCode,
    contentType,
    kind: candidate.kind,
    source: candidate.source,
    discoveredFrom: redactHttpPageResourceUrl(candidate.discoveredFrom),
    redirectCount,
    expectedContentTypes,
    contentTypeMatched,
  };
  if (!result.response) {
    return { evidence: { ...base, status: "blocked", error: result.error || "request failed" }, text: "" };
  }
  const responseOk = statusCode !== null && statusCode >= 200 && statusCode < 400;
  const passed = responseOk && contentTypeMatched !== false;
  return {
    evidence: {
      ...base,
      status: passed ? "passed" : "failed",
      error: passed
        ? undefined
        : !responseOk
          ? `HTTP ${statusCode}`
          : `Expected ${candidate.kind} content-type ${expectedContentTypes.join(" or ")}, got ${contentType || "(missing)"}.`,
    },
    text: result.text,
  };
}

async function verifyProjectPageHttp(workOrder: NormalizedTestAgentWorkOrder, project: NormalizedTestAgentProjectTarget): Promise<HttpCheckResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const url = project.targetUrl || project.startupUrl;
  if (!url) {
    const finishedAt = nowIso();
    return { project: project.name, name: "Page HTTP probe", url: "", method: "GET", status: "skipped", statusCode: null, contentType: "", startedAt, finishedAt, durationMs: Date.now() - started, resourceChecks: [] };
  }
  const main = await fetchWithTimeout(url, workOrder.options.httpTimeoutMs);
  const statusCode = main.response?.status ?? null;
  const contentType = main.response?.headers.get("content-type") || "";
  if (!main.response) {
    const finishedAt = nowIso();
    return {
      project: project.name,
      name: "Page HTTP probe",
      url,
      method: "GET",
      status: "blocked",
      statusCode,
      contentType,
      startedAt,
      finishedAt,
      durationMs: Date.now() - started,
      resourceChecks: [],
      context: {
        pageResourceProbe: true,
        failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
        maxHttpResourceChecks: workOrder.options.maxHttpResourceChecks,
      },
      responsePreview: "",
      error: main.error || "request failed",
    };
  }

  const maxResourceChecks = workOrder.options.maxHttpResourceChecks;
  const verifiedPageUrl = main.finalUrl || url;
  const resourceQueue = extractHtmlPageResources(verifiedPageUrl, main.text, Math.max(maxResourceChecks * 3, maxResourceChecks));
  const resourceChecks: HttpResourceCheckResult[] = [];
  const selected = new Set<string>();
  while (resourceQueue.length && resourceChecks.length < maxResourceChecks) {
    const candidate = resourceQueue.shift()!;
    if (selected.has(candidate.url)) continue;
    selected.add(candidate.url);
    const checked = await checkResource(verifiedPageUrl, candidate, Math.min(workOrder.options.httpTimeoutMs, 8000));
    resourceChecks.push(checked.evidence);
    if (candidate.kind === "stylesheet" && checked.evidence.status === "passed" && checked.text) {
      const nested = extractCssPageResources(verifiedPageUrl, candidate.url, checked.text, maxResourceChecks * 2)
        .filter(item => !selected.has(item.url));
      resourceQueue.unshift(...nested);
    }
  }

  const mainOk = statusCode !== null && statusCode < 400;
  const resourceFailed = workOrder.options.failOnHttpResourceError && resourceChecks.some(item => item.status === "failed" || item.status === "blocked");
  const resourceFailureDetail = httpPageResourceFailureDetail(resourceChecks);
  const finishedAt = nowIso();
  return {
    project: project.name,
    name: "Page HTTP probe",
    url,
    method: "GET",
    status: mainOk && !resourceFailed ? "passed" : "failed",
    statusCode,
    contentType,
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    resourceChecks,
    context: {
      pageResourceProbe: true,
      failOnHttpResourceError: workOrder.options.failOnHttpResourceError,
      maxHttpResourceChecks: workOrder.options.maxHttpResourceChecks,
    },
    responsePreview: compactText(main.text, 2000),
    error: mainOk ? (resourceFailed ? resourceFailureDetail || "One or more same-origin page resources failed." : undefined) : `HTTP ${statusCode}`,
  };
}

function requestInitFor(check: HttpCheckSpec, requestIndex?: number): RequestInit {
  const headers: Record<string, string> = {};
  const interpolatedHeaders = requestIndex === undefined
    ? check.headers || {}
    : interpolateHttpConcurrencyValue(check.headers || {}, requestIndex);
  for (const [key, value] of Object.entries(interpolatedHeaders)) headers[key] = String(value);
  let body: RequestInit["body"] | undefined;
  if (check.json !== undefined) {
    body = JSON.stringify(requestIndex === undefined
      ? check.json
      : interpolateHttpConcurrencyValue(check.json, requestIndex));
    if (!Object.keys(headers).some(key => key.toLowerCase() === "content-type")) headers["content-type"] = "application/json";
  } else if (check.body !== undefined) {
    body = requestIndex === undefined
      ? check.body
      : interpolateHttpConcurrencyValue(check.body, requestIndex);
  }
  return {
    method: (check.method || "GET").toUpperCase(),
    headers,
    body,
  };
}

async function verifyConcurrentHttpCheck(
  workOrder: NormalizedTestAgentWorkOrder,
  project: NormalizedTestAgentProjectTarget,
  check: HttpCheckSpec,
  index: number,
): Promise<HttpCheckResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const concurrency = httpConcurrencySpecFor(check)!;
  const aggregatePaths = concurrencyAggregatePaths(concurrency.aggregateAssertions);
  const method = (check.method || "GET").toUpperCase();
  const timeoutMs = Number(check.timeoutMs || check.timeout_ms || workOrder.options.httpTimeoutMs);
  const requests = await Promise.all(Array.from({ length: concurrency.requests }, async (_, requestIndex): Promise<HttpConcurrentRequestResult> => {
    const requestStartedAt = nowIso();
    const requestStarted = Date.now();
    const interpolatedUrl = interpolateHttpConcurrencyValue(check.url, requestIndex);
    const url = resolveUrl(project.targetUrl || project.startupUrl, interpolatedUrl);
    const result = await fetchWithTimeout(url, timeoutMs, requestInitFor(check, requestIndex));
    const statusCode = result.response?.status ?? null;
    const contentType = result.response?.headers.get("content-type") || "";
    const json = contentType.includes("application/json") ? parseJson(result.text) : undefined;
    const assertions = check.assertions?.length
      ? check.assertions.map(assertion => runHttpAssertion(assertion, {
        statusCode,
        contentType,
        text: result.text,
        json,
      }))
      : [runHttpAssertion(
        { type: "status", status: statusCode !== null && statusCode < 400 ? statusCode : 200 },
        { statusCode, contentType, text: result.text, json },
      )];
    const failedAssertion = assertions.some(assertion => assertion.status === "failed");
    const requestFinishedAt = nowIso();
    return {
      requestIndex,
      requestNumber: requestIndex + 1,
      url,
      method,
      status: !result.response ? "blocked" : failedAssertion ? "failed" : "passed",
      statusCode,
      contentType,
      startedAt: requestStartedAt,
      finishedAt: requestFinishedAt,
      durationMs: Date.now() - requestStarted,
      assertions,
      aggregateValues: buildHttpConcurrencyValueEvidence(json, concurrency.aggregateAssertions),
      responsePreview: aggregatePaths.length
        ? `responseBytes=${Buffer.byteLength(result.text)}; aggregatePaths=${aggregatePaths.length}; raw aggregate values suppressed`
        : compactText(result.text, 1200),
      ...(!result.response
        ? { error: result.error || "request failed" }
        : failedAssertion
          ? {
            error: assertions
              .filter(assertion => assertion.status === "failed")
              .map(assertion => assertion.error)
              .filter(Boolean)
              .join(" | "),
          }
          : {}),
    };
  }));
  const concurrencyEvidence = buildHttpConcurrencyEvidence({
    requested: concurrency.requests,
    requests,
    aggregateAssertions: concurrency.aggregateAssertions,
  });
  const status = httpConcurrencyResultStatus(concurrencyEvidence);
  const statusCodes = Array.from(new Set(requests.map(request => request.statusCode).filter((value): value is number => value !== null)));
  const contentTypes = Array.from(new Set(requests.map(request => request.contentType).filter(Boolean)));
  const failedDetails = [
    ...requests.filter(request => request.status !== "passed").map(request =>
      `request ${request.requestNumber}: ${request.error || request.status}`
    ),
    ...concurrencyEvidence.aggregateAssertions
      .filter(assertion => assertion.status === "failed")
      .map(assertion => assertion.error || assertion.name),
  ];
  const finishedAt = nowIso();
  return {
    project: project.name,
    name: check.name || `HTTP check ${index + 1}`,
    url: resolveUrl(project.targetUrl || project.startupUrl, check.url),
    method,
    status,
    statusCode: statusCodes.length === 1 ? statusCodes[0] : null,
    contentType: contentTypes.length === 1 ? contentTypes[0] : "",
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    resourceChecks: [],
    assertions: concurrencyEvidence.aggregateAssertions,
    responsePreview: requests.slice(0, 3)
      .map(request => `request ${request.requestNumber}: ${request.responsePreview || "(empty)"}`)
      .join("\n"),
    adversarial: check.adversarial === true,
    probeType: check.probeType || check.probe_type,
    context: check.context,
    concurrency: concurrencyEvidence,
    error: failedDetails.length ? failedDetails.join(" | ") : undefined,
  };
}

async function verifyExplicitHttpCheck(workOrder: NormalizedTestAgentWorkOrder, project: NormalizedTestAgentProjectTarget, check: HttpCheckSpec, index: number): Promise<HttpCheckResult> {
  if (httpConcurrencySpecFor(check)) {
    return verifyConcurrentHttpCheck(workOrder, project, check, index);
  }
  const startedAt = nowIso();
  const started = Date.now();
  const url = resolveUrl(project.targetUrl || project.startupUrl, check.url);
  const method = (check.method || "GET").toUpperCase();
  const timeoutMs = Number(check.timeoutMs || check.timeout_ms || workOrder.options.httpTimeoutMs);
  const result = await fetchWithTimeout(url, timeoutMs, requestInitFor(check));
  const statusCode = result.response?.status ?? null;
  const contentType = result.response?.headers.get("content-type") || "";
  const json = contentType.includes("application/json") ? parseJson(result.text) : undefined;
  const assertions = check.assertions?.length
    ? check.assertions.map(assertion => runHttpAssertion(assertion, { statusCode, contentType, text: result.text, json }))
    : [runHttpAssertion({ type: "status", status: statusCode !== null && statusCode < 400 ? statusCode : 200 }, { statusCode, contentType, text: result.text, json })];
  const failedAssertion = assertions.some(assertion => assertion.status === "failed");
  const finishedAt = nowIso();
  if (!result.response) {
    return {
      project: project.name,
      name: check.name || `HTTP check ${index + 1}`,
      url,
      method,
      status: "blocked",
      statusCode,
      contentType,
      startedAt,
      finishedAt,
      durationMs: Date.now() - started,
      resourceChecks: [],
      assertions,
      responsePreview: "",
      adversarial: check.adversarial === true,
      probeType: check.probeType || check.probe_type,
      context: check.context,
      error: result.error || "request failed",
    };
  }
  return {
    project: project.name,
    name: check.name || `HTTP check ${index + 1}`,
    url,
    method,
    status: failedAssertion ? "failed" : "passed",
    statusCode,
    contentType,
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    resourceChecks: [],
    assertions,
    responsePreview: compactText(result.text, 2000),
    adversarial: check.adversarial === true,
    probeType: check.probeType || check.probe_type,
    context: check.context,
    error: failedAssertion ? assertions.filter(assertion => assertion.status === "failed").map(assertion => assertion.error).filter(Boolean).join(" | ") : undefined,
  };
}

export async function runHttpVerification(workOrder: NormalizedTestAgentWorkOrder): Promise<HttpCheckResult[]> {
  if (!wantsHttp(workOrder)) return [];
  const results: HttpCheckResult[] = [];
  for (const project of workOrder.projects) {
    if (projectNeedsAutomaticPageProbe(workOrder, project)) {
      results.push(await verifyProjectPageHttp(workOrder, project));
    }
    for (let i = 0; i < project.httpChecks.length; i += 1) {
      results.push(await verifyExplicitHttpCheck(workOrder, project, project.httpChecks[i], i));
    }
    for (let i = 0; i < project.adversarialHttpChecks.length; i += 1) {
      results.push(await verifyExplicitHttpCheck(workOrder, project, project.adversarialHttpChecks[i], i));
    }
  }
  return results;
}

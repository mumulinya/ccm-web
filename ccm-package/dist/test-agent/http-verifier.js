"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHttpVerification = runHttpVerification;
const http_concurrency_1 = require("./http-concurrency");
const http_page_resources_1 = require("./http-page-resources");
const utils_1 = require("./utils");
const existing_session_1 = require("./browser/existing-session");
const shared_1 = require("./browser/shared");
function wantsHttp(workOrder) {
    return workOrder.projects.some(project => project.httpChecks.length > 0
        || project.adversarialHttpChecks.length > 0
        || projectNeedsAutomaticPageProbe(workOrder, project));
}
function projectNeedsAutomaticPageProbe(workOrder, project) {
    if (!project.targetUrl && !project.startupUrl)
        return false;
    const checks = (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria);
    return !checks.length || !checks.every(existing_session_1.browserCheckUsesExistingSession);
}
async function fetchWithTimeout(url, timeoutMs, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
        const response = await fetch(url, { ...init, signal: controller.signal, redirect: init.redirect || "follow" });
        const contentType = response.headers.get("content-type") || "";
        const text = contentType.includes("text/html") || contentType.includes("application/json") || contentType.includes("text/")
            ? await response.text().catch(() => "")
            : "";
        return { response, text, durationMs: Date.now() - started, error: "" };
    }
    catch (error) {
        return { response: null, text: "", durationMs: Date.now() - started, error: error.message || String(error) };
    }
    finally {
        clearTimeout(timer);
    }
}
function parseJson(text) {
    if (!text)
        return undefined;
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
function pathParts(path) {
    return String(path || "")
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".")
        .map(item => item.trim())
        .filter(Boolean);
}
function valueAtPath(input, path) {
    let current = input;
    for (const part of pathParts(path)) {
        if (current === undefined || current === null)
            return undefined;
        current = current[part];
    }
    return current;
}
function sameValue(actual, expected) {
    if (actual === expected)
        return true;
    if (typeof actual === "number" && typeof expected === "string" && actual === Number(expected))
        return true;
    if (typeof expected === "number" && typeof actual === "string" && Number(actual) === expected)
        return true;
    return JSON.stringify(actual) === JSON.stringify(expected);
}
function assertionResult(name, passed, detail = "", error = "") {
    return { name, status: passed ? "passed" : "failed", detail, ...(passed ? {} : { error }) };
}
function expectedStatuses(assertion) {
    const raw = assertion.status ?? assertion.statusCode ?? assertion.status_code ?? assertion.value;
    return Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : [Number(raw)].filter(Number.isFinite);
}
function runHttpAssertion(assertion, signal) {
    if (assertion.type === "status") {
        const expected = expectedStatuses(assertion);
        if (!expected.length)
            return assertionResult("http:status", false, "", "Status assertion requires status/statusCode/value.");
        const passed = signal.statusCode !== null && expected.includes(signal.statusCode);
        return assertionResult("http:status", passed, `expected=${expected.join("|")}; actual=${signal.statusCode}`, `Expected HTTP status ${expected.join(" or ")}, got ${signal.statusCode}.`);
    }
    if (assertion.type === "contentTypeIncludes") {
        const expected = String(assertion.text ?? assertion.value ?? "");
        if (!expected)
            return assertionResult("http:contentTypeIncludes", false, "", "contentTypeIncludes requires text/value.");
        const passed = signal.contentType.toLowerCase().includes(expected.toLowerCase());
        return assertionResult("http:contentTypeIncludes", passed, expected, `Expected content-type to include "${expected}", got "${signal.contentType}".`);
    }
    if (assertion.type === "textIncludes") {
        const expected = String(assertion.text ?? assertion.value ?? "");
        if (!expected)
            return assertionResult("http:textIncludes", false, "", "textIncludes requires text/value.");
        const passed = signal.text.includes(expected);
        return assertionResult("http:textIncludes", passed, expected, `Expected response text to include "${expected}".`);
    }
    if (assertion.type === "textNotIncludes") {
        const expected = String(assertion.text ?? assertion.value ?? "");
        if (!expected)
            return assertionResult("http:textNotIncludes", false, "", "textNotIncludes requires text/value.");
        const passed = !signal.text.includes(expected);
        return assertionResult("http:textNotIncludes", passed, expected, `Response text unexpectedly includes "${expected}".`);
    }
    if (assertion.type === "jsonPathEquals" || assertion.type === "jsonPathIncludes") {
        const path = assertion.path || "";
        if (!path)
            return assertionResult(`http:${assertion.type}`, false, "", `${assertion.type} requires path.`);
        if (signal.json === undefined)
            return assertionResult(`http:${assertion.type}`, false, path, "Response body is not valid JSON.");
        const actual = valueAtPath(signal.json, path);
        const expected = assertion.value;
        const passed = assertion.type === "jsonPathEquals"
            ? sameValue(actual, expected)
            : String(actual ?? "").includes(String(expected ?? ""));
        return assertionResult(`http:${assertion.type}`, passed, `${path}=${(0, utils_1.compactText)(JSON.stringify(actual), 500)}`, assertion.type === "jsonPathEquals"
            ? `Expected JSON path "${path}" to equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`
            : `Expected JSON path "${path}" to include ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
    }
    return assertionResult(`http:${assertion.type}`, false, "", `Unsupported HTTP assertion ${assertion.type}.`);
}
async function checkResource(pageUrl, candidate, timeoutMs) {
    const pageOrigin = new URL(pageUrl).origin;
    let currentUrl = candidate.url;
    let redirectCount = 0;
    let result = await fetchWithTimeout(currentUrl, timeoutMs, { redirect: "manual" });
    while (result.response && result.response.status >= 300 && result.response.status < 400) {
        const location = result.response.headers.get("location") || "";
        if (!location) {
            return {
                evidence: {
                    url: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.url),
                    finalUrl: (0, http_page_resources_1.redactHttpPageResourceUrl)(currentUrl),
                    status: "failed",
                    statusCode: result.response.status,
                    contentType: result.response.headers.get("content-type") || "",
                    kind: candidate.kind,
                    source: candidate.source,
                    discoveredFrom: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.discoveredFrom),
                    redirectCount,
                    expectedContentTypes: (0, http_page_resources_1.expectedHttpResourceContentTypes)(candidate.kind),
                    contentTypeMatched: (0, http_page_resources_1.httpResourceContentTypeMatches)(candidate.kind, result.response.headers.get("content-type") || ""),
                    error: `HTTP ${result.response.status} redirect is missing Location.`,
                },
                text: result.text,
            };
        }
        if (redirectCount >= 3) {
            return {
                evidence: {
                    url: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.url),
                    finalUrl: (0, http_page_resources_1.redactHttpPageResourceUrl)(currentUrl),
                    status: "failed",
                    statusCode: result.response.status,
                    contentType: result.response.headers.get("content-type") || "",
                    kind: candidate.kind,
                    source: candidate.source,
                    discoveredFrom: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.discoveredFrom),
                    redirectCount,
                    expectedContentTypes: (0, http_page_resources_1.expectedHttpResourceContentTypes)(candidate.kind),
                    contentTypeMatched: (0, http_page_resources_1.httpResourceContentTypeMatches)(candidate.kind, result.response.headers.get("content-type") || ""),
                    error: "Page resource exceeded the same-origin redirect limit.",
                },
                text: result.text,
            };
        }
        const nextUrl = new URL(location, currentUrl);
        if (!/^https?:$/.test(nextUrl.protocol) || nextUrl.origin !== pageOrigin) {
            return {
                evidence: {
                    url: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.url),
                    finalUrl: (0, http_page_resources_1.redactHttpPageResourceUrl)(currentUrl),
                    status: "failed",
                    statusCode: result.response.status,
                    contentType: result.response.headers.get("content-type") || "",
                    kind: candidate.kind,
                    source: candidate.source,
                    discoveredFrom: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.discoveredFrom),
                    redirectCount,
                    expectedContentTypes: (0, http_page_resources_1.expectedHttpResourceContentTypes)(candidate.kind),
                    contentTypeMatched: (0, http_page_resources_1.httpResourceContentTypeMatches)(candidate.kind, result.response.headers.get("content-type") || ""),
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
    const expectedContentTypes = (0, http_page_resources_1.expectedHttpResourceContentTypes)(candidate.kind);
    const contentTypeMatched = (0, http_page_resources_1.httpResourceContentTypeMatches)(candidate.kind, contentType);
    const base = {
        url: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.url),
        finalUrl: (0, http_page_resources_1.redactHttpPageResourceUrl)(currentUrl),
        statusCode,
        contentType,
        kind: candidate.kind,
        source: candidate.source,
        discoveredFrom: (0, http_page_resources_1.redactHttpPageResourceUrl)(candidate.discoveredFrom),
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
async function verifyProjectPageHttp(workOrder, project) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const url = project.targetUrl || project.startupUrl;
    if (!url) {
        const finishedAt = (0, utils_1.nowIso)();
        return { project: project.name, name: "Page HTTP probe", url: "", method: "GET", status: "skipped", statusCode: null, contentType: "", startedAt, finishedAt, durationMs: Date.now() - started, resourceChecks: [] };
    }
    const main = await fetchWithTimeout(url, workOrder.options.httpTimeoutMs);
    const statusCode = main.response?.status ?? null;
    const contentType = main.response?.headers.get("content-type") || "";
    if (!main.response) {
        const finishedAt = (0, utils_1.nowIso)();
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
    const resourceQueue = (0, http_page_resources_1.extractHtmlPageResources)(url, main.text, Math.max(maxResourceChecks * 3, maxResourceChecks));
    const resourceChecks = [];
    const selected = new Set();
    while (resourceQueue.length && resourceChecks.length < maxResourceChecks) {
        const candidate = resourceQueue.shift();
        if (selected.has(candidate.url))
            continue;
        selected.add(candidate.url);
        const checked = await checkResource(url, candidate, Math.min(workOrder.options.httpTimeoutMs, 8000));
        resourceChecks.push(checked.evidence);
        if (candidate.kind === "stylesheet" && checked.evidence.status === "passed" && checked.text) {
            const nested = (0, http_page_resources_1.extractCssPageResources)(url, candidate.url, checked.text, maxResourceChecks * 2)
                .filter(item => !selected.has(item.url));
            resourceQueue.unshift(...nested);
        }
    }
    const mainOk = statusCode !== null && statusCode < 400;
    const resourceFailed = workOrder.options.failOnHttpResourceError && resourceChecks.some(item => item.status === "failed" || item.status === "blocked");
    const resourceFailureDetail = (0, http_page_resources_1.httpPageResourceFailureDetail)(resourceChecks);
    const finishedAt = (0, utils_1.nowIso)();
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
        responsePreview: (0, utils_1.compactText)(main.text, 2000),
        error: mainOk ? (resourceFailed ? resourceFailureDetail || "One or more same-origin page resources failed." : undefined) : `HTTP ${statusCode}`,
    };
}
function requestInitFor(check, requestIndex) {
    const headers = {};
    const interpolatedHeaders = requestIndex === undefined
        ? check.headers || {}
        : (0, http_concurrency_1.interpolateHttpConcurrencyValue)(check.headers || {}, requestIndex);
    for (const [key, value] of Object.entries(interpolatedHeaders))
        headers[key] = String(value);
    let body;
    if (check.json !== undefined) {
        body = JSON.stringify(requestIndex === undefined
            ? check.json
            : (0, http_concurrency_1.interpolateHttpConcurrencyValue)(check.json, requestIndex));
        if (!Object.keys(headers).some(key => key.toLowerCase() === "content-type"))
            headers["content-type"] = "application/json";
    }
    else if (check.body !== undefined) {
        body = requestIndex === undefined
            ? check.body
            : (0, http_concurrency_1.interpolateHttpConcurrencyValue)(check.body, requestIndex);
    }
    return {
        method: (check.method || "GET").toUpperCase(),
        headers,
        body,
    };
}
async function verifyConcurrentHttpCheck(workOrder, project, check, index) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const concurrency = (0, http_concurrency_1.httpConcurrencySpecFor)(check);
    const aggregatePaths = (0, http_concurrency_1.concurrencyAggregatePaths)(concurrency.aggregateAssertions);
    const method = (check.method || "GET").toUpperCase();
    const timeoutMs = Number(check.timeoutMs || check.timeout_ms || workOrder.options.httpTimeoutMs);
    const requests = await Promise.all(Array.from({ length: concurrency.requests }, async (_, requestIndex) => {
        const requestStartedAt = (0, utils_1.nowIso)();
        const requestStarted = Date.now();
        const interpolatedUrl = (0, http_concurrency_1.interpolateHttpConcurrencyValue)(check.url, requestIndex);
        const url = (0, utils_1.resolveUrl)(project.targetUrl || project.startupUrl, interpolatedUrl);
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
            : [runHttpAssertion({ type: "status", status: statusCode !== null && statusCode < 400 ? statusCode : 200 }, { statusCode, contentType, text: result.text, json })];
        const failedAssertion = assertions.some(assertion => assertion.status === "failed");
        const requestFinishedAt = (0, utils_1.nowIso)();
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
            aggregateValues: (0, http_concurrency_1.buildHttpConcurrencyValueEvidence)(json, concurrency.aggregateAssertions),
            responsePreview: aggregatePaths.length
                ? `responseBytes=${Buffer.byteLength(result.text)}; aggregatePaths=${aggregatePaths.length}; raw aggregate values suppressed`
                : (0, utils_1.compactText)(result.text, 1200),
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
    const concurrencyEvidence = (0, http_concurrency_1.buildHttpConcurrencyEvidence)({
        requested: concurrency.requests,
        requests,
        aggregateAssertions: concurrency.aggregateAssertions,
    });
    const status = (0, http_concurrency_1.httpConcurrencyResultStatus)(concurrencyEvidence);
    const statusCodes = Array.from(new Set(requests.map(request => request.statusCode).filter((value) => value !== null)));
    const contentTypes = Array.from(new Set(requests.map(request => request.contentType).filter(Boolean)));
    const failedDetails = [
        ...requests.filter(request => request.status !== "passed").map(request => `request ${request.requestNumber}: ${request.error || request.status}`),
        ...concurrencyEvidence.aggregateAssertions
            .filter(assertion => assertion.status === "failed")
            .map(assertion => assertion.error || assertion.name),
    ];
    const finishedAt = (0, utils_1.nowIso)();
    return {
        project: project.name,
        name: check.name || `HTTP check ${index + 1}`,
        url: (0, utils_1.resolveUrl)(project.targetUrl || project.startupUrl, check.url),
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
async function verifyExplicitHttpCheck(workOrder, project, check, index) {
    if ((0, http_concurrency_1.httpConcurrencySpecFor)(check)) {
        return verifyConcurrentHttpCheck(workOrder, project, check, index);
    }
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const url = (0, utils_1.resolveUrl)(project.targetUrl || project.startupUrl, check.url);
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
    const finishedAt = (0, utils_1.nowIso)();
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
        responsePreview: (0, utils_1.compactText)(result.text, 2000),
        adversarial: check.adversarial === true,
        probeType: check.probeType || check.probe_type,
        context: check.context,
        error: failedAssertion ? assertions.filter(assertion => assertion.status === "failed").map(assertion => assertion.error).filter(Boolean).join(" | ") : undefined,
    };
}
async function runHttpVerification(workOrder) {
    if (!wantsHttp(workOrder))
        return [];
    const results = [];
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
//# sourceMappingURL=http-verifier.js.map
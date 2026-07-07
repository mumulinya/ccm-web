"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHttpVerification = runHttpVerification;
const utils_1 = require("./utils");
function wantsHttp(workOrder) {
    return workOrder.projects.some(project => !!project.targetUrl || !!project.startupUrl || project.httpChecks.length > 0 || project.adversarialHttpChecks.length > 0);
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
function extractResourceUrls(baseUrl, html, limit) {
    if (!html || limit <= 0)
        return [];
    const urls = new Set();
    const pattern = /\b(?:src|href)=["']([^"']+)["']/gi;
    let match;
    while ((match = pattern.exec(html)) && urls.size < limit) {
        const raw = String(match[1] || "").trim();
        if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript|data):/i.test(raw))
            continue;
        const resolved = (0, utils_1.resolveUrl)(baseUrl, raw);
        try {
            const base = new URL(baseUrl);
            const url = new URL(resolved);
            if (url.origin !== base.origin)
                continue;
            urls.add(url.toString());
        }
        catch { }
    }
    return Array.from(urls);
}
async function checkResource(url, timeoutMs) {
    const result = await fetchWithTimeout(url, timeoutMs);
    const statusCode = result.response?.status ?? null;
    const contentType = result.response?.headers.get("content-type") || "";
    if (!result.response)
        return { url, status: "blocked", statusCode, contentType, error: result.error || "request failed" };
    return {
        url,
        status: statusCode !== null && statusCode < 400 ? "passed" : "failed",
        statusCode,
        contentType,
        error: statusCode !== null && statusCode < 400 ? undefined : `HTTP ${statusCode}`,
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
        return { project: project.name, name: "Page HTTP probe", url, method: "GET", status: "blocked", statusCode, contentType, startedAt, finishedAt, durationMs: Date.now() - started, resourceChecks: [], responsePreview: "", error: main.error || "request failed" };
    }
    const resourceUrls = extractResourceUrls(url, main.text, workOrder.options.maxHttpResourceChecks);
    const resourceChecks = [];
    for (const resourceUrl of resourceUrls) {
        resourceChecks.push(await checkResource(resourceUrl, Math.min(workOrder.options.httpTimeoutMs, 8000)));
    }
    const mainOk = statusCode !== null && statusCode < 400;
    const resourceFailed = workOrder.options.failOnHttpResourceError && resourceChecks.some(item => item.status === "failed" || item.status === "blocked");
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
        responsePreview: (0, utils_1.compactText)(main.text, 2000),
        error: mainOk ? (resourceFailed ? "One or more same-origin page resources failed." : undefined) : `HTTP ${statusCode}`,
    };
}
function requestInitFor(check) {
    const headers = {};
    for (const [key, value] of Object.entries(check.headers || {}))
        headers[key] = String(value);
    let body;
    if (check.json !== undefined) {
        body = JSON.stringify(check.json);
        if (!Object.keys(headers).some(key => key.toLowerCase() === "content-type"))
            headers["content-type"] = "application/json";
    }
    else if (check.body !== undefined) {
        body = check.body;
    }
    return {
        method: (check.method || "GET").toUpperCase(),
        headers,
        body,
    };
}
async function verifyExplicitHttpCheck(workOrder, project, check, index) {
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
        error: failedAssertion ? assertions.filter(assertion => assertion.status === "failed").map(assertion => assertion.error).filter(Boolean).join(" | ") : undefined,
    };
}
async function runHttpVerification(workOrder) {
    if (!wantsHttp(workOrder))
        return [];
    const results = [];
    for (const project of workOrder.projects) {
        if (project.targetUrl || project.startupUrl)
            results.push(await verifyProjectPageHttp(workOrder, project));
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
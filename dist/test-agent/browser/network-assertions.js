"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBrowserNetworkLine = parseBrowserNetworkLine;
exports.browserNetworkAssertionHasExpectation = browserNetworkAssertionHasExpectation;
exports.browserNetworkAssertionIsNegative = browserNetworkAssertionIsNegative;
exports.browserNetworkAssertionSettleMs = browserNetworkAssertionSettleMs;
exports.browserNetworkAssertionDetail = browserNetworkAssertionDetail;
exports.findMatchingBrowserNetworkLine = findMatchingBrowserNetworkLine;
exports.waitForAbsentBrowserNetworkLine = waitForAbsentBrowserNetworkLine;
exports.waitForBrowserNetworkLine = waitForBrowserNetworkLine;
function text(value) {
    return String(value ?? "").trim();
}
function looksLikeUrl(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(value);
}
function extractUrl(value) {
    const match = String(value || "").match(/\bhttps?:\/\/[^\s)]+/i);
    return match ? match[0].replace(/[.,;]+$/, "") : "";
}
function extractMethod(value) {
    const match = String(value || "").match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i);
    return match ? match[1].toUpperCase() : "";
}
function extractStatus(value) {
    const match = String(value || "").match(/\b([1-5]\d\d)\b/);
    if (!match)
        return undefined;
    const status = Number(match[1]);
    return Number.isFinite(status) ? status : undefined;
}
function trimFailedUrl(value) {
    const match = value.match(/^(.*?):\s+[^/].*$/);
    return (match ? match[1] : value).trim();
}
function parseJsonObject(value) {
    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return undefined;
        const out = {};
        for (const [key, item] of Object.entries(parsed))
            out[String(key).toLowerCase()] = String(item);
        return out;
    }
    catch {
        return undefined;
    }
}
function networkDetailsParts(rest) {
    let headersText = "";
    let body = "";
    const bodyMarker = " body=";
    const headersPrefix = "headers=";
    const bodyIndex = rest.indexOf(bodyMarker);
    if (rest.startsWith(headersPrefix)) {
        headersText = (bodyIndex >= 0 ? rest.slice(headersPrefix.length, bodyIndex) : rest.slice(headersPrefix.length)).trim();
    }
    if (bodyIndex >= 0)
        body = rest.slice(bodyIndex + bodyMarker.length);
    else if (rest.startsWith("body="))
        body = rest.slice("body=".length);
    return { headersText, headers: headersText ? parseJsonObject(headersText) : undefined, body };
}
function parseBrowserNetworkLine(rawLine) {
    const line = text(rawLine);
    const details = line.match(/^request_details\s+(\S+)\s+(\S+)(?:\s+(.+))?$/i);
    if (details) {
        const metadata = networkDetailsParts(details[3] || "");
        return {
            kind: "request",
            line,
            method: details[1].toUpperCase(),
            url: details[2].trim(),
            ...(metadata.headersText ? { headersText: metadata.headersText } : {}),
            ...(metadata.headers ? { headers: metadata.headers } : {}),
            ...(metadata.body ? { body: metadata.body } : {}),
        };
    }
    const responseDetails = line.match(/^response_details\s+([1-5]\d\d)\s+(\S+)\s+(\S+)(?:\s+(.+))?$/i);
    if (responseDetails) {
        const metadata = networkDetailsParts(responseDetails[4] || "");
        return {
            kind: "response",
            line,
            status: Number(responseDetails[1]),
            resourceType: responseDetails[2],
            url: responseDetails[3].trim(),
            ...(metadata.headersText ? { headersText: metadata.headersText } : {}),
            ...(metadata.headers ? { headers: metadata.headers } : {}),
            ...(metadata.body ? { body: metadata.body } : {}),
        };
    }
    const request = line.match(/^request\s+(\S+)\s+(.+)$/i);
    if (request) {
        return {
            kind: "request",
            line,
            method: request[1].toUpperCase(),
            url: request[2].trim(),
        };
    }
    const failed = line.match(/^failed\s+(\S+)\s+(.+)$/i);
    if (failed) {
        return {
            kind: "failed",
            line,
            method: failed[1].toUpperCase(),
            url: trimFailedUrl(failed[2]),
        };
    }
    const response = line.match(/^response\s+([1-5]\d\d)(?:\s+(\S+))?(?:\s+(.+))?$/i);
    if (response) {
        const maybeType = response[2] || "";
        const maybeUrl = response[3] || "";
        const hasResourceType = Boolean(maybeType) && !looksLikeUrl(maybeType);
        return {
            kind: "response",
            line,
            status: Number(response[1]),
            resourceType: hasResourceType ? maybeType : undefined,
            url: hasResourceType ? maybeUrl.trim() : [maybeType, maybeUrl].filter(Boolean).join(" ").trim(),
        };
    }
    return {
        kind: "unknown",
        line,
        method: extractMethod(line) || undefined,
        status: extractStatus(line),
        url: extractUrl(line) || undefined,
    };
}
function statusValues(assertion) {
    const raw = assertion.status ?? assertion.statusCode ?? assertion.status_code;
    const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
    return values
        .map(value => Number(value))
        .filter(value => Number.isFinite(value));
}
function assertionMethod(assertion) {
    return text(assertion.method || assertion.httpMethod || assertion.http_method).toUpperCase();
}
function assertionResourceType(assertion) {
    return text(assertion.resourceType || assertion.resource_type).toLowerCase();
}
function assertionUrlFragment(assertion) {
    return text(assertion.urlIncludes || assertion.url_includes || assertion.url || assertion.text || assertion.value);
}
function assertionHeaderName(assertion) {
    return text(assertion.headerName || assertion.header_name).toLowerCase();
}
function assertionHeaderIncludes(assertion) {
    return text(assertion.headerIncludes || assertion.header_includes);
}
function assertionHeaderValueIncludes(assertion) {
    return text(assertion.headerValueIncludes || assertion.header_value_includes);
}
function assertionBodyIncludes(assertion) {
    return text(assertion.bodyIncludes || assertion.body_includes);
}
function assertionBodyJsonPath(assertion) {
    return text(assertion.bodyJsonPath || assertion.body_json_path);
}
function assertionBodyJsonEquals(assertion) {
    return assertion.bodyJsonEquals !== undefined ? assertion.bodyJsonEquals : assertion.body_json_equals;
}
function assertionBodyJsonIncludes(assertion) {
    return text(assertion.bodyJsonIncludes || assertion.body_json_includes);
}
function parseBodyJson(body) {
    if (!body)
        return { ok: false, value: undefined };
    try {
        return { ok: true, value: JSON.parse(body) };
    }
    catch {
        return { ok: false, value: undefined };
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
function valuesEqual(actual, expected) {
    if (actual === expected)
        return true;
    if (typeof actual === "number" && String(actual) === String(expected))
        return true;
    if (typeof actual === "boolean" && String(actual) === String(expected).toLowerCase())
        return true;
    try {
        return JSON.stringify(actual) === JSON.stringify(expected);
    }
    catch {
        return String(actual) === String(expected);
    }
}
function includesJsonValue(actual, expected) {
    if (actual === undefined)
        return false;
    if (typeof actual === "string")
        return actual.includes(expected);
    try {
        return JSON.stringify(actual).includes(expected);
    }
    catch {
        return String(actual).includes(expected);
    }
}
function hasStructuredFields(assertion) {
    return Boolean(assertionMethod(assertion)
        || assertionResourceType(assertion)
        || assertionUrlFragment(assertion)
        || assertionHeaderName(assertion)
        || assertionHeaderIncludes(assertion)
        || assertionHeaderValueIncludes(assertion)
        || assertionBodyIncludes(assertion)
        || assertionBodyJsonPath(assertion)
        || assertionBodyJsonIncludes(assertion)
        || assertionBodyJsonEquals(assertion) !== undefined
        || statusValues(assertion).length);
}
function kindForAssertion(assertion) {
    if (assertion.type === "networkRequest"
        || assertion.type === "networkRequestIncludes"
        || assertion.type === "networkRequestNot"
        || assertion.type === "networkRequestNotIncludes")
        return "request";
    if (assertion.type === "networkResponse"
        || assertion.type === "networkResponseIncludes"
        || assertion.type === "networkResponseNot"
        || assertion.type === "networkResponseNotIncludes")
        return "response";
    return "";
}
function matchesKind(parsed, expectedKind) {
    if (expectedKind === "request")
        return parsed.kind === "request" || parsed.kind === "failed" || parsed.kind === "unknown";
    if (expectedKind === "response")
        return parsed.kind === "response" || parsed.kind === "unknown";
    return false;
}
function matchesStructuredNetworkAssertion(parsed, assertion) {
    const expectedKind = kindForAssertion(assertion);
    if (!matchesKind(parsed, expectedKind))
        return false;
    const method = assertionMethod(assertion);
    if (method && String(parsed.method || "").toUpperCase() !== method)
        return false;
    const statuses = statusValues(assertion);
    if (statuses.length && !statuses.includes(Number(parsed.status)))
        return false;
    const resourceType = assertionResourceType(assertion);
    if (resourceType && String(parsed.resourceType || "").toLowerCase() !== resourceType)
        return false;
    const urlFragment = assertionUrlFragment(assertion);
    if (urlFragment) {
        const haystack = `${parsed.url || ""}\n${parsed.line}`;
        if (!haystack.includes(urlFragment))
            return false;
    }
    const headerIncludes = assertionHeaderIncludes(assertion);
    if (headerIncludes) {
        const headerHaystack = `${parsed.headersText || ""}\n${parsed.line}`.toLowerCase();
        if (!headerHaystack.includes(headerIncludes.toLowerCase()))
            return false;
    }
    const headerName = assertionHeaderName(assertion);
    const headerValueIncludes = assertionHeaderValueIncludes(assertion);
    if (headerName || headerValueIncludes) {
        const lineFallback = parsed.line.toLowerCase();
        const hasHeader = headerName
            ? parsed.headers
                ? Object.prototype.hasOwnProperty.call(parsed.headers, headerName)
                : lineFallback.includes(headerName)
            : true;
        if (!hasHeader)
            return false;
        const headerValue = headerName && parsed.headers ? parsed.headers[headerName] || "" : "";
        if (headerValueIncludes) {
            const valueNeedle = headerValueIncludes.toLowerCase();
            const valueHaystack = `${headerValue || ""}\n${parsed.headersText || ""}\n${parsed.line}`.toLowerCase();
            if (!valueHaystack.includes(valueNeedle))
                return false;
        }
    }
    const bodyIncludes = assertionBodyIncludes(assertion);
    if (bodyIncludes) {
        const bodyHaystack = `${parsed.body || ""}\n${parsed.line}`;
        if (!bodyHaystack.includes(bodyIncludes))
            return false;
    }
    const bodyJsonPath = assertionBodyJsonPath(assertion);
    const bodyJsonEquals = assertionBodyJsonEquals(assertion);
    const bodyJsonIncludes = assertionBodyJsonIncludes(assertion);
    if (bodyJsonPath || bodyJsonEquals !== undefined || bodyJsonIncludes) {
        const parsedJson = parseBodyJson(parsed.body || "");
        if (!parsedJson.ok)
            return false;
        const actual = bodyJsonPath ? valueAtPath(parsedJson.value, bodyJsonPath) : parsedJson.value;
        if (actual === undefined)
            return false;
        if (bodyJsonEquals !== undefined && !valuesEqual(actual, bodyJsonEquals))
            return false;
        if (bodyJsonIncludes && !includesJsonValue(actual, bodyJsonIncludes))
            return false;
    }
    return true;
}
function matchesLegacyNetworkIncludes(parsed, assertion) {
    const expected = text(assertion.text || assertion.value);
    if (!expected)
        return false;
    const expectedKind = kindForAssertion(assertion);
    if (!matchesKind(parsed, expectedKind))
        return false;
    return parsed.line.includes(expected);
}
function browserNetworkAssertionHasExpectation(assertion) {
    if (assertion.type === "networkRequestIncludes"
        || assertion.type === "networkResponseIncludes"
        || assertion.type === "networkRequestNotIncludes"
        || assertion.type === "networkResponseNotIncludes") {
        return Boolean(text(assertion.text || assertion.value));
    }
    if (assertion.type === "networkRequest"
        || assertion.type === "networkResponse"
        || assertion.type === "networkRequestNot"
        || assertion.type === "networkResponseNot") {
        return hasStructuredFields(assertion);
    }
    return false;
}
function browserNetworkAssertionIsNegative(assertion) {
    return assertion.type === "networkRequestNot"
        || assertion.type === "networkRequestNotIncludes"
        || assertion.type === "networkResponseNot"
        || assertion.type === "networkResponseNotIncludes";
}
function browserNetworkAssertionSettleMs(assertion, defaultTimeout, fallback = 500) {
    const raw = assertion.settleMs ?? assertion.settle_ms ?? assertion.timeoutMs ?? assertion.timeout_ms ?? fallback;
    const value = Number(raw);
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(0, Math.min(value, Math.max(1, Number(defaultTimeout || fallback))));
}
function browserNetworkAssertionDetail(assertion) {
    if (assertion.type === "networkRequestIncludes"
        || assertion.type === "networkResponseIncludes"
        || assertion.type === "networkRequestNotIncludes"
        || assertion.type === "networkResponseNotIncludes") {
        return text(assertion.text || assertion.value);
    }
    const parts = [];
    const method = assertionMethod(assertion);
    const statuses = statusValues(assertion);
    const resourceType = assertionResourceType(assertion);
    const urlFragment = assertionUrlFragment(assertion);
    const headerName = assertionHeaderName(assertion);
    const headerIncludes = assertionHeaderIncludes(assertion);
    const headerValueIncludes = assertionHeaderValueIncludes(assertion);
    const bodyIncludes = assertionBodyIncludes(assertion);
    const bodyJsonPath = assertionBodyJsonPath(assertion);
    const bodyJsonEquals = assertionBodyJsonEquals(assertion);
    const bodyJsonIncludes = assertionBodyJsonIncludes(assertion);
    if (method)
        parts.push(`method=${method}`);
    if (statuses.length)
        parts.push(`status=${statuses.join("|")}`);
    if (resourceType)
        parts.push(`resourceType=${resourceType}`);
    if (urlFragment)
        parts.push(`urlIncludes=${urlFragment}`);
    if (headerName)
        parts.push(`header=${headerName}`);
    if (headerIncludes)
        parts.push(`headerIncludes=${headerIncludes}`);
    if (headerValueIncludes)
        parts.push(`headerValueIncludes=${headerValueIncludes}`);
    if (bodyIncludes)
        parts.push(`bodyIncludes=${bodyIncludes}`);
    if (bodyJsonPath)
        parts.push(`bodyJsonPath=${bodyJsonPath}`);
    if (bodyJsonEquals !== undefined)
        parts.push(`bodyJsonEquals=${JSON.stringify(bodyJsonEquals)}`);
    if (bodyJsonIncludes)
        parts.push(`bodyJsonIncludes=${bodyJsonIncludes}`);
    if (!parts.length) {
        const expected = text(assertion.text || assertion.value);
        if (expected)
            parts.push(expected);
    }
    return parts.join(" ");
}
function findMatchingBrowserNetworkLine(lines, assertion) {
    for (const line of lines) {
        const parsed = parseBrowserNetworkLine(line);
        const matched = assertion.type === "networkRequestIncludes"
            || assertion.type === "networkResponseIncludes"
            || assertion.type === "networkRequestNotIncludes"
            || assertion.type === "networkResponseNotIncludes"
            ? matchesLegacyNetworkIncludes(parsed, assertion)
            : matchesStructuredNetworkAssertion(parsed, assertion);
        if (matched)
            return parsed.line;
    }
    return "";
}
async function waitForAbsentBrowserNetworkLine(lines, assertion, settleMs) {
    const deadline = Date.now() + Math.max(0, settleMs);
    while (true) {
        const matched = findMatchingBrowserNetworkLine(lines, assertion);
        if (matched)
            return matched;
        const remaining = deadline - Date.now();
        if (remaining <= 0)
            break;
        await new Promise(resolve => setTimeout(resolve, Math.min(100, remaining)));
    }
    return "";
}
async function waitForBrowserNetworkLine(lines, assertion, timeout) {
    const deadline = Date.now() + Math.max(1, timeout);
    while (Date.now() <= deadline) {
        const matched = findMatchingBrowserNetworkLine(lines, assertion);
        if (matched)
            return matched;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return "";
}
//# sourceMappingURL=network-assertions.js.map
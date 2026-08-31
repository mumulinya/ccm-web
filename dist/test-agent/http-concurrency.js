"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_HTTP_CONCURRENT_REQUESTS = exports.MIN_HTTP_CONCURRENT_REQUESTS = void 0;
exports.httpConcurrencyValueAtPath = httpConcurrencyValueAtPath;
exports.concurrencyAggregatePaths = concurrencyAggregatePaths;
exports.buildHttpConcurrencyValueEvidence = buildHttpConcurrencyValueEvidence;
exports.interpolateHttpConcurrencyValue = interpolateHttpConcurrencyValue;
exports.httpConcurrencySpecFor = httpConcurrencySpecFor;
exports.evaluateHttpConcurrencyAssertions = evaluateHttpConcurrencyAssertions;
exports.buildHttpConcurrencyEvidence = buildHttpConcurrencyEvidence;
exports.httpConcurrencyResultStatus = httpConcurrencyResultStatus;
exports.buildHttpConcurrencySummary = buildHttpConcurrencySummary;
exports.formatHttpConcurrencySummaryLine = formatHttpConcurrencySummaryLine;
exports.httpConcurrencyEvidenceErrors = httpConcurrencyEvidenceErrors;
exports.httpConcurrencySummaryErrors = httpConcurrencySummaryErrors;
const crypto = __importStar(require("crypto"));
exports.MIN_HTTP_CONCURRENT_REQUESTS = 2;
exports.MAX_HTTP_CONCURRENT_REQUESTS = 50;
const HTTP_CONCURRENCY_ASSERTION_TYPES = new Set([
    "responseCount",
    "statusCount",
    "jsonPathUniqueCount",
    "jsonPathAllEqual",
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
function canonicalJson(value) {
    if (Array.isArray(value))
        return value.map(canonicalJson);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value)
        .sort()
        .reduce((out, key) => {
        out[key] = canonicalJson(value[key]);
        return out;
    }, {});
}
function sameJson(left, right) {
    return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}
function pathParts(path) {
    return String(path || "")
        .replace(/\[(\d+)\]/g, ".$1")
        .split(".")
        .map(item => item.trim())
        .filter(Boolean);
}
function httpConcurrencyValueAtPath(input, path) {
    let current = input;
    for (const part of pathParts(path)) {
        if (current === undefined || current === null)
            return undefined;
        current = current[part];
    }
    return current;
}
function valueEvidence(path, value) {
    if (value === undefined)
        return { path, present: false };
    const serialized = JSON.stringify(canonicalJson(value));
    return {
        path,
        present: true,
        sha256: crypto.createHash("sha256").update(serialized).digest("hex"),
        serializedBytes: Buffer.byteLength(serialized),
    };
}
function concurrencyAggregatePaths(assertions = []) {
    return Array.from(new Set(assertions
        .filter(assertion => assertion.type === "jsonPathUniqueCount" || assertion.type === "jsonPathAllEqual")
        .map(assertion => String(assertion.path || "").trim())
        .filter(Boolean)));
}
function buildHttpConcurrencyValueEvidence(json, assertions = []) {
    return concurrencyAggregatePaths(assertions).map(path => valueEvidence(path, httpConcurrencyValueAtPath(json, path)));
}
function interpolateHttpConcurrencyValue(value, requestIndex) {
    if (typeof value === "string") {
        return value
            .replace(/\{\{\s*requestIndex\s*\}\}/g, String(requestIndex))
            .replace(/\{\{\s*requestNumber\s*\}\}/g, String(requestIndex + 1));
    }
    if (Array.isArray(value))
        return value.map(item => interpolateHttpConcurrencyValue(item, requestIndex));
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.entries(value)
        .map(([key, item]) => [key, interpolateHttpConcurrencyValue(item, requestIndex)]));
}
function httpConcurrencySpecFor(check) {
    if (typeof check.concurrency === "number") {
        return { requests: check.concurrency, aggregateAssertions: [] };
    }
    if (!check.concurrency || typeof check.concurrency !== "object")
        return undefined;
    return {
        requests: Number(check.concurrency.requests || 0),
        aggregateAssertions: Array.isArray(check.concurrency.aggregateAssertions)
            ? check.concurrency.aggregateAssertions
            : [],
    };
}
function assertionResult(name, status, detail = "", error = "") {
    return {
        name,
        status,
        ...(detail ? { detail } : {}),
        ...(status === "failed" && error ? { error } : {}),
    };
}
function expectedCount(assertion) {
    const exact = assertion.count ?? assertion.expectedCount ?? assertion.expected_count;
    const min = assertion.minCount ?? assertion.min_count;
    const max = assertion.maxCount ?? assertion.max_count;
    return {
        exact: exact === undefined ? undefined : Number(exact),
        min: min === undefined ? undefined : Number(min),
        max: max === undefined ? undefined : Number(max),
    };
}
function aliasNumberErrors(values, label) {
    const present = values.filter(item => item.value !== undefined);
    const errors = [];
    for (const item of present) {
        if (!Number.isInteger(item.value) || item.value < 0) {
            errors.push(`${label}.${item.name} must be a non-negative integer.`);
        }
    }
    const distinct = new Set(present.map(item => item.value));
    if (distinct.size > 1)
        errors.push(`${label} contains inconsistent numeric aliases.`);
    return errors;
}
function assertionSpecErrors(assertion, label) {
    const errors = [];
    if (!assertion || typeof assertion !== "object")
        return [`${label} must be an object.`];
    const type = String(assertion.type || "");
    if (!HTTP_CONCURRENCY_ASSERTION_TYPES.has(type)) {
        errors.push(`${label}.type is unsupported.`);
        return errors;
    }
    errors.push(...aliasNumberErrors([
        { name: "count", value: assertion.count },
        { name: "expectedCount", value: assertion.expectedCount },
        { name: "expected_count", value: assertion.expected_count },
    ], `${label}.count`));
    errors.push(...aliasNumberErrors([
        { name: "minCount", value: assertion.minCount },
        { name: "min_count", value: assertion.min_count },
    ], `${label}.minCount`));
    errors.push(...aliasNumberErrors([
        { name: "maxCount", value: assertion.maxCount },
        { name: "max_count", value: assertion.max_count },
    ], `${label}.maxCount`));
    const expected = expectedCount(assertion);
    if (type !== "jsonPathAllEqual" && expected.exact === undefined && expected.min === undefined && expected.max === undefined) {
        errors.push(`${label} requires count, minCount, or maxCount.`);
    }
    if (expected.min !== undefined && expected.max !== undefined && expected.min > expected.max) {
        errors.push(`${label}.minCount cannot exceed maxCount.`);
    }
    if (type === "statusCount") {
        const statusAliases = [
            { name: "status", value: assertion.status },
            { name: "statusCode", value: assertion.statusCode },
            { name: "status_code", value: assertion.status_code },
        ].filter(item => item.value !== undefined);
        if (!statusAliases.length) {
            errors.push(`${label} requires an HTTP status.`);
        }
        else {
            if (statusAliases.some(item => !Number.isInteger(item.value) || Number(item.value) < 100 || Number(item.value) > 599)) {
                errors.push(`${label} requires an HTTP status from 100 to 599.`);
            }
            if (new Set(statusAliases.map(item => item.value)).size > 1) {
                errors.push(`${label} contains inconsistent status aliases.`);
            }
        }
    }
    if ((type === "jsonPathUniqueCount" || type === "jsonPathAllEqual") && !String(assertion.path || "").trim()) {
        errors.push(`${label}.path is required.`);
    }
    return errors;
}
function countResult(name, actual, assertion, detailPrefix = "") {
    const expected = expectedCount(assertion);
    const passed = expected.exact !== undefined
        ? actual === expected.exact
        : (expected.min === undefined || actual >= expected.min)
            && (expected.max === undefined || actual <= expected.max);
    const expectation = expected.exact !== undefined
        ? `count=${expected.exact}`
        : [`min=${expected.min ?? "none"}`, `max=${expected.max ?? "none"}`].join("; ");
    const detail = [detailPrefix, expectation, `actual=${actual}`].filter(Boolean).join("; ");
    return assertionResult(name, passed ? "passed" : "failed", detail, `Concurrency assertion expected ${expectation}, got ${actual}.`);
}
function evaluateHttpConcurrencyAssertions(assertions, requests) {
    const blocked = requests.filter(request => request.status === "blocked").length;
    if (blocked) {
        return assertions.map(assertion => assertionResult(`http:concurrency:${assertion.type}`, "skipped", `blockedRequests=${blocked}`));
    }
    return assertions.map(assertion => {
        if (assertion.type === "responseCount") {
            return countResult("http:concurrency:responseCount", requests.filter(request => request.status !== "blocked").length, assertion);
        }
        if (assertion.type === "statusCount") {
            const status = Number(assertion.status ?? assertion.statusCode ?? assertion.status_code);
            const actual = requests.filter(request => request.statusCode === status).length;
            return countResult("http:concurrency:statusCount", actual, assertion, `status=${status}`);
        }
        const path = String(assertion.path || "").trim();
        const values = requests.map(request => request.aggregateValues.find(value => value.path === path));
        const missing = values.filter(value => !value?.present).length;
        const digests = values.filter(value => value?.present && value.sha256).map(value => String(value.sha256));
        const unique = new Set(digests).size;
        if (assertion.type === "jsonPathUniqueCount") {
            if (missing) {
                return assertionResult("http:concurrency:jsonPathUniqueCount", "failed", `path=${path}; missing=${missing}; unique=${unique}`, `JSON path ${JSON.stringify(path)} was missing from ${missing} concurrent response(s).`);
            }
            return countResult("http:concurrency:jsonPathUniqueCount", unique, assertion, `path=${path}; missing=0`);
        }
        if (assertion.type === "jsonPathAllEqual") {
            const passed = missing === 0 && unique <= 1 && digests.length === requests.length;
            return assertionResult("http:concurrency:jsonPathAllEqual", passed ? "passed" : "failed", `path=${path}; missing=${missing}; unique=${unique}`, `Expected JSON path ${JSON.stringify(path)} to be present and equal across all concurrent responses.`);
        }
        return assertionResult(`http:concurrency:${String(assertion.type || "unknown")}`, "failed", "", `Unsupported HTTP concurrency assertion ${String(assertion.type || "(missing)")}.`);
    });
}
function maxInFlight(requests) {
    const events = requests.flatMap(request => [
        { time: Date.parse(request.startedAt), delta: 1 },
        { time: Date.parse(request.finishedAt), delta: -1 },
    ]).filter(event => Number.isFinite(event.time))
        .sort((left, right) => left.time - right.time || right.delta - left.delta);
    let current = 0;
    let maximum = 0;
    for (const event of events) {
        current += event.delta;
        maximum = Math.max(maximum, current);
    }
    return maximum;
}
function buildHttpConcurrencyEvidence(input) {
    const starts = input.requests.map(request => Date.parse(request.startedAt)).filter(Number.isFinite);
    const maximum = maxInFlight(input.requests);
    const overlapObserved = maximum >= Math.min(exports.MIN_HTTP_CONCURRENT_REQUESTS, input.requested);
    const overlapAssertion = assertionResult("http:concurrency:overlap", overlapObserved ? "passed" : "failed", `requested=${input.requested}; maxInFlight=${maximum}`, "Concurrent HTTP requests did not overlap in flight.");
    return {
        requested: input.requested,
        completed: input.requests.filter(request => request.status !== "blocked").length,
        passed: input.requests.filter(request => request.status === "passed").length,
        failed: input.requests.filter(request => request.status === "failed").length,
        blocked: input.requests.filter(request => request.status === "blocked").length,
        launchSpreadMs: starts.length ? Math.max(...starts) - Math.min(...starts) : 0,
        maxInFlight: maximum,
        overlapObserved,
        assertionSpecs: input.aggregateAssertions,
        aggregateAssertions: [
            overlapAssertion,
            ...evaluateHttpConcurrencyAssertions(input.aggregateAssertions, input.requests),
        ],
        requests: input.requests,
    };
}
function httpConcurrencyResultStatus(evidence) {
    if (!evidence || !Array.isArray(evidence.requests) || !Array.isArray(evidence.aggregateAssertions)) {
        return "failed";
    }
    if (evidence.requests.some(request => request?.status === "failed"))
        return "failed";
    if (evidence.requests.some(request => request?.status === "blocked"))
        return "blocked";
    if (evidence.requests.length !== evidence.requested
        || evidence.requests.some(request => request?.status !== "passed"))
        return "failed";
    if (!evidence.aggregateAssertions.length
        || evidence.aggregateAssertions.some(assertion => assertion?.status !== "passed"))
        return "failed";
    return "passed";
}
function buildHttpConcurrencySummary(httpResults = []) {
    const items = httpResults.flatMap(result => result.concurrency ? [{
            project: result.project,
            name: result.name || result.url,
            status: httpConcurrencyResultStatus(result.concurrency),
            ...(result.probeType ? { probeType: result.probeType } : {}),
            requested: result.concurrency.requested,
            completed: result.concurrency.completed,
            passed: result.concurrency.passed,
            failed: result.concurrency.failed,
            blocked: result.concurrency.blocked,
            launchSpreadMs: result.concurrency.launchSpreadMs,
            maxInFlight: result.concurrency.maxInFlight,
            overlapObserved: result.concurrency.overlapObserved,
            aggregatePassed: result.concurrency.aggregateAssertions.filter(item => item.status === "passed").length,
            aggregateFailed: result.concurrency.aggregateAssertions.filter(item => item.status === "failed").length,
            aggregateSkipped: result.concurrency.aggregateAssertions.filter(item => item.status === "skipped").length,
        }] : []);
    return {
        checks: items.length,
        requests: items.reduce((sum, item) => sum + item.requested, 0),
        completed: items.reduce((sum, item) => sum + item.completed, 0),
        passed: items.reduce((sum, item) => sum + item.passed, 0),
        failed: items.reduce((sum, item) => sum + item.failed, 0),
        blocked: items.reduce((sum, item) => sum + item.blocked, 0),
        maxInFlight: items.reduce((maximum, item) => Math.max(maximum, item.maxInFlight), 0),
        items,
    };
}
function formatHttpConcurrencySummaryLine(summary) {
    return [
        `checks=${summary?.checks || 0}`,
        `requests=${summary?.requests || 0}`,
        `completed=${summary?.completed || 0}`,
        `passed=${summary?.passed || 0}`,
        `failed=${summary?.failed || 0}`,
        `blocked=${summary?.blocked || 0}`,
        `maxInFlight=${summary?.maxInFlight || 0}`,
    ].join("; ");
}
function httpConcurrencyEvidenceErrors(evidence, label = "HTTP concurrency evidence") {
    if (!evidence)
        return [`${label} is missing.`];
    const errors = [];
    const requests = Array.isArray(evidence.requests) ? evidence.requests : [];
    const assertionSpecs = Array.isArray(evidence.assertionSpecs) ? evidence.assertionSpecs : [];
    if (!Array.isArray(evidence.requests))
        errors.push(`${label}.requests must be an array.`);
    if (!Array.isArray(evidence.assertionSpecs))
        errors.push(`${label}.assertionSpecs must be an array.`);
    if (!Array.isArray(evidence.aggregateAssertions))
        errors.push(`${label}.aggregateAssertions must be an array.`);
    if (!Number.isInteger(evidence.requested)
        || evidence.requested < exports.MIN_HTTP_CONCURRENT_REQUESTS
        || evidence.requested > exports.MAX_HTTP_CONCURRENT_REQUESTS) {
        errors.push(`${label}.requested is outside the supported concurrency range.`);
    }
    if (evidence.requested !== requests.length) {
        errors.push(`${label}.requested must equal the number of request evidence entries.`);
    }
    for (const [index, assertion] of assertionSpecs.entries()) {
        errors.push(...assertionSpecErrors(assertion, `${label}.assertionSpecs[${index}]`));
    }
    const expectedPaths = concurrencyAggregatePaths(assertionSpecs).sort();
    for (const [index, request] of requests.entries()) {
        const requestLabel = `${label}.requests[${index}]`;
        if (!request || typeof request !== "object") {
            errors.push(`${requestLabel} must be an object.`);
            continue;
        }
        if (!Number.isInteger(request.requestIndex) || request.requestIndex < 0) {
            errors.push(`${requestLabel}.requestIndex must be a non-negative integer.`);
        }
        if (request.requestNumber !== request.requestIndex + 1) {
            errors.push(`${requestLabel}.requestNumber must equal requestIndex + 1.`);
        }
        if (!String(request.url || "").trim())
            errors.push(`${requestLabel}.url is required.`);
        if (!String(request.method || "").trim())
            errors.push(`${requestLabel}.method is required.`);
        const started = Date.parse(request.startedAt);
        const finished = Date.parse(request.finishedAt);
        if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
            errors.push(`${requestLabel} contains an invalid request time window.`);
        }
        if (!Number.isFinite(request.durationMs) || request.durationMs < 0) {
            errors.push(`${requestLabel}.durationMs must be non-negative.`);
        }
        const hasResponse = request.statusCode !== null;
        if (hasResponse && (!Number.isInteger(request.statusCode) || Number(request.statusCode) < 100 || Number(request.statusCode) > 599)) {
            errors.push(`${requestLabel}.statusCode must be null or an HTTP status from 100 to 599.`);
        }
        const assertions = Array.isArray(request.assertions) ? request.assertions : [];
        if (!Array.isArray(request.assertions))
            errors.push(`${requestLabel}.assertions must be an array.`);
        if (request.status === "passed" && (!hasResponse || !assertions.length || assertions.some(assertion => assertion?.status !== "passed"))) {
            errors.push(`${requestLabel} is passed without a response and fully passing assertions.`);
        }
        if (request.status === "failed"
            && (!hasResponse || (!assertions.some(assertion => assertion?.status === "failed") && !String(request.error || "").trim()))) {
            errors.push(`${requestLabel} is failed without a response, failed assertion, or error.`);
        }
        if (request.status === "blocked" && (hasResponse || !String(request.error || "").trim())) {
            errors.push(`${requestLabel} is blocked but contains an HTTP response or no blocking error.`);
        }
        if (!["passed", "failed", "blocked"].includes(String(request.status || ""))) {
            errors.push(`${requestLabel}.status is unsupported.`);
        }
        const aggregateValues = Array.isArray(request.aggregateValues) ? request.aggregateValues : [];
        if (!Array.isArray(request.aggregateValues))
            errors.push(`${requestLabel}.aggregateValues must be an array.`);
        const actualPaths = aggregateValues.map(value => String(value?.path || ""));
        if (new Set(actualPaths).size !== actualPaths.length) {
            errors.push(`${requestLabel}.aggregateValues contains duplicate paths.`);
        }
        if (!sameJson([...actualPaths].sort(), expectedPaths)) {
            errors.push(`${requestLabel}.aggregateValues does not match the aggregate assertion paths.`);
        }
        for (const [valueIndex, value] of aggregateValues.entries()) {
            const valueLabel = `${requestLabel}.aggregateValues[${valueIndex}]`;
            if (!value || typeof value !== "object" || !String(value.path || "").trim()) {
                errors.push(`${valueLabel} must include a path.`);
                continue;
            }
            if (value.present) {
                if (!SHA256_PATTERN.test(String(value.sha256 || ""))) {
                    errors.push(`${valueLabel}.sha256 must be a valid SHA-256 digest when present is true.`);
                }
                if (!Number.isInteger(value.serializedBytes) || Number(value.serializedBytes) <= 0) {
                    errors.push(`${valueLabel}.serializedBytes must be a positive integer when present is true.`);
                }
            }
            else if (value.sha256 !== undefined || value.serializedBytes !== undefined) {
                errors.push(`${valueLabel} must omit digest metadata when present is false.`);
            }
        }
    }
    const indexes = requests.map(request => request?.requestIndex);
    if (new Set(indexes).size !== indexes.length)
        errors.push(`${label}.requests contains duplicate requestIndex values.`);
    if (Number.isInteger(evidence.requested) && evidence.requested >= 0) {
        const expectedIndexes = Array.from({ length: evidence.requested }, (_, index) => index);
        const actualIndexes = [...indexes].sort((left, right) => Number(left) - Number(right));
        if (!sameJson(actualIndexes, expectedIndexes)) {
            errors.push(`${label}.requestIndex values must cover exactly 0 through requested - 1.`);
        }
    }
    try {
        const expected = buildHttpConcurrencyEvidence({
            requested: evidence.requested,
            requests,
            aggregateAssertions: assertionSpecs,
        });
        if (!sameJson(evidence, expected))
            errors.push(`${label} does not match its request evidence.`);
    }
    catch (error) {
        errors.push(`${label} could not be rebuilt from request evidence: ${error.message || String(error)}.`);
    }
    return errors;
}
function httpConcurrencySummaryErrors(summary, httpResults, label = "HTTP concurrency summary") {
    if (!summary)
        return [`${label} is missing.`];
    return sameJson(summary, buildHttpConcurrencySummary(httpResults))
        ? []
        : [`${label} does not match HTTP concurrency evidence.`];
}
//# sourceMappingURL=http-concurrency.js.map
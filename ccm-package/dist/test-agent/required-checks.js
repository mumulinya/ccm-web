"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequiredCheckCoverage = buildRequiredCheckCoverage;
function norm(value) {
    return String(value || "").toLowerCase().replace(/[\s:-]+/g, "_");
}
function evidence(label, status, detail = "") {
    return `${label}: ${status}${detail ? ` - ${detail}` : ""}`;
}
function commandMatches(command, patterns) {
    const text = `${command.command}\n${command.output}`.toLowerCase();
    return patterns.some(pattern => pattern.test(text));
}
function commandSignal(commands, patterns, missingReason) {
    const matches = commands.filter(command => commandMatches(command, patterns));
    if (!matches.length)
        return { status: "unknown", evidence: [], missingReason };
    const failed = matches.filter(command => command.status === "failed" || command.status === "timed_out" || command.status === "blocked");
    if (failed.length) {
        return {
            status: "not_verified",
            evidence: failed.map(command => evidence(command.command, command.status, command.error || `exit=${command.exitCode}`)),
        };
    }
    const passed = matches.filter(command => command.status === "passed");
    if (passed.length) {
        return {
            status: "verified",
            evidence: passed.map(command => evidence(command.command, command.status, `exit=${command.exitCode}`)),
        };
    }
    return { status: "unknown", evidence: matches.map(command => evidence(command.command, command.status)), missingReason };
}
function anyCommandSignal(commands) {
    if (!commands.length)
        return { status: "unknown", evidence: [], missingReason: "No verification command results were recorded." };
    const failed = commands.filter(command => command.status === "failed" || command.status === "timed_out" || command.status === "blocked");
    if (failed.length)
        return { status: "not_verified", evidence: failed.map(command => evidence(command.command, command.status, command.error || `exit=${command.exitCode}`)) };
    const passed = commands.filter(command => command.status === "passed");
    if (passed.length)
        return { status: "verified", evidence: passed.map(command => evidence(command.command, command.status, `exit=${command.exitCode}`)) };
    return { status: "unknown", evidence: commands.map(command => evidence(command.command, command.status)), missingReason: "Commands ran but did not produce passing evidence." };
}
function httpSignal(httpResults, predicate, missingReason) {
    const matches = httpResults.filter(predicate);
    if (!matches.length)
        return { status: "unknown", evidence: [], missingReason };
    const failed = matches.filter(item => item.status === "failed" || item.status === "blocked");
    if (failed.length)
        return { status: "not_verified", evidence: failed.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, item.error || `status=${item.statusCode}`)) };
    const passed = matches.filter(item => item.status === "passed");
    if (passed.length)
        return { status: "verified", evidence: passed.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, `status=${item.statusCode}`)) };
    return { status: "unknown", evidence: matches.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status)), missingReason };
}
function browserSignal(browserResults, missingReason) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason };
    const failed = browserResults.filter(item => item.status === "failed" || item.status === "blocked");
    if (failed.length)
        return { status: "not_verified", evidence: failed.map(item => evidence(item.name, item.status, item.error || item.url)) };
    const passed = browserResults.filter(item => item.status === "passed");
    if (passed.length)
        return { status: "verified", evidence: passed.map(item => evidence(item.name, item.status, item.url)) };
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason };
}
function adversarialSignal(httpResults, browserResults, missingReason) {
    const http = httpResults.filter(item => item.adversarial === true);
    const browser = browserResults.filter(item => item.adversarial === true);
    const failedHttp = http.filter(item => item.status === "failed" || item.status === "blocked");
    const failedBrowser = browser.filter(item => item.status === "failed" || item.status === "blocked");
    if (failedHttp.length || failedBrowser.length) {
        return {
            status: "not_verified",
            evidence: [
                ...failedHttp.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, item.error || `status=${item.statusCode}`)),
                ...failedBrowser.map(item => evidence(item.name, item.status, item.error || item.url)),
            ],
        };
    }
    const passed = [
        ...http.filter(item => item.status === "passed").map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, item.probeType ? `probe=${item.probeType}` : `status=${item.statusCode}`)),
        ...browser.filter(item => item.status === "passed").map(item => evidence(item.name, item.status, item.probeType ? `probe=${item.probeType}` : item.url)),
    ];
    if (passed.length)
        return { status: "verified", evidence: passed };
    return { status: "unknown", evidence: [], missingReason };
}
function consoleSignal(browserResults) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for console checks." };
    const bad = browserResults.filter(item => item.consoleErrors.length > 0 || item.pageErrors.length > 0 || item.steps.some(step => /console|pageErrors/i.test(step.name) && step.status === "failed"));
    if (bad.length)
        return { status: "not_verified", evidence: bad.map(item => evidence(item.name, item.status, [...item.consoleErrors, ...item.pageErrors, item.error || ""].filter(Boolean).join(" | "))) };
    const passed = browserResults.filter(item => item.status === "passed");
    if (passed.length)
        return { status: "verified", evidence: passed.map(item => evidence(item.name, item.status, "no console/page errors recorded")) };
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: "Browser checks did not pass, so console cleanliness is not proven." };
}
function networkSignal(browserResults, httpResults) {
    const browserFailures = browserResults.filter(item => (item.networkErrors || []).length > 0 || item.steps.some(step => /network/i.test(step.name) && step.status === "failed"));
    const httpFailures = httpResults.filter(item => item.status === "failed" || item.status === "blocked" || item.resourceChecks.some(resource => resource.status === "failed" || resource.status === "blocked"));
    if (browserFailures.length || httpFailures.length) {
        return {
            status: "not_verified",
            evidence: [
                ...browserFailures.map(item => evidence(item.name, item.status, (item.networkErrors || []).join(" | "))),
                ...httpFailures.map(item => evidence(item.name || item.url, item.status, item.error || `status=${item.statusCode}`)),
            ],
        };
    }
    const positive = [
        ...browserResults.filter(item => item.status === "passed").map(item => evidence(item.name, item.status, "no browser network errors recorded")),
        ...httpResults.filter(item => item.status === "passed").map(item => evidence(item.name || item.url, item.status, `status=${item.statusCode}`)),
    ];
    if (positive.length)
        return { status: "verified", evidence: positive };
    return { status: "unknown", evidence: [], missingReason: "No browser or HTTP network evidence was recorded." };
}
function screenshotSignal(browserResults) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for screenshot checks." };
    const screenshotFailures = browserResults.filter(item => item.screenshots.some(path => /screenshot failed/i.test(path)));
    if (screenshotFailures.length)
        return { status: "not_verified", evidence: screenshotFailures.map(item => evidence(item.name, item.status, item.screenshots.join(" | "))) };
    const screenshots = browserResults.flatMap(item => item.screenshots.map(path => evidence(item.name, item.status, path)));
    if (screenshots.length)
        return { status: "verified", evidence: screenshots };
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: "Browser checks ran but no screenshot artifact was recorded." };
}
function browserSnapshotSignal(browserResults) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for browser snapshot checks." };
    const snapshots = browserResults.flatMap(item => (item.pageSnapshots || []).map(path => evidence(item.name, item.status, path)));
    if (snapshots.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
        return { status: "not_verified", evidence: snapshots };
    }
    if (snapshots.length)
        return { status: "verified", evidence: snapshots };
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: "Browser checks ran but no page snapshot artifact was recorded." };
}
function browserLogSignal(browserResults, kind) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason: `No browser results were recorded for ${kind} log checks.` };
    const logs = browserResults.flatMap(item => {
        const path = kind === "console" ? item.consoleLogPath : item.networkLogPath;
        return path ? [evidence(item.name, item.status, path)] : [];
    });
    if (logs.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
        return { status: "not_verified", evidence: logs };
    }
    if (logs.length)
        return { status: "verified", evidence: logs };
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: `Browser checks ran but no ${kind} log artifact was recorded.` };
}
function browserArtifactSignal(browserResults, kind) {
    if (!browserResults.length)
        return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for browser artifact checks." };
    const artifacts = browserResults.flatMap(item => (item.browserArtifacts || [])
        .filter(artifact => kind === "any" || artifact.type === kind)
        .map(artifact => evidence(item.name, item.status, artifact.path)));
    if (artifacts.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
        return { status: "not_verified", evidence: artifacts };
    }
    if (artifacts.length)
        return { status: "verified", evidence: artifacts };
    const label = kind === "any" ? "browser artifact" : `browser ${kind}`;
    return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: `Browser checks ran but no ${label} artifact was recorded.` };
}
function plannedReason(workOrder, reason) {
    const planned = Array.isArray(workOrder.metadata?.autoDiscoveredVerificationCommands)
        ? workOrder.metadata.autoDiscoveredVerificationCommands
        : [];
    return planned.filter(item => item.reason === reason).map(item => String(item.command || ""));
}
function commandPatternsFor(check, workOrder) {
    const plannedBuild = plannedReason(workOrder, "build").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const plannedUnit = plannedReason(workOrder, "unit_tests").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const plannedType = plannedReason(workOrder, "typecheck").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const plannedLint = plannedReason(workOrder, "lint").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const plannedE2e = plannedReason(workOrder, "browser_e2e").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (/build/.test(check))
        return [/(\bnpm|\bpnpm|\byarn|\bbun).*\bbuild\b/i, /\bbuild\b/i, ...plannedBuild];
    if (/unit|test/.test(check))
        return [/\b(test|spec|unit)\b/i, ...plannedUnit];
    if (/type|tsc|typescript/.test(check))
        return [/\b(typecheck|type-check|check:types|tsc)\b/i, ...plannedType];
    if (/lint|eslint/.test(check))
        return [/\b(lint|eslint)\b/i, ...plannedLint];
    if (/e2e|playwright|cypress/.test(check))
        return [/\b(e2e|playwright|cypress)\b/i, ...plannedE2e];
    return [];
}
function coverageFor(check, input) {
    const normalized = norm(check);
    let signal;
    if (/^commands?$/.test(normalized))
        signal = anyCommandSignal(input.commandResults);
    else if (/build|unit|test|type|tsc|typescript|lint|eslint/.test(normalized)) {
        signal = commandSignal(input.commandResults, commandPatternsFor(normalized, input.workOrder), `No command evidence matched required check "${check}".`);
    }
    else if (/console_log|browser_console_log/.test(normalized))
        signal = browserLogSignal(input.browserResults, "console");
    else if (/network_log|browser_network_log/.test(normalized))
        signal = browserLogSignal(input.browserResults, "network");
    else if (/browser_trace|trace/.test(normalized))
        signal = browserArtifactSignal(input.browserResults, "trace");
    else if (/browser_har|\bhar\b/.test(normalized))
        signal = browserArtifactSignal(input.browserResults, "har");
    else if (/browser_video|video/.test(normalized))
        signal = browserArtifactSignal(input.browserResults, "video");
    else if (/browser_artifacts?|evidence_artifacts?/.test(normalized))
        signal = browserArtifactSignal(input.browserResults, "any");
    else if (/browser_snapshot|dom_snapshot|page_snapshot|snapshots?/.test(normalized))
        signal = browserSnapshotSignal(input.browserResults);
    else if (/browser|e2e|playwright|cypress/.test(normalized))
        signal = browserSignal(input.browserResults, `No browser result was recorded for required check "${check}".`);
    else if (/screenshots?/.test(normalized))
        signal = screenshotSignal(input.browserResults);
    else if (/console/.test(normalized))
        signal = consoleSignal(input.browserResults);
    else if (/network/.test(normalized))
        signal = networkSignal(input.browserResults, input.httpResults);
    else if (/http|api/.test(normalized))
        signal = httpSignal(input.httpResults, item => !item.adversarial, `No HTTP/API result was recorded for required check "${check}".`);
    else if (/adversarial|boundary|orphan|idempot/.test(normalized))
        signal = adversarialSignal(input.httpResults, input.browserResults, `No adversarial probe result was recorded for required check "${check}".`);
    else {
        signal = {
            status: "unknown",
            evidence: [],
            missingReason: `Required check "${check}" is not mapped to a built-in coverage rule.`,
        };
    }
    return {
        check,
        status: signal.status,
        evidence: signal.evidence.slice(0, 12),
        ...(signal.missingReason ? { missingReason: signal.missingReason } : {}),
    };
}
function buildRequiredCheckCoverage(input) {
    return input.workOrder.requiredChecks.map(check => coverageFor(check, input));
}
//# sourceMappingURL=required-checks.js.map
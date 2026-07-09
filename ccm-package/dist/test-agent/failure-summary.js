"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTestAgentFailureSummary = buildTestAgentFailureSummary;
function compact(value, max = 500) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}
function firstFailedBrowserStep(result) {
    return result.steps.find(step => step.status === "failed");
}
function browserReason(result) {
    const failedStep = firstFailedBrowserStep(result);
    if (failedStep?.error)
        return `${failedStep.name}: ${failedStep.error}`;
    if (result.error)
        return result.error;
    if (result.consoleErrors.length)
        return `console error: ${result.consoleErrors[0]}`;
    if (result.pageErrors.length)
        return `page error: ${result.pageErrors[0]}`;
    if ((result.networkErrors || []).length)
        return `network error: ${(result.networkErrors || [])[0]}`;
    return "Browser check failed without a specific failed step.";
}
function browserEvidence(result) {
    return [
        result.finalUrl ? `finalUrl=${result.finalUrl}` : "",
        result.title ? `title=${result.title}` : "",
        result.screenshots[0] ? `screenshot=${result.screenshots[0]}` : "",
        result.consoleLogPath ? `consoleLog=${result.consoleLogPath}` : "",
        result.networkLogPath ? `networkLog=${result.networkLogPath}` : "",
    ].filter(Boolean);
}
function uniqueDiagnostics(items) {
    const seen = new Set();
    return items
        .map(item => compact(item, 240))
        .filter(Boolean)
        .filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .slice(0, 6);
}
function commandDiagnostics(result) {
    return uniqueDiagnostics([
        `Rerun \`${result.command}\` from ${result.cwd} to reproduce the exact failure.`,
        result.stderr || result.stdout || result.output ? "Inspect the command output for the first assertion or stack trace before editing code." : "",
        result.exitCode !== null ? `Command exited with code ${result.exitCode}; fix the failing test/build path before relying on browser evidence.` : "",
        result.status === "timed_out" ? "Check for hanging processes, missing dev server readiness, or tests waiting on unavailable external services." : "",
    ]);
}
function serverDiagnostics(result) {
    return uniqueDiagnostics([
        result.command ? `Start the dev server command manually from ${result.cwd}: ${result.command}` : "Start the configured dev server manually.",
        result.url ? `Verify the readiness URL responds before rerunning TestAgent: ${result.url}` : "",
        result.output ? "Inspect the captured server output for port conflicts, missing env vars, or build errors." : "",
    ]);
}
function httpDiagnostics(result) {
    return uniqueDiagnostics([
        `Replay the HTTP check: ${result.method || "GET"} ${result.url}`,
        result.statusCode !== null ? `Expected assertion did not pass with HTTP status ${result.statusCode}; inspect response preview and assertion details.` : "",
        result.resourceChecks.some(item => item.status === "failed" || item.status === "blocked") ? "Review failed linked resources; a broken CSS/JS/API dependency can invalidate the page behavior." : "",
        result.probeType ? `Probe type ${result.probeType} failed; compare generated probe assumptions with the app route contract.` : "",
    ]);
}
function browserDiagnostics(result) {
    const failedStep = firstFailedBrowserStep(result);
    const failedName = String(failedStep?.name || "");
    const failedText = `${failedName} ${failedStep?.detail || ""} ${failedStep?.error || ""}`;
    return uniqueDiagnostics([
        failedStep ? `Reproduce failed browser step ${failedStep.name}; it was the first failed ${failedStep.kind}.` : "Reproduce the browser check and identify the first failing action/assertion.",
        result.screenshots[0] ? `Open screenshot artifact to compare expected UI with actual state: ${result.screenshots[0]}` : "",
        result.finalUrl && result.finalUrl !== result.url ? `Check unexpected navigation: started at ${result.url}, ended at ${result.finalUrl}.` : "",
        /assert:text|page text|text/i.test(failedText) ? "Inspect rendered copy and loading state; the expected text may be missing, delayed, or hidden behind a failed interaction." : "",
        /assert:url|waitForUrl|url/i.test(failedText) ? "Inspect routing and redirects; the expected URL/path was not reached." : "",
        /network|console|resource/i.test(failedText) || result.consoleErrors.length || result.pageErrors.length || (result.networkErrors || []).length ? "Review console and network logs before changing UI assertions; runtime errors can make the UI symptom misleading." : "",
        /localStorage|sessionStorage|cookie/i.test(failedText) ? "Inspect browser state setup and persistence; storage/cookie assertions should be checked after the action that writes them." : "",
        result.pageTextPreview ? "Use pageTextPreview in the browser detail section to see what the browser actually rendered." : "",
    ]);
}
function requiredCheckDiagnostics(item) {
    return uniqueDiagnostics([
        item.missingReason || `Required check ${item.check} did not have verified evidence.`,
        "Add an explicit command, HTTP check, browser check, or artifact requirement that directly proves this required check.",
        /browser|e2e|playwright|cookie|storage|responsive|screenshot/i.test(item.check) ? "For browser-facing requirements, prefer a Playwright browser check with screenshots and concrete assertions." : "",
        /command|build|unit|type|lint/i.test(item.check) ? "For command requirements, add the exact verification command to the work order or package scripts so TestAgent can run it." : "",
    ]);
}
function acceptanceDiagnostics(item) {
    const strength = item.matchStrength || "none";
    const source = item.evidenceSource || "none";
    const score = typeof item.matchScore === "number" && item.matchScore > 0 ? `; score=${item.matchScore}` : "";
    return uniqueDiagnostics([
        `Acceptance evidence strength=${strength}; source=${source}${score}.`,
        strength === "direct" && item.status === "not_verified" ? "Direct evidence matched this criterion but failed; fix the underlying command, HTTP, or browser assertion before adding broader checks." : "",
        strength === "token" ? "Only token-level evidence matched this criterion; prefer naming the check after the criterion or adding an explicit assertion detail." : "",
        strength === "fallback" ? "This result came from the single-criterion report-status fallback; treat it as weak evidence until a direct assertion proves the behavior." : "",
        strength === "none" ? "No evidence matched this criterion; add a targeted assertion using its route, visible text, state, API response, or persisted browser state." : "",
        source === "matched_evidence" && item.evidence.length ? "Existing matched evidence did not verify the criterion; inspect the listed failed evidence before adding new checks." : "",
        source === "none" ? "No acceptance evidence source was found; map this criterion to a concrete command, HTTP, API, or browser check." : "",
    ]);
}
function issueDiagnostics(issue) {
    return uniqueDiagnostics([
        issue.project ? `Fix the work-order issue for project ${issue.project}.` : "Fix the work-order issue before running verification.",
        issue.message,
    ]);
}
function nextActionForType(type) {
    if (type === "command")
        return "Fix the failing command or its inputs, then rerun TestAgent.";
    if (type === "http")
        return "Fix the HTTP/API behavior or configured endpoint, then rerun TestAgent.";
    if (type === "browser")
        return "Reproduce the browser step, fix the UI behavior, then rerun the browser check.";
    if (type === "required_check")
        return "Add or repair evidence for the required check before accepting the delivery.";
    if (type === "acceptance")
        return "Map this acceptance criterion to passing command, HTTP, or browser evidence.";
    if (type === "server")
        return "Fix dev server startup/readiness before rerunning verification.";
    return "Resolve the work-order issue before rerunning TestAgent.";
}
function acceptanceNextAction(item) {
    const strength = item.matchStrength || "none";
    if (strength === "none" || strength === "fallback") {
        return "Add a direct browser, HTTP/API, or command assertion for this acceptance criterion, then rerun TestAgent.";
    }
    if (item.status === "not_verified") {
        return "Fix the matched failed evidence for this acceptance criterion, then rerun TestAgent.";
    }
    return nextActionForType("acceptance");
}
function acceptanceReason(item) {
    const strength = item.matchStrength || "none";
    const source = item.evidenceSource || "none";
    const score = typeof item.matchScore === "number" ? `; score=${item.matchScore}` : "";
    const evidence = item.evidence.join("; ") || item.status;
    return `evidence strength=${strength}; source=${source}${score}; ${evidence}`;
}
function coverageFailureStatus(status) {
    return status === "not_verified" ? "not_verified" : "unknown";
}
function buildTestAgentFailureSummary(input) {
    const items = [];
    for (const issue of input.issues.filter(item => item.severity === "error")) {
        items.push({
            type: "issue",
            project: issue.project,
            title: issue.code,
            status: "blocked",
            reason: compact(issue.message),
            nextAction: nextActionForType("issue"),
            diagnostics: issueDiagnostics(issue),
        });
    }
    for (const result of input.devServerResults.filter(item => item.status === "failed")) {
        items.push({
            type: "server",
            project: result.project,
            title: result.command || "Dev server readiness",
            status: "failed",
            reason: compact(result.error || result.output || "Dev server failed."),
            evidence: [result.url].filter(Boolean),
            nextAction: nextActionForType("server"),
            diagnostics: serverDiagnostics(result),
        });
    }
    for (const result of input.commandResults.filter(item => item.status === "failed" || item.status === "timed_out" || item.status === "blocked")) {
        items.push({
            type: "command",
            project: result.project,
            title: result.command,
            status: result.status === "blocked" ? "blocked" : "failed",
            reason: compact(result.error || result.stderr || result.stdout || `exit=${result.exitCode}; status=${result.status}`),
            evidence: [`cwd=${result.cwd}`, `exit=${result.exitCode === null ? "(none)" : result.exitCode}`, `duration=${result.durationMs}ms`],
            nextAction: nextActionForType("command"),
            diagnostics: commandDiagnostics(result),
        });
    }
    for (const result of input.httpResults.filter(item => item.status === "failed" || item.status === "blocked")) {
        items.push({
            type: "http",
            project: result.project,
            title: result.name || result.url,
            status: result.status === "blocked" ? "blocked" : "failed",
            reason: compact(result.error || `status=${result.statusCode}; ${result.responsePreview || "HTTP check failed."}`),
            evidence: [result.url, result.probeType ? `probe=${result.probeType}` : ""].filter(Boolean),
            nextAction: nextActionForType("http"),
            diagnostics: httpDiagnostics(result),
        });
    }
    for (const result of input.browserResults.filter(item => item.status === "failed" || item.status === "blocked")) {
        items.push({
            type: "browser",
            project: result.project,
            title: result.name,
            status: result.status === "blocked" ? "blocked" : "failed",
            reason: compact(browserReason(result)),
            evidence: browserEvidence(result),
            nextAction: nextActionForType("browser"),
            diagnostics: browserDiagnostics(result),
        });
    }
    for (const item of input.requiredCheckCoverage.filter(item => item.status !== "verified")) {
        items.push({
            type: "required_check",
            title: item.check,
            status: coverageFailureStatus(item.status),
            reason: compact(item.missingReason || item.evidence.join("; ") || item.status),
            evidence: item.evidence.slice(0, 5),
            nextAction: nextActionForType("required_check"),
            diagnostics: requiredCheckDiagnostics(item),
        });
    }
    for (const item of input.acceptanceCoverage.filter(item => item.status !== "verified")) {
        items.push({
            type: "acceptance",
            title: item.criterion,
            status: coverageFailureStatus(item.status),
            reason: compact(acceptanceReason(item)),
            evidence: item.evidence.slice(0, 5),
            nextAction: acceptanceNextAction(item),
            diagnostics: acceptanceDiagnostics(item),
        });
    }
    return items.slice(0, 50);
}
//# sourceMappingURL=failure-summary.js.map
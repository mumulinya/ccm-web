import {
  BrowserCheckResult,
  BrowserToolCallRecord,
  CommandRunResult,
  DevServerResult,
  HttpCheckResult,
  NormalizedTestAgentWorkOrder,
  RequiredCheckCoverageItem,
  TestAgentRequiredCheck,
} from "./types";
import { filterBrowserConsoleErrorLines, isBrowserConsoleWarningLine } from "./browser/console-assertions";

type RequiredStatus = RequiredCheckCoverageItem["status"];

interface Signal {
  status: RequiredStatus;
  evidence: string[];
  missingReason?: string;
}

function norm(value: any) {
  return String(value || "").toLowerCase().replace(/[\s:-]+/g, "_");
}

function evidence(label: string, status: string, detail = "") {
  return `${label}: ${status}${detail ? ` - ${detail}` : ""}`;
}

function commandMatches(command: CommandRunResult, patterns: RegExp[]) {
  const text = `${command.command}\n${command.output}`.toLowerCase();
  return patterns.some(pattern => pattern.test(text));
}

function commandSignal(commands: CommandRunResult[], patterns: RegExp[], missingReason: string): Signal {
  const matches = commands.filter(command => commandMatches(command, patterns));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason };
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

function anyCommandSignal(commands: CommandRunResult[]): Signal {
  if (!commands.length) return { status: "unknown", evidence: [], missingReason: "No verification command results were recorded." };
  const failed = commands.filter(command => command.status === "failed" || command.status === "timed_out" || command.status === "blocked");
  if (failed.length) return { status: "not_verified", evidence: failed.map(command => evidence(command.command, command.status, command.error || `exit=${command.exitCode}`)) };
  const passed = commands.filter(command => command.status === "passed");
  if (passed.length) return { status: "verified", evidence: passed.map(command => evidence(command.command, command.status, `exit=${command.exitCode}`)) };
  return { status: "unknown", evidence: commands.map(command => evidence(command.command, command.status)), missingReason: "Commands ran but did not produce passing evidence." };
}

function httpSignal(httpResults: HttpCheckResult[], predicate: (item: HttpCheckResult) => boolean, missingReason: string): Signal {
  const matches = httpResults.filter(predicate);
  if (!matches.length) return { status: "unknown", evidence: [], missingReason };
  const failed = matches.filter(item => item.status === "failed" || item.status === "blocked");
  if (failed.length) return { status: "not_verified", evidence: failed.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, item.error || `status=${item.statusCode}`)) };
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) return { status: "verified", evidence: passed.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status, `status=${item.statusCode}`)) };
  return { status: "unknown", evidence: matches.map(item => evidence(`${item.method || "GET"} ${item.name || item.url}`, item.status)), missingReason };
}

function browserSignal(browserResults: BrowserCheckResult[], missingReason: string): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason };
  const failed = browserResults.filter(item => item.status === "failed" || item.status === "blocked");
  if (failed.length) return { status: "not_verified", evidence: failed.map(item => evidence(item.name, item.status, item.error || item.url)) };
  const passed = browserResults.filter(item => item.status === "passed");
  if (passed.length) return { status: "verified", evidence: passed.map(item => evidence(item.name, item.status, item.url)) };
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason };
}

function adversarialSignal(httpResults: HttpCheckResult[], browserResults: BrowserCheckResult[], missingReason: string): Signal {
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
  if (passed.length) return { status: "verified", evidence: passed };
  return { status: "unknown", evidence: [], missingReason };
}

function stepText(step: { name: string; detail?: string; error?: string }) {
  return `${step.name} ${step.detail || ""} ${step.error || ""}`;
}

function isComputerUseMcpResult(item: BrowserCheckResult) {
  return item.provider === "mcp" && item.steps.some(step => /^computer-use:/i.test(step.name));
}

function isConsoleNoErrorsStep(step: { name: string; detail?: string; error?: string }) {
  return /consoleNoErrors|no console\/page errors|no console errors/i.test(stepText(step));
}

function isConsoleErrorStep(step: { name: string; detail?: string; error?: string }) {
  return isConsoleNoErrorsStep(step) || /\bconsole errors?\b|\bpageErrors\b|\bpage errors?\b/i.test(stepText(step));
}

function hasPassedConsoleNoErrorsStep(item: BrowserCheckResult) {
  return item.steps.some(step => isConsoleNoErrorsStep(step) && step.status === "passed");
}

function hasConsoleTelemetry(item: BrowserCheckResult) {
  if (isComputerUseMcpResult(item) && !hasPassedConsoleNoErrorsStep(item)) return false;
  return Array.isArray(item.consoleMessages) || Boolean(item.consoleLogPath) || hasPassedConsoleNoErrorsStep(item);
}

function consoleSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for console checks." };
  const bad = browserResults.filter(item => {
    const consoleErrors = [...(item.consoleErrors || []), ...filterBrowserConsoleErrorLines(item.consoleMessages || [])];
    return consoleErrors.length > 0
      || (item.pageErrors || []).length > 0
      || item.steps.some(step => isConsoleErrorStep(step) && step.status === "failed");
  });
  if (bad.length) {
    return {
      status: "not_verified",
      evidence: bad.map(item => evidence(item.name, item.status, [
        ...(item.consoleErrors || []),
        ...filterBrowserConsoleErrorLines(item.consoleMessages || []),
        ...(item.pageErrors || []),
        ...item.steps
          .filter(step => isConsoleErrorStep(step) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  const matches = browserResults.filter(hasConsoleTelemetry);
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No console error assertion or telemetry evidence was recorded." };
  const passed = matches.filter(item => item.status !== "blocked" || hasPassedConsoleNoErrorsStep(item));
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => isConsoleNoErrorsStep(step))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        item.consoleLogPath ? `consoleLog=${item.consoleLogPath}` : "",
        Array.isArray(item.consoleMessages) ? `consoleMessages=${item.consoleMessages.length}` : "",
      ].filter(Boolean).slice(0, 4).join(" | ") || "no console/page errors recorded")),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.consoleLogPath || item.finalUrl || item.url)), missingReason: "Console error evidence was recorded but no passing browser console check was available." };
}

function consoleWarningSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for console warning checks." };
  const warningPattern = /consoleNoWarnings|no console warning|console warning/i;
  const matches = browserResults.filter(item =>
    hasConsoleTelemetry(item)
    || item.steps.some(step => warningPattern.test(`${step.name} ${step.detail || ""}`))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No console warning assertion or telemetry evidence was recorded." };
  const failed = matches.filter(item =>
    (item.consoleMessages || []).some(isBrowserConsoleWarningLine)
    || item.steps.some(step => warningPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...(item.consoleMessages || []).filter(isBrowserConsoleWarningLine).slice(0, 3),
        ...item.steps
          .filter(step => warningPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
      ].filter(Boolean).join(" | ") || item.error || item.consoleLogPath || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => warningPattern.test(`${step.name} ${step.detail || ""}`))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        item.consoleLogPath ? `consoleLog=${item.consoleLogPath}` : "",
        Array.isArray(item.consoleMessages) ? `consoleMessages=${item.consoleMessages.length}` : "",
      ].filter(Boolean).slice(0, 4).join(" | ") || "no console warning messages recorded")),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.consoleLogPath || item.finalUrl || item.url)), missingReason: "Console warning evidence was recorded but no passing browser check was available." };
}

function networkSignal(browserResults: BrowserCheckResult[], httpResults: HttpCheckResult[]): Signal {
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
  if (positive.length) return { status: "verified", evidence: positive };
  return { status: "unknown", evidence: [], missingReason: "No browser or HTTP network evidence was recorded." };
}

function browserNetworkSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for browser network checks." };
  const networkPattern = /networkNoErrors|networkRequest|networkResponse|browser network|network telemetry/i;
  const matches = browserResults.filter(item =>
    (item.networkRequests || []).length > 0
    || Boolean(item.networkLogPath)
    || (item.networkErrors || []).length > 0
    || item.steps.some(step => networkPattern.test(`${step.name} ${step.detail || ""}`))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser network assertion or telemetry evidence was recorded." };
  const failed = matches.filter(item =>
    (item.networkErrors || []).length > 0
    || item.steps.some(step => networkPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...(item.networkErrors || []).slice(0, 3),
        ...item.steps
          .filter(step => networkPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
      ].filter(Boolean).join(" | ") || item.error || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => networkPattern.test(`${step.name} ${step.detail || ""}`))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        item.networkLogPath ? `networkLog=${item.networkLogPath}` : "",
        (item.networkRequests || []).length ? `networkRequests=${(item.networkRequests || []).length}` : "",
      ].filter(Boolean).slice(0, 5).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.networkLogPath || item.finalUrl || item.url)), missingReason: "Browser network evidence was recorded but no passing browser network check was available." };
}

function browserAccessibilitySignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for accessibility checks." };
  const accessibilityPattern = /accessibleName|accessibleDescription|ariaSnapshot|ariaExpanded|ariaCollapsed|ariaPressed|ariaNotPressed|ariaSelected|ariaNotSelected|ariaInvalid|ariaValid|ariaRequired|ariaNotRequired/i;
  const matches = browserResults.filter(item =>
    item.steps.some(step => accessibilityPattern.test(`${step.name} ${step.detail || ""}`))
    || (item.browserArtifacts || []).some(artifact => artifact.type === "accessibility_snapshot")
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No accessibility/ARIA browser assertion or accessibility snapshot evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "failed"
    || item.status === "blocked"
    || item.steps.some(step => accessibilityPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => accessibilityPattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => accessibilityPattern.test(`${step.name} ${step.detail || ""}`))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        ...(item.browserArtifacts || [])
          .filter(artifact => artifact.type === "accessibility_snapshot")
          .map(artifact => `accessibilitySnapshot=${artifact.path}`),
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.finalUrl || item.url)), missingReason: "Accessibility evidence was recorded but no passing accessibility check was available." };
}

function screenshotSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for screenshot checks." };
  const screenshotFailures = browserResults.filter(item => item.screenshots.some(path => /screenshot failed/i.test(path)));
  if (screenshotFailures.length) return { status: "not_verified", evidence: screenshotFailures.map(item => evidence(item.name, item.status, item.screenshots.join(" | "))) };
  const screenshots = browserResults.flatMap(item => item.screenshots.map(path => evidence(item.name, item.status, path)));
  if (screenshots.length) return { status: "verified", evidence: screenshots };
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: "Browser checks ran but no screenshot artifact was recorded." };
}

function browserSnapshotSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for browser snapshot checks." };
  const snapshots = browserResults.flatMap(item => (item.pageSnapshots || []).map(path => evidence(item.name, item.status, path)));
  if (snapshots.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
    return { status: "not_verified", evidence: snapshots };
  }
  if (snapshots.length) return { status: "verified", evidence: snapshots };
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: "Browser checks ran but no page snapshot artifact was recorded." };
}

function browserLogSignal(browserResults: BrowserCheckResult[], kind: "console" | "network"): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: `No browser results were recorded for ${kind} log checks.` };
  const logs = browserResults.flatMap(item => {
    const path = kind === "console" ? item.consoleLogPath : item.networkLogPath;
    return path ? [evidence(item.name, item.status, path)] : [];
  });
  if (logs.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
    return { status: "not_verified", evidence: logs };
  }
  if (logs.length) return { status: "verified", evidence: logs };
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: `Browser checks ran but no ${kind} log artifact was recorded.` };
}

function browserInteractionLogSignal(browserResults: BrowserCheckResult[], kind: "dialog" | "popup"): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: `No browser results were recorded for ${kind} log checks.` };
  const logs = browserResults.flatMap(item => {
    const path = kind === "dialog" ? item.dialogLogPath : item.popupLogPath;
    return path ? [evidence(item.name, item.status, path)] : [];
  });
  if (logs.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
    return { status: "not_verified", evidence: logs };
  }
  if (logs.length) return { status: "verified", evidence: logs };
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: `Browser checks ran but no ${kind} log artifact was recorded.` };
}

function browserDialogSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for dialog checks." };
  const dialogPattern = /dialogAppeared|dialogMessageIncludes|dialogTypeEquals|browser dialog|native dialog/i;
  const matches = browserResults.filter(item =>
    (item.dialogMessages || []).length > 0
    || item.steps.some(step => dialogPattern.test(stepText(step)))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser dialog assertion or dialog telemetry evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => dialogPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => dialogPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        ...(item.dialogMessages || []).slice(0, 3),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.dialogLogPath || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status !== "blocked"
    && ((item.dialogMessages || []).length > 0 || item.steps.some(step => dialogPattern.test(stepText(step)) && step.status === "passed"))
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => dialogPattern.test(stepText(step)))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        ...(item.dialogMessages || []).slice(0, 3),
        item.dialogLogPath ? `dialogLog=${item.dialogLogPath}` : "",
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.dialogLogPath || item.finalUrl || item.url)), missingReason: "Dialog evidence was recorded but no passing browser dialog check was available." };
}

function browserPopupSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for popup checks." };
  const popupPattern = /popupOpened|popupUrlIncludes|popupTextIncludes|popupTitleIncludes|browser popup|new page|new tab|new window/i;
  const matches = browserResults.filter(item =>
    (item.popupMessages || []).length > 0
    || item.steps.some(step => popupPattern.test(stepText(step)))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser popup assertion or popup telemetry evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => popupPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => popupPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        ...(item.popupMessages || []).slice(0, 3),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.popupLogPath || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status !== "blocked"
    && ((item.popupMessages || []).length > 0 || item.steps.some(step => popupPattern.test(stepText(step)) && step.status === "passed"))
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => popupPattern.test(stepText(step)))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        ...(item.popupMessages || []).slice(0, 3),
        item.popupLogPath ? `popupLog=${item.popupLogPath}` : "",
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.popupLogPath || item.finalUrl || item.url)), missingReason: "Popup evidence was recorded but no passing browser popup check was available." };
}

function browserArtifactSignal(browserResults: BrowserCheckResult[], kind: "trace" | "har" | "video" | "download" | "accessibility_snapshot" | "any"): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for browser artifact checks." };
  const artifacts = browserResults.flatMap(item => (item.browserArtifacts || [])
    .filter(artifact => kind === "any" || artifact.type === kind)
    .map(artifact => evidence(item.name, item.status, artifact.path)));
  if (artifacts.length && browserResults.some(item => item.status === "failed" || item.status === "blocked")) {
    return { status: "not_verified", evidence: artifacts };
  }
  if (artifacts.length) return { status: "verified", evidence: artifacts };
  const label = kind === "any" ? "browser artifact" : `browser ${kind}`;
  return { status: "unknown", evidence: browserResults.map(item => evidence(item.name, item.status)), missingReason: `Browser checks ran but no ${label} artifact was recorded.` };
}

function browserDownloadSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for download checks." };
  const downloadPattern = /downloadedFile|downloaded file|browser download|download artifact/i;
  const matches = browserResults.filter(item =>
    (item.browserArtifacts || []).some(artifact => artifact.type === "download")
    || item.steps.some(step => downloadPattern.test(stepText(step)))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No downloaded-file assertion or download artifact evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => downloadPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => downloadPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        ...(item.browserArtifacts || [])
          .filter(artifact => artifact.type === "download")
          .map(artifact => `download=${artifact.path}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status !== "blocked"
    && (
      (item.browserArtifacts || []).some(artifact => artifact.type === "download")
      || item.steps.some(step => downloadPattern.test(stepText(step)) && step.status === "passed")
    )
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => downloadPattern.test(stepText(step)))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
        ...(item.browserArtifacts || [])
          .filter(artifact => artifact.type === "download")
          .map(artifact => `download=${artifact.path}`),
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.finalUrl || item.url)), missingReason: "Download evidence was recorded but no passing browser download check was available." };
}

function browserUploadSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for upload checks." };
  const uploadPattern = /uploadFile|file upload|browser upload|acceptance_upload_flow/i;
  const matches = browserResults.filter(item =>
    item.probeType === "acceptance_upload_flow"
    || item.steps.some(step => uploadPattern.test(stepText(step)))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser upload action evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => uploadPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => uploadPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => uploadPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => uploadPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status, item.finalUrl || item.url)), missingReason: "Upload evidence was recorded but no passing upload action was available." };
}

function responsiveSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for responsive/mobile checks." };
  const matches = browserResults.filter(item =>
    item.probeType === "acceptance_responsive_viewport"
    || item.viewport?.isMobile === true
    || item.steps.some(step => /noHorizontalOverflow|inViewport/i.test(step.name))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No responsive/mobile viewport browser evidence was recorded." };
  const failed = matches.filter(item => item.status === "failed" || item.status === "blocked" || item.steps.some(step => /noHorizontalOverflow|inViewport/i.test(step.name) && step.status === "failed"));
  if (failed.length) return { status: "not_verified", evidence: failed.map(item => evidence(item.name, item.status, item.error || item.finalUrl || item.url)) };
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, `${item.viewport ? `viewport=${item.viewport.width}x${item.viewport.height}${item.viewport.isMobile ? "; mobile" : ""}` : item.finalUrl || item.url}`)),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Responsive/mobile checks ran but did not produce passing evidence." };
}

function browserStorageSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for Web Storage checks." };
  const matches = browserResults.filter(item => item.steps.some(step => /localStorage|sessionStorage|clearStorage|setLocalStorage|setSessionStorage/i.test(`${step.name} ${step.detail || ""}`)));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No localStorage/sessionStorage browser evidence was recorded." };
  const failed = matches.filter(item => item.status === "failed" || item.status === "blocked" || item.steps.some(step =>
    /localStorage|sessionStorage|clearStorage|setLocalStorage|setSessionStorage/i.test(`${step.name} ${step.detail || ""}`) && step.status === "failed"
  ));
  if (failed.length) return { status: "not_verified", evidence: failed.map(item => evidence(item.name, item.status, item.error || item.finalUrl || item.url)) };
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => /localStorage|sessionStorage|clearStorage|setLocalStorage|setSessionStorage/i.test(`${step.name} ${step.detail || ""}`))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 4)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Web Storage checks ran but did not produce passing evidence." };
}

function browserCookieSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for cookie checks." };
  const cookiePattern = /cookieExists|cookieValueEquals|cookieValueIncludes|setCookie|clearCookies|cookie=/i;
  const matches = browserResults.filter(item => item.steps.some(step => cookiePattern.test(`${step.name} ${step.detail || ""}`)));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser cookie evidence was recorded." };
  const failed = matches.filter(item => item.status === "failed" || item.status === "blocked" || item.steps.some(step =>
    cookiePattern.test(`${step.name} ${step.detail || ""}`) && step.status === "failed"
  ));
  if (failed.length) return { status: "not_verified", evidence: failed.map(item => evidence(item.name, item.status, item.error || item.finalUrl || item.url)) };
  const passed = matches.filter(item => item.status === "passed");
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => cookiePattern.test(`${step.name} ${step.detail || ""}`))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 4)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Cookie checks ran but did not produce passing evidence." };
}

function browserClipboardSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for clipboard checks." };
  const clipboardPattern = /setClipboard|clipboardTextEquals|clipboardTextIncludes|browser clipboard|clipboard/i;
  const matches = browserResults.filter(item => item.steps.some(step => clipboardPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser clipboard action or assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => clipboardPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => clipboardPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => clipboardPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => clipboardPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Clipboard checks ran but did not produce passing evidence." };
}

function browserFocusSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for focus checks." };
  const focusPattern = /(^|:)focus\b|focused|notFocused|has focus|browser focus/i;
  const matches = browserResults.filter(item => item.steps.some(step => focusPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser focus action or assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => focusPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => focusPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => focusPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => focusPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Focus checks ran but did not produce passing evidence." };
}

function browserKeyboardSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for keyboard checks." };
  const keyboardPattern = /typeText|(^|:)press\b|keyboard|hotkey|shortcut/i;
  const matches = browserResults.filter(item => item.steps.some(step => keyboardPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser keyboard action evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => keyboardPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => keyboardPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => keyboardPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => keyboardPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Keyboard checks ran but did not produce passing evidence." };
}

function browserVisualSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for visual checks." };
  const visualPattern = /elementScreenshotNotBlank|computedStyleEquals|computedStyleIncludes|visual not blank|visual/i;
  const matches = browserResults.filter(item => item.steps.some(step => visualPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser visual assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => visualPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => visualPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => visualPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => visualPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Visual checks ran but did not produce passing evidence." };
}

function browserLayoutSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for layout checks." };
  const layoutPattern = /inViewport|noHorizontalOverflow|computedStyleEquals|computedStyleIncludes|browser layout|layout/i;
  const matches = browserResults.filter(item => item.steps.some(step => layoutPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser layout assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => layoutPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => layoutPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => layoutPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => layoutPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Layout checks ran but did not produce passing evidence." };
}

function isBrowserStepAssertion(step: { kind?: string; name: string; status: string; detail?: string; error?: string }) {
  return step.kind === "assertion" || /^assert:/i.test(step.name);
}

function isMeaningfulFormCompletionAssertion(step: { kind?: string; name: string; status: string; detail?: string; error?: string }) {
  return isBrowserStepAssertion(step)
    && !/consoleNoErrors|networkNoErrors|pageNotBlank/i.test(stepText(step));
}

function browserFormStateSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for form/control state checks." };
  const statePattern = /inputValueEquals|inputValueIncludes|selectedValue|selectedTextIncludes|(^|:)checked\b|notChecked|(^|:)enabled\b|(^|:)disabled\b|form state|control state/i;
  const matches = browserResults.filter(item => item.steps.some(step => statePattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser form/control state assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => statePattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => statePattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => statePattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => statePattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 6)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Form/control state checks ran but did not produce passing evidence." };
}

function browserFormSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for form checks." };
  const actionPattern = /acceptance_form_flow|(^|:)fill\b|selectOption|(^|:)check\b|uncheck|form flow|form submit|form validation/i;
  const statePattern = /inputValueEquals|inputValueIncludes|selectedValue|selectedTextIncludes|(^|:)checked\b|notChecked|(^|:)enabled\b|(^|:)disabled\b|form state|control state/i;
  const matches = browserResults.filter(item =>
    item.probeType === "acceptance_form_flow"
    || item.steps.some(step => actionPattern.test(stepText(step)) || statePattern.test(stepText(step)))
  );
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser form flow or form/control state evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => (actionPattern.test(stepText(step)) || statePattern.test(stepText(step))) && step.status === "failed")
    || (
      item.status === "failed"
      && item.steps.some(step => actionPattern.test(stepText(step)) || statePattern.test(stepText(step)))
      && item.steps.some(step => isBrowserStepAssertion(step) && step.status === "failed")
    )
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => (actionPattern.test(stepText(step)) || statePattern.test(stepText(step)) || isBrowserStepAssertion(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).slice(0, 6).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && (
      item.probeType === "acceptance_form_flow"
      || item.steps.some(step => statePattern.test(stepText(step)) && step.status === "passed")
      || (
        item.steps.some(step => actionPattern.test(stepText(step)) && step.status === "passed")
        && item.steps.some(step => isMeaningfulFormCompletionAssertion(step) && step.status === "passed")
      )
    )
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, [
        item.probeType === "acceptance_form_flow" ? `probe=${item.probeType}` : "",
        ...item.steps
          .filter(step => actionPattern.test(stepText(step)) || statePattern.test(stepText(step)) || isMeaningfulFormCompletionAssertion(step))
          .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`),
      ].filter(Boolean).slice(0, 6).join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Form checks ran but did not produce passing form flow or state evidence." };
}

function browserTableSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for table checks." };
  const tablePattern = /tableRowIncludes|tableCellTextIncludes|tableCellTextEquals|table row|table cell|data table/i;
  const matches = browserResults.filter(item => item.steps.some(step => tablePattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser table row/cell assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => tablePattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => tablePattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => tablePattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => tablePattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Table checks ran but did not produce passing evidence." };
}

function browserListSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for list/count checks." };
  const listPattern = /elementCountEquals|elementCountAtLeast|elementCountAtMost|list count|item count|collection count|card count/i;
  const matches = browserResults.filter(item => item.steps.some(step => listPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser list/count assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => listPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => listPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => listPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => listPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "List/count checks ran but did not produce passing evidence." };
}

function browserTextOrderSignal(browserResults: BrowserCheckResult[]): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason: "No browser results were recorded for text/order checks." };
  const textOrderPattern = /textOrder|text order|content order|sort order|ordered text/i;
  const matches = browserResults.filter(item => item.steps.some(step => textOrderPattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason: "No browser text-order assertion evidence was recorded." };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => textOrderPattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => textOrderPattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => textOrderPattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => textOrderPattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 5)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: "Text-order checks ran but did not produce passing evidence." };
}

function browserStepAssertionSignal(browserResults: BrowserCheckResult[], pattern: RegExp, missingReason: string, noPassReason: string): Signal {
  if (!browserResults.length) return { status: "unknown", evidence: [], missingReason };
  const matches = browserResults.filter(item => item.steps.some(step => pattern.test(stepText(step))));
  if (!matches.length) return { status: "unknown", evidence: [], missingReason };
  const failed = matches.filter(item =>
    item.status === "blocked"
    || item.steps.some(step => pattern.test(stepText(step)) && step.status === "failed")
  );
  if (failed.length) {
    return {
      status: "not_verified",
      evidence: failed.map(item => evidence(item.name, item.status, [
        ...item.steps
          .filter(step => pattern.test(stepText(step)) && step.status === "failed")
          .map(step => `${step.name}${step.error ? ` ${step.error}` : ""}`),
        item.error || "",
      ].filter(Boolean).join(" | ") || item.finalUrl || item.url)),
    };
  }
  const passed = matches.filter(item =>
    item.status === "passed"
    && item.steps.some(step => pattern.test(stepText(step)) && step.status === "passed")
  );
  if (passed.length) {
    return {
      status: "verified",
      evidence: passed.map(item => evidence(item.name, item.status, item.steps
        .filter(step => pattern.test(stepText(step)))
        .map(step => `${step.name}${step.detail ? ` ${step.detail}` : ""}`)
        .slice(0, 6)
        .join(" | "))),
    };
  }
  return { status: "unknown", evidence: matches.map(item => evidence(item.name, item.status)), missingReason: noPassReason };
}

function browserUrlSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /urlEquals|urlIncludes|urlNotIncludes|browser url|url state|route url/i,
    "No browser URL assertion evidence was recorded.",
    "URL checks ran but did not produce passing evidence.",
  );
}

function browserTitleSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /titleEquals|titleIncludes|titleNotIncludes|browser title|document title/i,
    "No browser title assertion evidence was recorded.",
    "Title checks ran but did not produce passing evidence.",
  );
}

function browserNavigationSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /urlEquals|urlIncludes|urlNotIncludes|waitForUrl|goBack|goForward|reload|browser navigation|route navigation/i,
    "No browser navigation or URL-transition evidence was recorded.",
    "Navigation checks ran but did not produce passing evidence.",
  );
}

function browserAttributeSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /attributeEquals|attributeIncludes|browser attribute|dom attribute|aria attribute|data attribute/i,
    "No browser DOM/attribute assertion evidence was recorded.",
    "Attribute checks ran but did not produce passing evidence.",
  );
}

function browserNetworkStateSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /onlineState|browserOnline|browserOffline|setOffline|setOnline|browser network state|network state|offline state|online state/i,
    "No browser online/offline state evidence was recorded.",
    "Browser online/offline checks ran but did not produce passing evidence.",
  );
}

function browserPresenceSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /assert:(?:visible|notVisible|present|notPresent)\b|browser presence|browser visibility|dom presence|element visibility/i,
    "No browser presence/visibility assertion evidence was recorded.",
    "Presence/visibility checks ran but did not produce passing evidence.",
  );
}

function browserHoverSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /action:hover\b|computer-use:hover|browser hover|hover action|hover interaction/i,
    "No browser hover action evidence was recorded.",
    "Hover checks ran but did not produce passing evidence.",
  );
}

function browserDragSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /action:dragTo\b|(?:^|:)dragTo\b|drag\/drop|drag and drop|browser drag|drag action/i,
    "No browser drag/drop action evidence was recorded.",
    "Drag/drop checks ran but did not produce passing evidence.",
  );
}

function browserScrollSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /action:scroll\b|computer-use:scroll|browser scroll|scroll action|scroll interaction/i,
    "No browser scroll action evidence was recorded.",
    "Scroll checks ran but did not produce passing evidence.",
  );
}

function browserHistorySignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /action:(?:reload|goBack|goForward)\b|(?:^|:)(?:reload|goBack|goForward)\b|browser history|history navigation|back forward navigation/i,
    "No browser history/reload action evidence was recorded.",
    "Browser history/reload checks ran but did not produce passing evidence.",
  );
}

function browserScriptSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /jsTruthy|jsEquals|action:evaluate\b|(?:^|:)evaluate\b|browser script|javascript|js expression|page expression/i,
    "No browser JavaScript/action or expression assertion evidence was recorded.",
    "Browser JavaScript/expression checks ran but did not produce passing evidence.",
  );
}

function browserWaitSignal(browserResults: BrowserCheckResult[]): Signal {
  return browserStepAssertionSignal(
    browserResults,
    /action:waitFor(?:Selector|Text|Url)\b|(?:^|:)waitFor(?:Selector|Text|Url)\b|browser wait|wait condition|async ui/i,
    "No browser conditional wait evidence was recorded.",
    "Browser conditional wait checks ran but did not produce passing evidence.",
  );
}

function plannedReason(workOrder: NormalizedTestAgentWorkOrder, reason: string) {
  const planned = Array.isArray(workOrder.metadata?.autoDiscoveredVerificationCommands)
    ? workOrder.metadata.autoDiscoveredVerificationCommands as any[]
    : [];
  return planned.filter(item => item.reason === reason).map(item => String(item.command || ""));
}

function commandPatternsFor(check: string, workOrder: NormalizedTestAgentWorkOrder) {
  const plannedBuild = plannedReason(workOrder, "build").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const plannedUnit = plannedReason(workOrder, "unit_tests").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const plannedType = plannedReason(workOrder, "typecheck").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const plannedLint = plannedReason(workOrder, "lint").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const plannedE2e = plannedReason(workOrder, "browser_e2e").map(command => new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  if (/build/.test(check)) return [/(\bnpm|\bpnpm|\byarn|\bbun).*\bbuild\b/i, /\bbuild\b/i, ...plannedBuild];
  if (/unit|test/.test(check)) return [/\b(test|spec|unit)\b/i, ...plannedUnit];
  if (/type|tsc|typescript/.test(check)) return [/\b(typecheck|type-check|check:types|tsc)\b/i, ...plannedType];
  if (/lint|eslint/.test(check)) return [/\b(lint|eslint)\b/i, ...plannedLint];
  if (/e2e|playwright|cypress/.test(check)) return [/\b(e2e|playwright|cypress)\b/i, ...plannedE2e];
  return [];
}

function coverageFor(check: TestAgentRequiredCheck, input: {
  workOrder: NormalizedTestAgentWorkOrder;
  commandResults: CommandRunResult[];
  devServerResults: DevServerResult[];
  httpResults: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
  browserToolCalls: BrowserToolCallRecord[];
}): RequiredCheckCoverageItem {
  const normalized = norm(check);
  let signal: Signal;
  if (/^commands?$/.test(normalized)) signal = anyCommandSignal(input.commandResults);
  else if (/build|unit|test|type|tsc|typescript|lint|eslint/.test(normalized)) {
    signal = commandSignal(input.commandResults, commandPatternsFor(normalized, input.workOrder), `No command evidence matched required check "${check}".`);
  } else if (/console_log|browser_console_log/.test(normalized)) signal = browserLogSignal(input.browserResults, "console");
  else if (/console.*warnings?|warnings?.*console|no_console_warnings?|console_no_warnings?/.test(normalized)) signal = consoleWarningSignal(input.browserResults);
  else if (/network_log|browser_network_log/.test(normalized)) signal = browserLogSignal(input.browserResults, "network");
  else if (/browser_dialog_log|dialog_log/.test(normalized)) signal = browserInteractionLogSignal(input.browserResults, "dialog");
  else if (/browser_popup_log|popup_log/.test(normalized)) signal = browserInteractionLogSignal(input.browserResults, "popup");
  else if (/browser_network_state|network_state|browser_online|browser_offline|online_state|offline_state|(^|_)online(_|$)|(^|_)offline(_|$)/.test(normalized)) signal = browserNetworkStateSignal(input.browserResults);
  else if (/browser_network|browser_requests?|browser_responses?|network_assertions?/.test(normalized)) signal = browserNetworkSignal(input.browserResults);
  else if (/browser_trace|trace/.test(normalized)) signal = browserArtifactSignal(input.browserResults, "trace");
  else if (/browser_har|\bhar\b/.test(normalized)) signal = browserArtifactSignal(input.browserResults, "har");
  else if (/browser_video|video/.test(normalized)) signal = browserArtifactSignal(input.browserResults, "video");
  else if (/browser_download|file_download|download_assertions?|downloads?/.test(normalized) || normalized === "download") signal = browserDownloadSignal(input.browserResults);
  else if (/browser_accessibility_snapshot|accessibility_snapshot|a11y_snapshot|aria_snapshot_artifact/.test(normalized)) signal = browserArtifactSignal(input.browserResults, "accessibility_snapshot");
  else if (/browser_accessibility|accessibility|a11y|screen_reader|aria_assertions?|aria_state|aria\b/.test(normalized)) signal = browserAccessibilitySignal(input.browserResults);
  else if (/browser_artifacts?|evidence_artifacts?/.test(normalized)) signal = browserArtifactSignal(input.browserResults, "any");
  else if (/browser_snapshot|dom_snapshot|page_snapshot|snapshots?/.test(normalized)) signal = browserSnapshotSignal(input.browserResults);
  else if (/browser_visual|visual_assertions?|visuals?|element_visual|element_screenshot|chart_render|canvas_render/.test(normalized) || normalized === "visual") signal = browserVisualSignal(input.browserResults);
  else if (/browser_layout|layout_assertions?|layout|in_viewport|horizontal_overflow/.test(normalized)) signal = browserLayoutSignal(input.browserResults);
  else if (/(^|_)(form_state|control_state|input_values?|selected_value|selected_text|checked_state|enabled_state|disabled_state)(_|$)/.test(normalized) || /(^|_)(selected|checked|not_checked|enabled|disabled)(_|$)/.test(normalized)) signal = browserFormStateSignal(input.browserResults);
  else if (/browser_forms?|form_flows?|form_submits?|form_submission|form_validation|(^|_)forms?(_|$)/.test(normalized)) signal = browserFormSignal(input.browserResults);
  else if (/browser_tables?|table_assertions?|table_rows?|table_cells?|data_tables?|(^|_)tables?(_|$)/.test(normalized)) signal = browserTableSignal(input.browserResults);
  else if (/browser_lists?|list_assertions?|element_counts?|item_counts?|collection_counts?|card_counts?|(^|_)lists?(_|$)/.test(normalized)) signal = browserListSignal(input.browserResults);
  else if (/browser_text_order|text_order|content_order|sort_order|sorted_order|ordering|ordered_text/.test(normalized)) signal = browserTextOrderSignal(input.browserResults);
  else if (/browser_url|url_assertions?|route_assertions?|route_url|current_url|url_state/.test(normalized) || normalized === "url") signal = browserUrlSignal(input.browserResults);
  else if (/browser_title|title_assertions?|document_title|page_title/.test(normalized) || normalized === "title") signal = browserTitleSignal(input.browserResults);
  else if (/browser_navigation|navigation_assertions?|url_transition|route_transition|route_change|page_navigation/.test(normalized) || normalized === "navigation") signal = browserNavigationSignal(input.browserResults);
  else if (/browser_attribute|attribute_assertions?|dom_attributes?|aria_attribute|data_attribute/.test(normalized) || normalized === "attribute") signal = browserAttributeSignal(input.browserResults);
  else if (/browser_presence|browser_visibility|presence_assertions?|visibility_assertions?|dom_presence|element_presence|element_visibility/.test(normalized) || normalized === "presence" || normalized === "visibility") signal = browserPresenceSignal(input.browserResults);
  else if (/browser_hover|hover_actions?|hover_interactions?|hover_state/.test(normalized) || normalized === "hover") signal = browserHoverSignal(input.browserResults);
  else if (/browser_drag|drag_drop|drag_and_drop|drag_actions?|drop_actions?/.test(normalized) || normalized === "drag") signal = browserDragSignal(input.browserResults);
  else if (/browser_scroll|scroll_actions?|scroll_interactions?|scroll_position/.test(normalized) || normalized === "scroll") signal = browserScrollSignal(input.browserResults);
  else if (/browser_history|history_navigation|browser_reload|reload_actions?|browser_back|browser_forward|back_forward/.test(normalized) || normalized === "history" || normalized === "reload") signal = browserHistorySignal(input.browserResults);
  else if (/browser_script|browser_javascript|browser_js|js_assertions?|javascript_assertions?|script_assertions?|browser_evaluate|page_expression/.test(normalized) || normalized === "javascript" || normalized === "js") signal = browserScriptSignal(input.browserResults);
  else if (/browser_wait|wait_assertions?|wait_conditions?|wait_for_selector|wait_for_text|wait_for_url|async_ui/.test(normalized) || normalized === "wait") signal = browserWaitSignal(input.browserResults);
  else if (/responsive|mobile|viewport|small_screen|phone|horizontal_overflow|overflow/.test(normalized)) signal = responsiveSignal(input.browserResults);
  else if (/web_storage|browser_storage|local_storage|session_storage|localstorage|sessionstorage/.test(normalized) || normalized === "storage") signal = browserStorageSignal(input.browserResults);
  else if (/browser_cookie|cookie_assertions?|cookie_actions?|cookies?/.test(normalized) || normalized === "cookie") signal = browserCookieSignal(input.browserResults);
  else if (/browser_clipboard|clipboard_assertions?|clipboard_actions?|clipboards?/.test(normalized) || normalized === "clipboard") signal = browserClipboardSignal(input.browserResults);
  else if (/browser_focus|focus_assertions?|focus_state|focused|keyboard_focus/.test(normalized) || normalized === "focus") signal = browserFocusSignal(input.browserResults);
  else if (/browser_keyboard|keyboard_actions?|keyboard_input|keyboard_shortcuts?|hotkeys?|shortcuts?/.test(normalized) || normalized === "keyboard") signal = browserKeyboardSignal(input.browserResults);
  else if (/browser_upload|file_upload|upload_assertions?|uploads?/.test(normalized) || normalized === "upload") signal = browserUploadSignal(input.browserResults);
  else if (/browser_dialog|dialog_assertions?|dialogs?|alerts?|confirms?|prompts?/.test(normalized) || normalized === "dialog") signal = browserDialogSignal(input.browserResults);
  else if (/browser_popup|popup_assertions?|popups?|new_tab|new_window/.test(normalized) || normalized === "popup") signal = browserPopupSignal(input.browserResults);
  else if (/browser|e2e|playwright|cypress/.test(normalized)) signal = browserSignal(input.browserResults, `No browser result was recorded for required check "${check}".`);
  else if (/screenshots?/.test(normalized)) signal = screenshotSignal(input.browserResults);
  else if (/console/.test(normalized)) signal = consoleSignal(input.browserResults);
  else if (/network/.test(normalized)) signal = networkSignal(input.browserResults, input.httpResults);
  else if (/http|api/.test(normalized)) signal = httpSignal(input.httpResults, item => !item.adversarial, `No HTTP/API result was recorded for required check "${check}".`);
  else if (/adversarial|boundary|orphan|idempot/.test(normalized)) signal = adversarialSignal(input.httpResults, input.browserResults, `No adversarial probe result was recorded for required check "${check}".`);
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

export function buildRequiredCheckCoverage(input: {
  workOrder: NormalizedTestAgentWorkOrder;
  commandResults: CommandRunResult[];
  devServerResults: DevServerResult[];
  httpResults: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
  browserToolCalls: BrowserToolCallRecord[];
}): RequiredCheckCoverageItem[] {
  return input.workOrder.requiredChecks.map(check => coverageFor(check, input));
}

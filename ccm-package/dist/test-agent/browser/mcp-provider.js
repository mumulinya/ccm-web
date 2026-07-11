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
exports.McpBrowserProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const mcp_adapters_1 = require("./mcp-adapters");
const evidence_artifacts_1 = require("./evidence-artifacts");
const mcp_failure_screenshots_1 = require("./mcp-failure-screenshots");
const provider_types_1 = require("./provider-types");
const screenshot_artifacts_1 = require("./screenshot-artifacts");
const shared_1 = require("./shared");
const multi_session_1 = require("./multi-session");
const stability_summary_1 = require("./stability-summary");
const authentication_1 = require("./authentication");
const existing_session_1 = require("./existing-session");
const action_effects_1 = require("./action-effects");
async function listTools(context) {
    const listed = await context.runtime.browserToolExecutor?.listTools?.();
    return Array.isArray(listed) ? listed.map(String) : [];
}
async function callTool(context, tool, input) {
    return context.runtime.browserToolExecutor.callTool(tool, input);
}
function browserTools(tools) {
    return tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
}
function authenticatedSessionSafeUrl(value) {
    try {
        const url = new URL(String(value || ""));
        return `${url.origin}${url.pathname}`;
    }
    catch {
        return String(value || "").split(/[?#]/)[0];
    }
}
function minimalAuthenticatedSessionSteps(steps) {
    return steps.map(step => ({
        ...step,
        detail: step.status === "passed" ? "authenticated browser step executed; raw detail suppressed" : undefined,
        ...(step.error ? { error: "Authenticated browser step failed; raw provider detail suppressed." } : {}),
    }));
}
function minimalExistingSessionBlockedError(error) {
    const message = String(error?.message || error || "");
    if (/tabs_context_mcp/i.test(message)) {
        return "Existing authenticated Chrome verification is blocked because tabs_context_mcp is unavailable.";
    }
    if (/tabs_create_mcp/i.test(message)) {
        return "Existing authenticated Chrome verification is blocked because tabs_create_mcp is unavailable.";
    }
    if (/\blist_pages\b/i.test(message)) {
        return "Existing authenticated Chrome verification is blocked because list_pages is unavailable.";
    }
    if (/\bnew_page\b/i.test(message)) {
        return "Existing authenticated Chrome verification is blocked because new_page is unavailable.";
    }
    return "Existing authenticated browser verification was blocked; raw provider detail suppressed.";
}
function writeMcpPageSnapshot(artifactDir, projectName, checkName, index, pageText) {
    const text = String(pageText || "").trim();
    if (!text)
        return [];
    const snapshotDir = (0, utils_1.ensureDir)(path.join(artifactDir, "page-snapshots"));
    const snapshotPath = path.join(snapshotDir, `${(0, utils_1.safeSegment)(projectName)}-${(0, utils_1.safeSegment)(checkName)}-${index + 1}.txt`);
    fs.writeFileSync(snapshotPath, `${text}\n`, "utf-8");
    return [snapshotPath];
}
function writeMcpTelemetryLogs(input) {
    const telemetryDir = (0, utils_1.ensureDir)(path.join(input.artifactDir, "browser-telemetry"));
    const base = `${(0, utils_1.safeSegment)(input.projectName)}-${(0, utils_1.safeSegment)(input.checkName)}-${input.index + 1}`;
    const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
    const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
    fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
    fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
    return { consoleLogPath, networkLogPath };
}
async function runMcpCheck(context, tools, project, check, index) {
    const startedAt = (0, utils_1.nowIso)();
    const started = Date.now();
    const steps = [];
    const name = check.name || `MCP browser check ${index + 1}`;
    const url = (0, utils_1.resolveUrl)(project.targetUrl, check.url || project.targetUrl);
    const consoleErrors = [];
    const pageErrors = [];
    const networkErrors = [];
    const screenshots = [];
    const browserArtifacts = [];
    const actionEffects = [];
    const pageSnapshots = [];
    const consoleMessages = [];
    const networkRequests = [];
    const existingSessionConfig = (0, existing_session_1.browserExistingSessionConfig)(check);
    const minimalExistingSessionEvidence = existingSessionConfig?.evidencePolicy === "minimal";
    const adapter = (0, mcp_adapters_1.createMcpBrowserAdapter)(tools, (toolName, input) => callTool(context, toolName, input), existingSessionConfig
        ? { existingSession: true, preferredAdapter: existingSessionConfig.provider }
        : {});
    const screenshotConfigured = check.screenshot !== false;
    const normalScreenshotRequested = screenshotConfigured && !minimalExistingSessionEvidence;
    const existingSessionAuthentication = () => {
        if (!existingSessionConfig || !adapter || (adapter.id !== "claude-in-chrome" && adapter.id !== "chrome-devtools"))
            return undefined;
        const contextEvidence = adapter.existingSessionContextEvidence?.() || {
            provider: adapter.id,
            tabContextChecked: false,
            createdNewTab: false,
        };
        return (0, existing_session_1.buildExistingSessionAuthenticationEvidence)({
            ...contextEvidence,
            evidencePolicy: existingSessionConfig.evidencePolicy,
            pageTextObserved: Boolean(pageTextObserved),
            consoleMessageCount: consoleMessages.length,
            networkRequestCount: networkRequests.length,
            ...(minimalExistingSessionEvidence && screenshotConfigured ? { screenshotSuppressed: true } : {}),
            ...(minimalExistingSessionEvidence ? { transcriptDetailsSuppressed: true } : {}),
        });
    };
    const browserRecovery = () => adapter?.browserRecoveryEvidence?.();
    let pageTextObserved = false;
    const captureActionEffectObservation = async () => {
        const pageText = await adapter?.pageText?.() || "";
        if (pageText)
            pageTextObserved = true;
        return {
            url: adapter?.currentUrl || "",
            pageText,
        };
    };
    if ((0, multi_session_1.hasMultiSessionBrowserScenario)(check)) {
        return {
            provider: "mcp",
            project: project.name,
            name,
            url,
            status: "blocked",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
            durationMs: Date.now() - started,
            steps: [],
            screenshots: [],
            pageSnapshots: [],
            consoleMessages: [],
            consoleErrors: [],
            pageErrors: [],
            networkRequests: [],
            networkErrors: [],
            browserArtifacts: [],
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type || multi_session_1.MULTI_SESSION_BROWSER_PROBE_TYPE,
            context: { ...(check.context || {}), ...(0, multi_session_1.browserSessionScenarioMetadata)(check) },
            error: "MCP browser providers cannot execute deterministic isolated multi-session scenarios; use Playwright.",
        };
    }
    if (!adapter) {
        return {
            provider: "mcp",
            project: project.name,
            name,
            url,
            status: "blocked",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
            durationMs: Date.now() - started,
            steps,
            screenshots,
            pageSnapshots,
            consoleMessages,
            consoleErrors,
            pageErrors,
            networkRequests,
            networkErrors,
            browserArtifacts,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
            authentication: existingSessionAuthentication(),
            error: existingSessionConfig
                ? `No ${existingSessionConfig.provider === "auto" ? "Claude in Chrome or Chrome DevTools" : existingSessionConfig.provider} MCP adapter matched the existing authenticated browser session requirement.`
                : "No supported MCP browser adapter matched the available tools.",
        };
    }
    try {
        if (existingSessionConfig) {
            if (!adapter.prepareExistingSession) {
                throw new Error(`${adapter.label} cannot prepare an existing authenticated browser session.`);
            }
            await adapter.prepareExistingSession(url);
        }
        const actions = check.actions?.length ? check.actions : [{ type: "goto", url }];
        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
            const action = actions[actionIndex];
            const verifyEffect = (0, action_effects_1.browserActionEffectRequired)(action);
            const beforeObservation = verifyEffect
                ? await captureActionEffectObservation().catch(() => ({}))
                : {};
            const step = await adapter.runAction(project, action, Number(action.timeoutMs || action.timeout_ms || context.workOrder.options.browserTimeoutMs));
            steps.push(step);
            if (step.status === "failed")
                break;
            if (verifyEffect) {
                const verified = await (0, action_effects_1.verifyBrowserActionEffect)({
                    provider: "mcp",
                    action,
                    actionIndex,
                    defaultTimeout: context.workOrder.options.browserTimeoutMs,
                    beforeObservation,
                    capture: captureActionEffectObservation,
                });
                actionEffects.push(verified.evidence);
                steps.push(verified.step);
                if (verified.step.status === "failed")
                    break;
            }
        }
        const readConsoleMessages = adapter.readConsoleMessages;
        if (typeof readConsoleMessages === "function") {
            consoleMessages.push(...await readConsoleMessages.call(adapter).catch((error) => [`console read failed: ${error.message || String(error)}`]));
        }
        consoleErrors.push(...await adapter.readConsoleErrors().catch((error) => [`console read failed: ${error.message || String(error)}`]));
        networkRequests.push(...await adapter.readNetworkRequests().catch((error) => [`network read failed: ${error.message || String(error)}`]));
        networkErrors.push(...await adapter.readNetworkErrors().catch((error) => [`network read failed: ${error.message || String(error)}`]));
        if (!consoleMessages.length)
            consoleMessages.push(...consoleErrors.map(item => `error: ${item}`));
        if (!networkRequests.length)
            networkRequests.push(...networkErrors.map(item => `error: ${item}`));
        const pageText = await adapter.pageText?.().catch((error) => {
            pageErrors.push(`page text read failed: ${error.message || String(error)}`);
            return "";
        }) || "";
        pageTextObserved = Boolean(pageText);
        if (!steps.some(step => step.status === "failed")) {
            for (const assertion of check.assertions || []) {
                const step = await adapter.runAssertion(assertion, { pageText, consoleMessages, consoleErrors, networkRequests, networkErrors }, Number(assertion.timeoutMs || assertion.timeout_ms || context.workOrder.options.browserTimeoutMs));
                steps.push(step);
            }
        }
        if (context.workOrder.options.failOnConsoleError && consoleErrors.length && !(check.assertions || []).some(item => item.type === "consoleNoErrors")) {
            steps.push({ kind: "assertion", name: `${adapter.id}:consoleNoErrors`, status: "failed", error: consoleErrors.slice(0, 3).join(" | ") });
        }
        if (networkErrors.length && !(check.assertions || []).some(item => item.type === "networkNoErrors")) {
            steps.push({ kind: "assertion", name: `${adapter.id}:networkNoErrors`, status: "failed", error: networkErrors.slice(0, 3).join(" | ") });
        }
        if (pageErrors.length) {
            steps.push({ kind: "assertion", name: `${adapter.id}:pageText`, status: "failed", error: pageErrors.slice(0, 3).join(" | ") });
        }
        if (normalScreenshotRequested) {
            try {
                const captures = await adapter.captureScreenshot(name);
                screenshots.push(...(0, screenshot_artifacts_1.writeMcpScreenshotArtifacts)({
                    artifactDir: context.workOrder.options.artifactDir,
                    projectName: project.name,
                    checkName: name,
                    index,
                    captures,
                }));
                if (context.workOrder.options.collectBrowserArtifacts) {
                    browserArtifacts.push(...(0, evidence_artifacts_1.writeBrowserEvidenceArtifacts)({
                        artifactDir: context.workOrder.options.artifactDir,
                        projectName: project.name,
                        checkName: name,
                        index,
                        captures,
                        source: `${adapter.id}:captureScreenshot`,
                    }));
                }
            }
            catch (error) {
                screenshots.push(`screenshot failed: ${error.message || String(error)}`);
            }
        }
        const failedStep = steps.find(step => step.status === "failed");
        if (failedStep && !normalScreenshotRequested && !minimalExistingSessionEvidence) {
            const failureCapture = await (0, mcp_failure_screenshots_1.captureMcpFailureScreenshot)({
                adapter,
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                failedStep,
                collectBrowserArtifacts: context.workOrder.options.collectBrowserArtifacts,
            });
            screenshots.push(...failureCapture.screenshots);
            browserArtifacts.push(...failureCapture.browserArtifacts);
        }
        if (!minimalExistingSessionEvidence) {
            pageSnapshots.push(...writeMcpPageSnapshot(context.workOrder.options.artifactDir, project.name, name, index, pageText));
        }
        const telemetryLogs = minimalExistingSessionEvidence
            ? {}
            : writeMcpTelemetryLogs({
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                consoleMessages,
                networkRequests,
            });
        const failed = steps.some(step => step.status === "failed");
        const resultSteps = minimalExistingSessionEvidence ? minimalAuthenticatedSessionSteps(steps) : steps;
        const resultUrl = minimalExistingSessionEvidence ? authenticatedSessionSafeUrl(url) : url;
        const resultFinalUrl = minimalExistingSessionEvidence
            ? authenticatedSessionSafeUrl(adapter.currentUrl || url)
            : adapter.currentUrl || url;
        return {
            provider: "mcp",
            project: project.name,
            name,
            url: resultUrl,
            ...(!minimalExistingSessionEvidence ? { finalUrl: resultFinalUrl } : {}),
            ...(!minimalExistingSessionEvidence && pageText ? { pageTextPreview: (0, utils_1.compactText)(pageText, 2000) } : {}),
            authentication: existingSessionAuthentication(),
            ...(browserRecovery() ? { recovery: browserRecovery() } : {}),
            status: failed ? "failed" : "passed",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
            durationMs: Date.now() - started,
            steps: resultSteps,
            screenshots: minimalExistingSessionEvidence ? [] : screenshots,
            pageSnapshots,
            consoleMessages: minimalExistingSessionEvidence ? [] : consoleMessages,
            consoleErrors: minimalExistingSessionEvidence && consoleErrors.length ? ["Authenticated browser console errors were observed; raw details suppressed."] : consoleErrors,
            pageErrors: minimalExistingSessionEvidence && pageErrors.length ? ["Authenticated browser page errors were observed; raw details suppressed."] : pageErrors,
            networkRequests: minimalExistingSessionEvidence ? [] : networkRequests,
            networkErrors: minimalExistingSessionEvidence && networkErrors.length ? ["Authenticated browser network errors were observed; raw details suppressed."] : networkErrors,
            browserArtifacts: minimalExistingSessionEvidence ? [] : browserArtifacts,
            actionEffects: minimalExistingSessionEvidence
                ? (0, action_effects_1.suppressBrowserActionEffectDetails)(actionEffects)
                : actionEffects,
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
        };
    }
    catch (error) {
        if (adapter && !normalScreenshotRequested && !minimalExistingSessionEvidence) {
            const failureCapture = await (0, mcp_failure_screenshots_1.captureMcpFailureScreenshot)({
                adapter,
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                failedStep: steps.find(step => step.status === "failed"),
                collectBrowserArtifacts: context.workOrder.options.collectBrowserArtifacts,
            });
            screenshots.push(...failureCapture.screenshots);
            browserArtifacts.push(...failureCapture.browserArtifacts);
        }
        return {
            provider: "mcp",
            project: project.name,
            name,
            url: minimalExistingSessionEvidence ? authenticatedSessionSafeUrl(url) : url,
            authentication: existingSessionAuthentication(),
            ...(browserRecovery() ? { recovery: browserRecovery() } : {}),
            status: "blocked",
            startedAt,
            finishedAt: (0, utils_1.nowIso)(),
            durationMs: Date.now() - started,
            steps: minimalExistingSessionEvidence ? minimalAuthenticatedSessionSteps(steps) : steps,
            screenshots: minimalExistingSessionEvidence ? [] : screenshots,
            pageSnapshots,
            consoleMessages: minimalExistingSessionEvidence ? [] : consoleMessages,
            consoleErrors: minimalExistingSessionEvidence && consoleErrors.length ? ["Authenticated browser console errors were observed; raw details suppressed."] : consoleErrors,
            pageErrors: minimalExistingSessionEvidence && pageErrors.length ? ["Authenticated browser page errors were observed; raw details suppressed."] : pageErrors,
            networkRequests: minimalExistingSessionEvidence ? [] : networkRequests,
            networkErrors: minimalExistingSessionEvidence && networkErrors.length ? ["Authenticated browser network errors were observed; raw details suppressed."] : networkErrors,
            browserArtifacts: minimalExistingSessionEvidence ? [] : browserArtifacts,
            actionEffects: minimalExistingSessionEvidence
                ? (0, action_effects_1.suppressBrowserActionEffectDetails)(actionEffects)
                : actionEffects,
            ...(minimalExistingSessionEvidence ? {} : writeMcpTelemetryLogs({
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                consoleMessages,
                networkRequests,
            })),
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
            error: minimalExistingSessionEvidence
                ? minimalExistingSessionBlockedError(error)
                : error.message || String(error),
        };
    }
}
exports.McpBrowserProvider = {
    id: "mcp",
    label: "MCP browser tools",
    async availability(context) {
        if (!context.runtime.browserToolExecutor)
            return { available: false, reason: "No browserToolExecutor was supplied." };
        const tools = await listTools(context).catch(() => []);
        const availableBrowserTools = browserTools(tools);
        if (!availableBrowserTools.length)
            return { available: false, reason: "No MCP browser tools were listed.", tools };
        const adapter = (0, mcp_adapters_1.createMcpBrowserAdapter)(availableBrowserTools, (toolName, input) => callTool(context, toolName, input));
        if (!adapter)
            return { available: false, reason: "MCP browser tools exist, but no supported adapter matched them.", tools: availableBrowserTools };
        return { available: true, tools: availableBrowserTools };
    },
    async run(context) {
        const availability = await this.availability(context);
        if (!availability.available)
            return [(0, provider_types_1.blockedBrowserResult)("mcp", "MCP browser provider", availability.reason || "MCP browser provider unavailable.")];
        const tools = availability.tools || [];
        const results = [];
        const routedChecks = context.workOrder.projects
            .flatMap(project => (0, shared_1.checksForProject)(project, context.workOrder.acceptanceCriteria)
            .map((check, index) => ({ project, check, index }))
            .filter(item => !context.checkFilter || context.checkFilter(item.project, item.check, item.index)));
        if (!routedChecks.length)
            return [];
        const stabilityCheck = routedChecks
            .map(item => item.check)
            .find(check => (0, stability_summary_1.browserCheckStabilityRuns)(check) > 1);
        if (stabilityCheck) {
            return [(0, provider_types_1.blockedBrowserResult)("mcp", "MCP browser stability verification", "MCP browser providers cannot guarantee a fresh isolated browser context for each stability run; use Playwright.")];
        }
        const authenticationCheck = routedChecks
            .find(item => (0, authentication_1.browserCheckRequiresManagedAuthentication)(item.check));
        if (authenticationCheck) {
            return [(0, provider_types_1.blockedBrowserResult)("mcp", "MCP authenticated browser verification", `Browser check "${authenticationCheck.check.name || "Browser check"}" for project "${authenticationCheck.project.name}" uses credential environment bindings or a storage-state file. TestAgent keeps those inputs inside an isolated Playwright context and does not send them through MCP browser tool calls; use Playwright.`)];
        }
        for (const project of context.workOrder.projects) {
            const checks = (0, shared_1.checksForProject)(project, context.workOrder.acceptanceCriteria);
            for (let i = 0; i < checks.length; i += 1) {
                if (context.checkFilter && !context.checkFilter(project, checks[i], i))
                    continue;
                results.push(await runMcpCheck(context, tools, project, checks[i], i));
            }
        }
        return results;
    },
};
//# sourceMappingURL=mcp-provider.js.map
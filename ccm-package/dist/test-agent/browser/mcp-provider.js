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
    const pageSnapshots = [];
    const consoleMessages = [];
    const networkRequests = [];
    const adapter = (0, mcp_adapters_1.createMcpBrowserAdapter)(tools, (toolName, input) => callTool(context, toolName, input));
    const normalScreenshotRequested = check.screenshot !== false;
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
            error: "No supported MCP browser adapter matched the available tools.",
        };
    }
    try {
        const actions = check.actions?.length ? check.actions : [{ type: "goto", url }];
        for (const action of actions) {
            const step = await adapter.runAction(project, action, Number(action.timeoutMs || action.timeout_ms || context.workOrder.options.browserTimeoutMs));
            steps.push(step);
            if (step.status === "failed")
                break;
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
        if (failedStep && !normalScreenshotRequested) {
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
        pageSnapshots.push(...writeMcpPageSnapshot(context.workOrder.options.artifactDir, project.name, name, index, pageText));
        const telemetryLogs = writeMcpTelemetryLogs({
            artifactDir: context.workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            consoleMessages,
            networkRequests,
        });
        const failed = steps.some(step => step.status === "failed");
        return {
            provider: "mcp",
            project: project.name,
            name,
            url,
            finalUrl: adapter.currentUrl || url,
            ...(pageText ? { pageTextPreview: (0, utils_1.compactText)(pageText, 2000) } : {}),
            status: failed ? "failed" : "passed",
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
            ...telemetryLogs,
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
        };
    }
    catch (error) {
        if (adapter && !normalScreenshotRequested) {
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
            ...writeMcpTelemetryLogs({
                artifactDir: context.workOrder.options.artifactDir,
                projectName: project.name,
                checkName: name,
                index,
                consoleMessages,
                networkRequests,
            }),
            adversarial: check.adversarial === true,
            probeType: check.probeType || check.probe_type,
            context: check.context,
            error: error.message || String(error),
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
        for (const project of context.workOrder.projects) {
            const checks = (0, shared_1.checksForProject)(project, context.workOrder.acceptanceCriteria);
            for (let i = 0; i < checks.length; i += 1) {
                results.push(await runMcpCheck(context, tools, project, checks[i], i));
            }
        }
        return results;
    },
};
//# sourceMappingURL=mcp-provider.js.map
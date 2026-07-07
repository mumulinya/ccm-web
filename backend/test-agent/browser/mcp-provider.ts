import * as fs from "fs";
import * as path from "path";
import {
  BrowserActionSpec,
  BrowserCheckResult,
  BrowserCheckSpec,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, ensureDir, nowIso, resolveUrl, safeSegment } from "../utils";
import { createMcpBrowserAdapter } from "./mcp-adapters";
import { writeBrowserEvidenceArtifacts } from "./evidence-artifacts";
import { BrowserProvider, BrowserProviderContext, blockedBrowserResult } from "./provider-types";
import { writeMcpScreenshotArtifacts } from "./screenshot-artifacts";
import { checksForProject } from "./shared";

async function listTools(context: BrowserProviderContext) {
  const listed = await context.runtime.browserToolExecutor?.listTools?.();
  return Array.isArray(listed) ? listed.map(String) : [];
}

async function callTool(context: BrowserProviderContext, tool: string, input: Record<string, any>) {
  return context.runtime.browserToolExecutor!.callTool(tool, input);
}

function browserTools(tools: string[]) {
  return tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
}

function writeMcpPageSnapshot(artifactDir: string, projectName: string, checkName: string, index: number, pageText: string) {
  const text = String(pageText || "").trim();
  if (!text) return [];
  const snapshotDir = ensureDir(path.join(artifactDir, "page-snapshots"));
  const snapshotPath = path.join(snapshotDir, `${safeSegment(projectName)}-${safeSegment(checkName)}-${index + 1}.txt`);
  fs.writeFileSync(snapshotPath, `${text}\n`, "utf-8");
  return [snapshotPath];
}

function writeMcpTelemetryLogs(input: {
  artifactDir: string;
  projectName: string;
  checkName: string;
  index: number;
  consoleMessages: string[];
  networkRequests: string[];
}) {
  const telemetryDir = ensureDir(path.join(input.artifactDir, "browser-telemetry"));
  const base = `${safeSegment(input.projectName)}-${safeSegment(input.checkName)}-${input.index + 1}`;
  const consoleLogPath = path.join(telemetryDir, `${base}.console.log`);
  const networkLogPath = path.join(telemetryDir, `${base}.network.log`);
  fs.writeFileSync(consoleLogPath, `${input.consoleMessages.length ? input.consoleMessages.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
  fs.writeFileSync(networkLogPath, `${input.networkRequests.length ? input.networkRequests.join("\n") : "(none observed or provider returned no entries)"}\n`, "utf-8");
  return { consoleLogPath, networkLogPath };
}

async function runMcpCheck(context: BrowserProviderContext, tools: string[], project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number): Promise<BrowserCheckResult> {
  const startedAt = nowIso();
  const started = Date.now();
  const steps: BrowserStepResult[] = [];
  const name = check.name || `MCP browser check ${index + 1}`;
  const url = resolveUrl(project.targetUrl, check.url || project.targetUrl);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];
  const screenshots: string[] = [];
  const browserArtifacts: BrowserCheckResult["browserArtifacts"] = [];
  const pageSnapshots: string[] = [];
  const consoleMessages: string[] = [];
  const networkRequests: string[] = [];
  const adapter = createMcpBrowserAdapter(tools, (toolName, input) => callTool(context, toolName, input));

  if (!adapter) {
    return {
      provider: "mcp",
      project: project.name,
      name,
      url,
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
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
      error: "No supported MCP browser adapter matched the available tools.",
    };
  }

  try {
    const actions = check.actions?.length ? check.actions : [{ type: "goto", url } as BrowserActionSpec];
    for (const action of actions) {
      const step = await adapter.runAction(project, action, Number(action.timeoutMs || action.timeout_ms || context.workOrder.options.browserTimeoutMs));
      steps.push(step);
      if (step.status === "failed") break;
    }

    consoleErrors.push(...await adapter.readConsoleErrors().catch((error: any) => [`console read failed: ${error.message || String(error)}`]));
    networkErrors.push(...await adapter.readNetworkErrors().catch((error: any) => [`network read failed: ${error.message || String(error)}`]));
    consoleMessages.push(...consoleErrors.map(item => `error: ${item}`));
    networkRequests.push(...networkErrors.map(item => `error: ${item}`));
    const pageText = await (adapter as any).pageText?.().catch((error: any) => {
      pageErrors.push(`page text read failed: ${error.message || String(error)}`);
      return "";
    }) || "";

    if (!steps.some(step => step.status === "failed")) {
      for (const assertion of check.assertions || []) {
        const step = await adapter.runAssertion(assertion, { pageText, consoleErrors, networkErrors }, Number(assertion.timeoutMs || assertion.timeout_ms || context.workOrder.options.browserTimeoutMs));
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
    if (check.screenshot !== false) {
      try {
        const captures = await adapter.captureScreenshot(name);
        screenshots.push(...writeMcpScreenshotArtifacts({
          artifactDir: context.workOrder.options.artifactDir,
          projectName: project.name,
          checkName: name,
          index,
          captures,
        }));
        if (context.workOrder.options.collectBrowserArtifacts) {
          browserArtifacts.push(...writeBrowserEvidenceArtifacts({
            artifactDir: context.workOrder.options.artifactDir,
            projectName: project.name,
            checkName: name,
            index,
            captures,
            source: `${adapter.id}:captureScreenshot`,
          }));
        }
      } catch (error: any) {
        screenshots.push(`screenshot failed: ${error.message || String(error)}`);
      }
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
      ...(pageText ? { pageTextPreview: compactText(pageText, 2000) } : {}),
      status: failed ? "failed" : "passed",
      startedAt,
      finishedAt: nowIso(),
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
    };
  } catch (error: any) {
    return {
      provider: "mcp",
      project: project.name,
      name,
      url,
      status: "blocked",
      startedAt,
      finishedAt: nowIso(),
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
      error: error.message || String(error),
    };
  }
}

export const McpBrowserProvider: BrowserProvider = {
  id: "mcp",
  label: "MCP browser tools",
  async availability(context) {
    if (!context.runtime.browserToolExecutor) return { available: false, reason: "No browserToolExecutor was supplied." };
    const tools = await listTools(context).catch(() => []);
    const availableBrowserTools = browserTools(tools);
    if (!availableBrowserTools.length) return { available: false, reason: "No MCP browser tools were listed.", tools };
    const adapter = createMcpBrowserAdapter(availableBrowserTools, (toolName, input) => callTool(context, toolName, input));
    if (!adapter) return { available: false, reason: "MCP browser tools exist, but no supported adapter matched them.", tools: availableBrowserTools };
    return { available: true, tools: availableBrowserTools };
  },
  async run(context) {
    const availability = await this.availability(context);
    if (!availability.available) return [blockedBrowserResult("mcp", "MCP browser provider", availability.reason || "MCP browser provider unavailable.")];
    const tools = availability.tools || [];
    const results: BrowserCheckResult[] = [];
    for (const project of context.workOrder.projects) {
      const checks = checksForProject(project, context.workOrder.acceptanceCriteria);
      for (let i = 0; i < checks.length; i += 1) {
        results.push(await runMcpCheck(context, tools, project, checks[i], i));
      }
    }
    return results;
  },
};

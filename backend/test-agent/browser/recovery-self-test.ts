import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runTestAgentForSelfTest as runTestAgent } from "../self-test-policy";
import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";
import { formatTestAgentCliExecutionPlanSummary } from "../cli";
import { validateTestAgentReportContract } from "../contract";
import { buildTestAgentExecutionPlan } from "../execution-plan";
import { buildTestAgentVerdict } from "../verdict";
import { createStaticBrowserToolExecutor } from "./tool-executor";

interface ToolCall {
  toolName: string;
  input: Record<string, any>;
}

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function refreshManifestItemIntegrity(manifestPath: string, artifactType: string) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const item = (manifest.files || []).find((entry: any) => entry.type === artifactType);
  if (!item?.path) return;
  const targetPath = path.resolve(item.path);
  const stat = fs.statSync(targetPath);
  const integrity = {
    exists: true,
    sizeBytes: stat.size,
    sha256: sha256File(targetPath),
  };
  for (const entry of manifest.files || []) {
    if (entry.type === artifactType || (entry.path && path.resolve(entry.path) === targetPath)) {
      entry.integrity = integrity;
    }
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

function recoveryWorkOrder(
  dir: string,
  options: {
    id: string;
    provider?: "claude-in-chrome" | "chrome-devtools";
    actions?: Array<Record<string, any>>;
    artifactDir?: string;
  },
) {
  const targetUrl = "https://app.example.test/workspace";
  return {
    id: options.id,
    originalUserGoal: "Verify the authenticated workspace after safe browser session recovery.",
    acceptanceCriteria: ["The authenticated workspace is visible and ready."],
    requiredChecks: ["browser_e2e", "browser_auth"],
    projects: [{
      name: "browser-recovery-self-test",
      workDir: dir,
      targetUrl,
      browserChecks: [{
        name: "Authenticated workspace recovery",
        authentication: {
          mode: "existing_session",
          provider: options.provider || "claude-in-chrome",
          evidencePolicy: "minimal",
        },
        actions: options.actions || [{ type: "goto", url: targetUrl }],
        assertions: [{ type: "text", text: "Workspace ready" }],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: options.artifactDir || path.join(dir, "artifacts"),
      browserProvider: "mcp",
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };
}

function claudeRecoveryTools(includeComputer = false) {
  return [
    "mcp__claude-in-chrome__tabs_context_mcp",
    "mcp__claude-in-chrome__tabs_create_mcp",
    "mcp__claude-in-chrome__navigate",
    "mcp__claude-in-chrome__get_page_text",
    ...(includeComputer ? ["mcp__claude-in-chrome__computer"] : []),
  ];
}

function callSuffixes(calls: ToolCall[]) {
  return calls.map(call => call.toolName.split("__").pop() || call.toolName);
}

export async function runTestAgentClaudeChromeRecoverySelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-claude-recovery-"));
  const secret = `stale-tab-${process.pid}-${Date.now()}`;
  const calls: ToolCall[] = [];
  let navigateCalls = 0;
  const input = recoveryWorkOrder(dir, {
    id: `claude-recovery-${process.pid}-${Date.now()}`,
  });
  const executor = createStaticBrowserToolExecutor({
    tools: claudeRecoveryTools(),
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__tabs_context_mcp")) {
        return { tabs: [{ id: `private-${secret}`, url: `https://private.example.test/${secret}` }] };
      }
      if (toolName.endsWith("__tabs_create_mcp")) {
        return { tabId: `verification-${secret}` };
      }
      if (toolName.endsWith("__navigate")) {
        navigateCalls += 1;
        if (navigateCalls === 1) {
          throw new Error(`No such tab verification-${secret}; url=https://private.example.test/${secret}`);
        }
        return { ok: true };
      }
      if (toolName.endsWith("__get_page_text")) return `Workspace ready ${secret}`;
      return [];
    },
  });

  const plan = buildTestAgentExecutionPlan(input as any);
  const planText = formatTestAgentCliExecutionPlanSummary(plan);
  const report = await runTestAgent(input as any, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const browser = report.browserResults[0];
  const recovery = browser?.recovery;
  const event = recovery?.events[0];
  const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
  const transcriptText = fs.readFileSync(transcriptPath, "utf-8");
  const reportText = JSON.stringify(report);
  const contract = validateTestAgentReportContract(report);
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
  const expectedPrefix = [
    "tabs_context_mcp",
    "tabs_create_mcp",
    "navigate",
    "tabs_context_mcp",
    "tabs_create_mcp",
    "navigate",
  ];

  const reportJsonPath = String((report.metadata.artifactFiles as any)?.reportJsonPath || "");
  const verdictJsonPath = String((report.metadata.artifactFiles as any)?.verdictJsonPath || "");
  const tamperedReport = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
  tamperedReport.browserResults[0].recovery.events[0].operation = "action:click";
  tamperedReport.browserResults[0].recovery.events[0].retrySafe = true;
  tamperedReport.browserResults[0].recovery.events[0].tabId = `raw-${secret}`;
  const tamperedVerdict = buildTestAgentVerdict(tamperedReport);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
  fs.writeFileSync(verdictJsonPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
  refreshManifestItemIntegrity(manifestPath, "report_json");
  refreshManifestItemIntegrity(manifestPath, "verdict_json");
  const tamperedContract = validateTestAgentReportContract(tamperedReport);
  const tamperedArtifacts = verifyTestAgentArtifactManifestFile(manifestPath);

  const pass = report.status === "passed"
    && browser?.status === "passed"
    && recovery?.maxAttempts === 1
    && recovery.attempted === 1
    && recovery.recovered === 1
    && recovery.failed === 0
    && recovery.notRetried === 0
    && event?.provider === "claude-in-chrome"
    && event.operation === "action:goto"
    && event.trigger === "stale_tab"
    && event.retrySafe === true
    && event.status === "recovered"
    && event.contextRefreshed === true
    && event.createdNewTab === true
    && event.attempt === 1
    && navigateCalls === 2
    && expectedPrefix.every((value, index) => callSuffixes(calls)[index] === value)
    && plan.summary.browserSessionRecoveryChecks === 1
    && plan.projects[0]?.browserChecks[0]?.sessionRecoveryEnabled === true
    && planText.includes("sessionRecovery:1")
    && !reportText.includes(secret)
    && !transcriptText.includes(secret)
    && contract.valid
    && artifactVerification.status === "passed"
    && artifactVerification.items.some(item => item.type === "browser_recovery_evidence" && item.status === "passed")
    && !tamperedContract.valid
    && tamperedArtifacts.status === "failed"
    && tamperedArtifacts.items.some(item =>
      item.type === "browser_recovery_evidence"
      && item.status === "failed"
      && /forbidden|replay policy|does not match/i.test(String(item.error || ""))
    );

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    contract,
    artifactVerification,
    tamperedContract,
    tamperedArtifacts,
    calls,
    plan,
  };
}

export async function runTestAgentUnsafeBrowserRecoverySelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-unsafe-recovery-"));
  const calls: ToolCall[] = [];
  let computerCalls = 0;
  const input = recoveryWorkOrder(dir, {
    id: `unsafe-recovery-${process.pid}-${Date.now()}`,
    artifactDir: path.join(dir, "artifacts"),
    actions: [
      { type: "goto", url: "https://app.example.test/workspace" },
      { type: "click", text: "Submit" },
    ],
  });
  const executor = createStaticBrowserToolExecutor({
    tools: claudeRecoveryTools(true),
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__tabs_context_mcp")) return { tabs: [] };
      if (toolName.endsWith("__tabs_create_mcp")) return { tabId: "verification-click" };
      if (toolName.endsWith("__navigate")) return { ok: true };
      if (toolName.endsWith("__computer")) {
        computerCalls += 1;
        throw new Error("Target closed while dispatching click to tab raw-click-id.");
      }
      if (toolName.endsWith("__get_page_text")) return "Workspace ready";
      return [];
    },
  });

  const report = await runTestAgent(input as any, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const browser = report.browserResults[0];
  const recovery = browser?.recovery;
  const event = recovery?.events[0];
  const suffixes = callSuffixes(calls);
  const pass = report.status === "failed"
    && browser?.status === "failed"
    && recovery?.attempted === 1
    && recovery.recovered === 0
    && recovery.failed === 0
    && recovery.notRetried === 1
    && event?.operation === "action:click"
    && event.retrySafe === false
    && event.status === "not_retried"
    && event.contextRefreshed === false
    && event.createdNewTab === false
    && computerCalls === 1
    && suffixes.filter(value => value === "computer").length === 1
    && suffixes.filter(value => value === "tabs_context_mcp").length === 1
    && suffixes.filter(value => value === "tabs_create_mcp").length === 1
    && validateTestAgentReportContract(report).valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return { pass, report, calls };
}

export async function runTestAgentFailedBrowserRecoverySelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-failed-recovery-"));
  const calls: ToolCall[] = [];
  let createCalls = 0;
  let navigateCalls = 0;
  const input = recoveryWorkOrder(dir, {
    id: `failed-recovery-${process.pid}-${Date.now()}`,
    artifactDir: path.join(dir, "artifacts"),
  });
  const executor = createStaticBrowserToolExecutor({
    tools: claudeRecoveryTools(),
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__tabs_context_mcp")) return { tabs: [] };
      if (toolName.endsWith("__tabs_create_mcp")) {
        createCalls += 1;
        if (createCalls === 2) throw new Error("Browser extension connection closed while creating recovery tab.");
        return { tabId: "verification-failed-recovery" };
      }
      if (toolName.endsWith("__navigate")) {
        navigateCalls += 1;
        throw new Error("Execution context destroyed because the frame navigated.");
      }
      return [];
    },
  });

  const report = await runTestAgent(input as any, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const browser = report.browserResults[0];
  const recovery = browser?.recovery;
  const event = recovery?.events[0];
  const suffixes = callSuffixes(calls);
  const pass = report.status === "failed"
    && browser?.status === "failed"
    && recovery?.attempted === 1
    && recovery.recovered === 0
    && recovery.failed === 1
    && recovery.notRetried === 0
    && event?.operation === "action:goto"
    && event.trigger === "navigation_context_lost"
    && event.retrySafe === true
    && event.status === "failed"
    && event.contextRefreshed === true
    && event.createdNewTab === false
    && navigateCalls === 1
    && createCalls === 2
    && suffixes.filter(value => value === "tabs_context_mcp").length === 2
    && validateTestAgentReportContract(report).valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return { pass, report, calls };
}

export async function runTestAgentChromeDevtoolsRecoverySelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-devtools-recovery-"));
  const secret = `devtools-stale-${process.pid}-${Date.now()}`;
  const calls: ToolCall[] = [];
  let snapshotCalls = 0;
  const input = recoveryWorkOrder(dir, {
    id: `devtools-recovery-${process.pid}-${Date.now()}`,
    provider: "chrome-devtools",
    artifactDir: path.join(dir, "artifacts"),
  });
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__chrome-devtools__list_pages",
      "mcp__chrome-devtools__new_page",
      "mcp__chrome-devtools__take_snapshot",
    ],
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__list_pages")) {
        return { pages: [{ id: `private-${secret}`, url: `https://private.example.test/${secret}` }] };
      }
      if (toolName.endsWith("__new_page")) return { id: `verification-${secret}` };
      if (toolName.endsWith("__take_snapshot")) {
        snapshotCalls += 1;
        if (snapshotCalls === 1) throw new Error(`Page not found: page-${secret}`);
        return `Workspace ready ${secret}`;
      }
      return [];
    },
  });

  const report = await runTestAgent(input as any, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const browser = report.browserResults[0];
  const recovery = browser?.recovery;
  const event = recovery?.events[0];
  const expectedSequence = [
    "list_pages",
    "new_page",
    "take_snapshot",
    "list_pages",
    "new_page",
    "take_snapshot",
  ];
  const suffixes = callSuffixes(calls);
  const pass = report.status === "passed"
    && browser?.status === "passed"
    && recovery?.attempted === 1
    && recovery.recovered === 1
    && event?.provider === "chrome-devtools"
    && event.operation === "observation:page_text"
    && event.trigger === "stale_tab"
    && event.status === "recovered"
    && event.contextRefreshed === true
    && event.createdNewTab === true
    && snapshotCalls === 2
    && expectedSequence.every((value, index) => suffixes[index] === value)
    && !JSON.stringify(report).includes(secret)
    && validateTestAgentReportContract(report).valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return { pass, report, calls };
}

import * as crypto from "crypto";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import {
  normalizeTestAgentWorkOrderForSelfTest as normalizeTestAgentWorkOrder,
  runTestAgentForSelfTest as runTestAgent,
} from "../self-test-policy";
import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";
import {
  validateTestAgentReportContract,
  validateTestAgentWorkOrderContract,
} from "../contract";
import { buildTestAgentExecutionPlan } from "../execution-plan";
import { buildTestAgentVerdict } from "../verdict";
import { PlaywrightBrowserProvider, checkPlaywrightAvailability } from "./playwright-provider";
import { createStaticBrowserToolExecutor } from "./tool-executor";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
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

function claudeChromeTools(options: { includeContext?: boolean } = {}) {
  return [
    "mcp__playwright__browser_navigate",
    ...(options.includeContext === false ? [] : ["mcp__claude-in-chrome__tabs_context_mcp"]),
    "mcp__claude-in-chrome__tabs_create_mcp",
    "mcp__claude-in-chrome__navigate",
    "mcp__claude-in-chrome__get_page_text",
    "mcp__claude-in-chrome__read_console_messages",
    "mcp__claude-in-chrome__read_network_requests",
    "mcp__claude-in-chrome__gif_creator",
  ];
}

function existingSessionWorkOrder(dir: string, options: {
  id: string;
  provider?: string;
  evidencePolicy?: string;
  artifactDir?: string;
}) {
  return {
    id: options.id,
    originalUserGoal: "Verify an OAuth-protected workspace in the user's existing Chrome session.",
    acceptanceCriteria: ["The authenticated workspace is visible and ready."],
    requiredChecks: ["browser_e2e", "browser_auth"],
    projects: [{
      name: "existing-session-self-test",
      workDir: dir,
      targetUrl: "https://app.example.test/workspace",
      browserChecks: [{
        name: "Authenticated workspace",
        authentication: {
          mode: "existing_session",
          provider: options.provider || "claude-in-chrome",
          evidencePolicy: options.evidencePolicy || "minimal",
        },
        actions: [{ type: "goto", url: "https://app.example.test/workspace" }],
        assertions: [
          { type: "text", text: "Workspace authenticated" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      artifactDir: options.artifactDir || path.join(dir, "artifacts"),
      browserProvider: "mcp",
      collectBrowserArtifacts: true,
      collectBrowserVideo: true,
    },
  };
}

function claudeChromeExecutor(
  calls: Array<{ toolName: string; input: Record<string, any> }>,
  options: { includeContext?: boolean; secret: string },
) {
  const secretTabId = `tab-${options.secret}`;
  return createStaticBrowserToolExecutor({
    tools: claudeChromeTools({ includeContext: options.includeContext }),
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__tabs_context_mcp")) {
        return {
          tabs: [{
            id: `existing-${options.secret}`,
            url: `https://mail.example.test/oauth?token=${options.secret}`,
            title: `Private ${options.secret}`,
          }],
        };
      }
      if (toolName.endsWith("__tabs_create_mcp")) {
        return {
          tabId: secretTabId,
          url: `https://app.example.test/workspace?session=${options.secret}`,
        };
      }
      if (toolName.endsWith("__get_page_text")) {
        return `Workspace authenticated. Private page payload ${options.secret}.`;
      }
      if (toolName.endsWith("__read_console_messages")) {
        return `info authenticated console payload ${options.secret}`;
      }
      if (toolName.endsWith("__read_network_requests")) {
        return `200 GET https://app.example.test/api/private?session=${options.secret}`;
      }
      return { ok: true, secret: options.secret };
    },
  });
}

export function runTestAgentExistingSessionContractSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-existing-session-contract-"));
  const input: any = {
    id: `existing-session-contract-${process.pid}-${Date.now()}`,
    originalUserGoal: "Normalize existing authenticated browser aliases.",
    acceptanceCriteria: ["OAuth workspace is verified in an existing Chrome session."],
    requiredChecks: ["browser_auth"],
    projects: [{
      name: "existing-session-contract",
      workDir: dir,
      targetUrl: "https://app.example.test",
      browserChecks: [{
        name: "OAuth alias",
        auth: {
          mode: "oauth",
          provider: "chrome_extension",
          evidence_policy: "privacy_first",
        },
        actions: [{ type: "goto", url: "/workspace" }],
      }],
    }],
    options: {
      artifactDir: path.join(dir, "artifacts"),
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
      collectBrowserVideo: true,
    },
  };
  const validation = validateTestAgentWorkOrderContract(input);
  const normalized = normalizeTestAgentWorkOrder(input);
  const check = normalized.workOrder.projects[0]?.browserChecks[0];
  const plan = buildTestAgentExecutionPlan(input, {}, validation);

  const conflictInput: any = {
    ...input,
    id: `${input.id}-conflicts`,
    projects: [{
      ...input.projects[0],
      browserChecks: [{
        name: "Invalid existing session",
        authentication: {
          mode: "existing_session",
          provider: "claude-in-chrome",
          evidencePolicy: "minimal",
          password: "raw-password",
        },
        storageStatePath: "state.json",
        stabilityRuns: 2,
        sessions: [{ name: "alice", url: "/workspace" }],
        actions: [{ type: "fill", label: "Email", valueEnv: "TEST_EMAIL" }],
      }],
    }],
  };
  const conflictValidation = validateTestAgentWorkOrderContract(conflictInput);
  const conflictNormalized = normalizeTestAgentWorkOrder(conflictInput);
  const pass = validation.valid
    && normalized.issues.every(issue => issue.severity !== "error")
    && check?.authentication?.mode === "existing_session"
    && check.authentication.provider === "claude-in-chrome"
    && check.authentication.evidencePolicy === "minimal"
    && plan.valid
    && plan.summary.browserAuthenticationChecks === 1
    && plan.summary.browserManagedAuthenticationChecks === 0
    && plan.summary.browserExistingSessionChecks === 1
    && plan.summary.browserExistingSessionMinimalEvidenceChecks === 1
    && plan.summary.browserExistingSessionFullEvidenceChecks === 0
    && plan.summary.browserExistingSessionProviders.join(",") === "claude-in-chrome"
    && plan.projects[0]?.browserChecks[0]?.authenticationMode === "existing_session"
    && plan.projects[0]?.browserChecks[0]?.existingSessionProvider === "claude-in-chrome"
    && plan.projects[0]?.browserChecks[0]?.existingSessionEvidencePolicy === "minimal"
    && !plan.summary.expectedArtifactTypes.includes("screenshot")
    && !plan.summary.expectedArtifactTypes.includes("browser_snapshot")
    && !plan.summary.expectedArtifactTypes.includes("browser_console_log")
    && !plan.summary.expectedArtifactTypes.includes("browser_network_log")
    && plan.browserProviderWarnings.some(item => item.item === "existingSession")
    && !conflictValidation.valid
    && conflictValidation.errors.some(issue => issue.message.includes("raw credentials"))
    && conflictNormalized.issues.filter(issue => issue.code === "browser_authentication_mode_conflict").length >= 4;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return { pass, validation, normalized, plan, conflictValidation, conflictNormalized };
}

export async function runTestAgentClaudeChromeExistingSessionSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-claude-existing-session-"));
  const minimalSecret = `minimal-secret-${process.pid}-${Date.now()}`;
  const minimalCalls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const minimalInput = existingSessionWorkOrder(dir, {
    id: `claude-existing-session-minimal-${process.pid}-${Date.now()}`,
    artifactDir: path.join(dir, "minimal-artifacts"),
  });
  const minimalReport = await runTestAgent(
    minimalInput as any,
    {
      browserProvider: "mcp",
      browserToolExecutor: claudeChromeExecutor(minimalCalls, { secret: minimalSecret }),
    },
  );
  const minimalBrowser = minimalReport.browserResults[0];
  const minimalEvidence = minimalBrowser?.authentication?.existingSession;
  const minimalReportText = JSON.stringify(minimalReport);
  const minimalTranscriptPath = String(minimalReport.metadata.browserToolTranscriptPath || "");
  const minimalTranscriptText = fs.readFileSync(minimalTranscriptPath, "utf-8");
  const minimalManifestPath = String((minimalReport.metadata.artifactFiles as any)?.manifestPath || "");
  const minimalContract = validateTestAgentReportContract(minimalReport);
  const minimalArtifacts = verifyTestAgentArtifactManifestFile(minimalManifestPath);
  const authCoverage = minimalReport.requiredCheckCoverage.find(item => item.check === "browser_auth");

  const transcriptOriginal = fs.readFileSync(minimalTranscriptPath, "utf-8");
  const transcriptLines = transcriptOriginal.trim().split(/\r?\n/).filter(Boolean);
  const transcriptTamper = JSON.parse(transcriptLines[0]);
  transcriptTamper.input = { tabId: `raw-${minimalSecret}` };
  transcriptTamper.outputPreview = `raw provider ${minimalSecret}`;
  transcriptLines[0] = JSON.stringify(transcriptTamper);
  fs.writeFileSync(minimalTranscriptPath, `${transcriptLines.join("\n")}\n`, "utf-8");
  refreshManifestItemIntegrity(minimalManifestPath, "browser_tool_transcript");
  const transcriptTamperedArtifacts = verifyTestAgentArtifactManifestFile(minimalManifestPath);
  fs.writeFileSync(minimalTranscriptPath, transcriptOriginal, "utf-8");
  refreshManifestItemIntegrity(minimalManifestPath, "browser_tool_transcript");

  const reportJsonPath = String((minimalReport.metadata.artifactFiles as any)?.reportJsonPath || "");
  const verdictJsonPath = String((minimalReport.metadata.artifactFiles as any)?.verdictJsonPath || "");
  const tamperedReport = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
  tamperedReport.browserResults[0].pageTextPreview = `raw page ${minimalSecret}`;
  tamperedReport.browserToolCalls[0].input = { tabId: `raw-${minimalSecret}` };
  const tamperedVerdict = buildTestAgentVerdict(tamperedReport);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify(tamperedReport, null, 2)}\n`, "utf-8");
  fs.writeFileSync(verdictJsonPath, `${JSON.stringify(tamperedVerdict, null, 2)}\n`, "utf-8");
  refreshManifestItemIntegrity(minimalManifestPath, "report_json");
  refreshManifestItemIntegrity(minimalManifestPath, "verdict_json");
  const tamperedContract = validateTestAgentReportContract(tamperedReport);
  const reportTamperedArtifacts = verifyTestAgentArtifactManifestFile(minimalManifestPath);

  const fullSecret = `full-secret-${process.pid}-${Date.now()}`;
  const fullCalls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const fullInput: any = existingSessionWorkOrder(dir, {
    id: `claude-existing-session-full-${process.pid}-${Date.now()}`,
    evidencePolicy: "full",
    artifactDir: path.join(dir, "full-artifacts"),
  });
  fullInput.projects[0].browserChecks[0].screenshot = false;
  const fullReport = await runTestAgent(fullInput, {
    browserProvider: "mcp",
    browserToolExecutor: claudeChromeExecutor(fullCalls, { secret: fullSecret }),
  });
  const fullBrowser = fullReport.browserResults[0];
  const fullContract = validateTestAgentReportContract(fullReport);
  const fullManifestPath = String((fullReport.metadata.artifactFiles as any)?.manifestPath || "");
  const fullArtifacts = verifyTestAgentArtifactManifestFile(fullManifestPath);

  const missingCalls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const missingInput = existingSessionWorkOrder(dir, {
    id: `claude-existing-session-missing-context-${process.pid}-${Date.now()}`,
    artifactDir: path.join(dir, "missing-artifacts"),
  });
  const missingReport = await runTestAgent(missingInput as any, {
    browserProvider: "mcp",
    browserToolExecutor: claudeChromeExecutor(missingCalls, {
      includeContext: false,
      secret: `missing-${process.pid}`,
    }),
  });
  const missingBrowser = missingReport.browserResults[0];
  const missingCoverage = missingReport.requiredCheckCoverage.find(item => item.check === "browser_auth");

  const pass = minimalReport.status === "passed"
    && minimalBrowser?.provider === "mcp"
    && minimalBrowser.status === "passed"
    && minimalEvidence?.provider === "claude-in-chrome"
    && minimalEvidence.evidencePolicy === "minimal"
    && minimalEvidence.tabContextChecked === true
    && minimalEvidence.tabCount === 1
    && minimalEvidence.createdNewTab === true
    && minimalEvidence.pageTextObserved === true
    && minimalEvidence.consoleMessageCount > 0
    && minimalEvidence.networkRequestCount > 0
    && minimalEvidence.screenshotSuppressed === true
    && minimalEvidence.transcriptDetailsSuppressed === true
    && minimalBrowser.authentication?.sensitiveArtifactsSuppressed === true
    && minimalCalls[0]?.toolName.endsWith("__tabs_context_mcp")
    && minimalCalls[1]?.toolName.endsWith("__tabs_create_mcp")
    && minimalCalls.some(call => call.toolName.endsWith("__navigate") && String(call.input.tabId || "").includes(minimalSecret))
    && minimalBrowser.screenshots.length === 0
    && !(minimalBrowser.pageSnapshots || []).length
    && !(minimalBrowser.browserArtifacts || []).length
    && !(minimalBrowser.consoleMessages || []).length
    && !(minimalBrowser.networkRequests || []).length
    && !minimalBrowser.finalUrl
    && !minimalBrowser.pageTextPreview
    && !minimalReportText.includes(minimalSecret)
    && !minimalTranscriptText.includes(minimalSecret)
    && minimalReport.browserToolCalls.every(call =>
      Array.isArray((call.input as any).inputKeys)
      && Object.keys(call.input).every(key => key === "inputKeys" || key === "action")
      && call.outputPreview === "[suppressed for existing authenticated browser session]"
    )
    && authCoverage?.status === "verified"
    && minimalContract.valid
    && minimalArtifacts.status === "passed"
    && transcriptTamperedArtifacts.status === "failed"
    && transcriptTamperedArtifacts.items.some(item =>
      item.type === "browser_authentication_evidence"
      && item.status === "failed"
      && String(item.error || "").includes("do not match")
    )
    && !tamperedContract.valid
    && reportTamperedArtifacts.status === "failed"
    && reportTamperedArtifacts.items.some(item =>
      item.type === "browser_authentication_evidence"
      && item.status === "failed"
      && String(item.error || "").includes("pageTextPreview")
    )
    && fullReport.status === "passed"
    && fullBrowser?.authentication?.existingSession?.evidencePolicy === "full"
    && fullBrowser.pageTextPreview?.includes(fullSecret)
    && (fullBrowser.consoleMessages || []).some(line => line.includes(fullSecret))
    && (fullBrowser.networkRequests || []).some(line => line.includes(fullSecret))
    && fullReport.browserToolCalls.some(call =>
      JSON.stringify(call.input).includes(fullSecret)
      || String(call.outputPreview || "").includes(fullSecret)
    )
    && fullContract.valid
    && fullArtifacts.status === "passed"
    && missingBrowser?.status === "blocked"
    && String(missingBrowser.error || "").includes("tabs_context_mcp")
    && missingBrowser.authentication?.existingSession?.tabContextChecked === false
    && missingBrowser.authentication?.existingSession?.createdNewTab === false
    && missingCoverage?.status === "unknown";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    minimalReport,
    minimalContract,
    minimalArtifacts,
    transcriptTamperedArtifacts,
    tamperedContract,
    reportTamperedArtifacts,
    fullReport,
    fullContract,
    fullArtifacts,
    missingReport,
    minimalCalls,
    fullCalls,
  };
}

export async function runTestAgentChromeDevtoolsExistingSessionSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-devtools-existing-session-"));
  const secret = `devtools-secret-${process.pid}-${Date.now()}`;
  const calls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const input = existingSessionWorkOrder(dir, {
    id: `devtools-existing-session-${process.pid}-${Date.now()}`,
    provider: "chrome-devtools",
    artifactDir: path.join(dir, "artifacts"),
  });
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__chrome-devtools__list_pages",
      "mcp__chrome-devtools__new_page",
      "mcp__chrome-devtools__navigate_page",
      "mcp__chrome-devtools__take_snapshot",
      "mcp__chrome-devtools__list_console_messages",
      "mcp__chrome-devtools__list_network_requests",
      "mcp__chrome-devtools__take_screenshot",
    ],
    onCall(toolName, toolInput) {
      calls.push({ toolName, input: toolInput });
      if (toolName.endsWith("__list_pages")) {
        return { pages: [{ id: `page-${secret}`, url: `https://private.example.test/${secret}` }] };
      }
      if (toolName.endsWith("__new_page")) return { id: `new-${secret}` };
      if (toolName.endsWith("__take_snapshot")) return `Workspace authenticated ${secret}`;
      if (toolName.endsWith("__list_console_messages")) return `info ${secret}`;
      if (toolName.endsWith("__list_network_requests")) return `200 GET /api/workspace?secret=${secret}`;
      return { ok: true, secret };
    },
  });
  const report = await runTestAgent(input as any, {
    browserProvider: "mcp",
    browserToolExecutor: executor,
  });
  const browser = report.browserResults[0];
  const evidence = browser?.authentication?.existingSession;
  const pass = report.status === "passed"
    && browser?.status === "passed"
    && evidence?.provider === "chrome-devtools"
    && evidence.tabContextChecked === true
    && evidence.tabCount === 1
    && evidence.createdNewTab === true
    && calls[0]?.toolName.endsWith("__list_pages")
    && calls[1]?.toolName.endsWith("__new_page")
    && calls.filter(call => call.toolName.endsWith("__new_page")).length === 1
    && !JSON.stringify(report).includes(secret)
    && validateTestAgentReportContract(report).valid;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return { pass, report, calls };
}

function writeMixedRoutingServer(dir: string) {
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = '<!doctype html><title>Public status</title><main><h1>Public page ready</h1></main>';",
    "http.createServer((req, res) => {",
    "  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); res.end('{\"ok\":true}'); return; }",
    "  res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end(html);",
    "}).listen(Number(process.env.PORT));",
  ].join("\n"), "utf-8");
}

export async function runTestAgentMixedBrowserProviderRoutingSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) return { pass: false, availability, reason: availability.reason };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mixed-provider-routing-"));
  writeMixedRoutingServer(dir);
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const calls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const secret = `mixed-secret-${process.pid}-${Date.now()}`;
  const input: any = {
    id: `mixed-provider-routing-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify a public page and an authenticated collaboration workspace.",
    acceptanceCriteria: [
      "The public status page loads.",
      "The authenticated workspace is ready.",
    ],
    requiredChecks: ["browser_e2e", "browser_auth"],
    projects: [{
      name: "mixed-provider-routing",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl: baseUrl,
      startupUrl: `${baseUrl}/health`,
      env: { PORT: String(port) },
      browserChecks: [{
        name: "Public status",
        actions: [{ type: "goto", url: `${baseUrl}/public` }],
        assertions: [{ type: "text", text: "Public page ready" }],
        screenshot: false,
      }, {
        name: "Authenticated collaboration workspace",
        url: "https://app.example.test/workspace",
        authentication: {
          mode: "existing_session",
          provider: "claude-in-chrome",
          evidencePolicy: "minimal",
        },
        actions: [{ type: "goto", url: "https://app.example.test/workspace" }],
        assertions: [{ type: "text", text: "Workspace authenticated" }],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, "artifacts"),
      browserProvider: "playwright",
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };
  const report = await runTestAgent(input, {
    browserProvider: "playwright",
    browserToolExecutor: claudeChromeExecutor(calls, { secret }),
  });
  const publicResult = report.browserResults.find(item => item.name === "Public status");
  const existingResult = report.browserResults.find(item => item.name === "Authenticated collaboration workspace");
  const summary = report.browserProviderSummary;
  const reportValidation = validateTestAgentReportContract(report);
  const directPlaywrightBlock = await PlaywrightBrowserProvider.run({
    workOrder: normalizeTestAgentWorkOrder({
      ...input,
      id: `${input.id}-direct-playwright`,
      projects: [{
        ...input.projects[0],
        browserChecks: [input.projects[0].browserChecks[1]],
      }],
    }).workOrder,
    runtime: {},
  });

  const pass = report.status === "passed"
    && publicResult?.provider === "playwright"
    && publicResult.status === "passed"
    && existingResult?.provider === "mcp"
    && existingResult.status === "passed"
    && existingResult.authentication?.existingSession?.provider === "claude-in-chrome"
    && summary.selectedProviders?.join(",") === "mcp,playwright"
    && summary.items.find(item => item.provider === "playwright")?.selected === true
    && summary.items.find(item => item.provider === "mcp")?.selected === true
    && summary.fallbackUsed === true
    && reportValidation.valid
    && !JSON.stringify(report).includes(secret)
    && directPlaywrightBlock.length === 1
    && directPlaywrightBlock[0]?.status === "blocked"
    && String(directPlaywrightBlock[0]?.error || "").includes("existing authenticated Chrome session");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    report,
    reportValidation,
    directPlaywrightBlock,
    calls,
  };
}

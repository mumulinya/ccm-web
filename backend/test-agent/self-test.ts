import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { runTestAgent } from "./agent";
import { verifyTestAgentArtifactManifestFile } from "./artifact-verifier";
import { buildAcceptanceDerivedBrowserAssertions } from "./browser/acceptance-derived-checks";
import { AUTO_BROWSER_SMOKE_PROBE_TYPE, buildAutoBrowserSmokeCheck } from "./browser/auto-checks";
import { checkPlaywrightAvailability } from "./browser/playwright-provider";
import { buildSemanticLocatorPlan } from "./browser/semantic-locator";
import { createStaticBrowserToolExecutor } from "./browser/tool-executor";
import { formatTestAgentCliArtifactVerificationSummary, formatTestAgentCliReportSummary, formatTestAgentCliValidationSummary, runTestAgentCli } from "./cli";
import { cliOverrides, parseTestAgentCliArgs } from "./cli-options";
import { TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE, validateTestAgentReportContract, validateTestAgentWorkOrderContract } from "./contract";
import { buildAcceptanceCoverage } from "./coverage";
import { buildTestAgentWorkOrderFromHandoff } from "./work-order-builder";
import { normalizeTestAgentWorkOrder } from "./work-order";

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

function writeTaskBoardFixtureServer(dir: string) {
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Handoff CLI Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Task board</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"add\">Add task</button>",
    "<ul id=\"tasks\" aria-label=\"Saved task list\"></ul>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "</main>",
    "<script>",
    "const input = document.getElementById('task');",
    "const list = document.getElementById('tasks');",
    "const status = document.getElementById('status');",
    "function readTasks() { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } }",
    "function writeTasks(tasks) { localStorage.setItem('tasks', JSON.stringify(tasks)); }",
    "function render() {",
    "  const tasks = readTasks();",
    "  list.innerHTML = '';",
    "  for (const task of tasks) { const item = document.createElement('li'); item.textContent = task; list.appendChild(item); }",
    "  status.textContent = tasks.length ? 'Saved ' + tasks[tasks.length - 1] : 'Ready';",
    "}",
    "document.getElementById('add').addEventListener('click', () => {",
    "  const value = input.value.trim();",
    "  if (!value) { status.textContent = 'Task required'; return; }",
    "  const tasks = readTasks();",
    "  tasks.push(value);",
    "  writeTasks(tasks);",
    "  render();",
    "});",
    "render();",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true})); return; }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");
}

export async function runTestAgentSelfTest(options: { includeBrowser?: boolean } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-selftest-"));
  const port = await getFreePort();
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = '<!doctype html><title>TestAgent self-test</title><button id=\"ok\">Ready</button>';",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent command and optional browser execution.",
    acceptanceCriteria: ["Command verification runs", ...(options.includeBrowser ? ["Browser can open the test page"] : [])],
    requiredChecks: options.includeBrowser ? ["commands", "browser_e2e", "screenshots", "console_errors"] : ["commands"],
    projects: [{
      name: "self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('command ok')"`],
      runCommand: options.includeBrowser ? `"${process.execPath}" server.js` : "",
      targetUrl: options.includeBrowser ? `http://127.0.0.1:${port}` : "",
      env: { PORT: port },
      browserChecks: options.includeBrowser ? [{
        name: "self-test page loads",
        url: `http://127.0.0.1:${port}`,
        assertions: [{ type: "text", text: "Ready" }, { type: "consoleNoErrors" }],
        screenshot: true,
      }] : [],
    }],
  });

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass: options.includeBrowser ? report.status === "passed" : report.commandResults.some(item => item.status === "passed"),
    report,
  };
}

export async function runTestAgentMcpProviderSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Ready\nMCP browser tools are invoked";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "fake-screenshot.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent MCP browser provider path.",
    acceptanceCriteria: ["MCP browser tools are invoked", "Tool calls are recorded"],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "MCP navigation",
        url: "http://example.test/",
        actions: [{ type: "goto", url: "http://example.test/" }],
        assertions: [{ type: "text", text: "Ready" }, { type: "consoleNoErrors" }, { type: "networkNoErrors" }],
        screenshot: true,
      }],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  return {
    pass: report.status === "passed" && report.browserToolCalls.length >= 2 && calls.length >= 2,
    report,
    calls,
  };
}

export async function runTestAgentClaudeChromeMcpSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__claude-in-chrome__tabs_create_mcp",
      "mcp__claude-in-chrome__navigate",
      "mcp__claude-in-chrome__get_page_text",
      "mcp__claude-in-chrome__read_console_messages",
      "mcp__claude-in-chrome__read_network_requests",
      "mcp__claude-in-chrome__gif_creator",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("tabs_create_mcp")) return { tabId: 42 };
      if (toolName.endsWith("get_page_text")) return "Chrome Ready\nClaude in Chrome verifier";
      if (toolName.endsWith("read_console_messages")) return [];
      if (toolName.endsWith("read_network_requests")) return [];
      if (toolName.endsWith("gif_creator")) return { frame: "fake-frame.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `chrome-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent Claude in Chrome MCP adapter path.",
    acceptanceCriteria: ["Claude in Chrome MCP tools are invoked", "tabId is propagated"],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "chrome-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "Claude Chrome navigation",
        url: "http://example.test/chrome",
        actions: [{ type: "goto", url: "http://example.test/chrome" }],
        assertions: [{ type: "text", text: "Chrome Ready" }, { type: "urlIncludes", text: "/chrome" }, { type: "consoleNoErrors" }],
        screenshot: true,
      }],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const passedTabId = report.browserToolCalls.some(call => call.toolName.endsWith("navigate") && call.input.tabId === 42);
  return {
    pass: report.status === "passed" && passedTabId && calls.length >= 4,
    report,
    calls,
  };
}

export async function runTestAgentComputerUseMcpSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__computer-use__request_access",
      "mcp__computer-use__left_click",
      "mcp__computer-use__type",
      "mcp__computer-use__key",
      "mcp__computer-use__scroll",
      "mcp__computer-use__wait",
      "mcp__computer-use__screenshot",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("screenshot")) return { image: "fake-computer-use-screenshot.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `computer-use-mcp-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent Computer Use MCP adapter path.",
    acceptanceCriteria: ["Computer Use MCP tools are invoked", "desktop action tool calls are recorded"],
    requiredChecks: ["browser_e2e", "screenshots"],
    projects: [{
      name: "computer-use-mcp-self-test",
      workDir: process.cwd(),
      browserChecks: [{
        name: "Computer Use desktop action chain",
        url: "computer-use://active-session",
        actions: [
          { type: "requestAccess", apps: [{ displayName: "Browser", bundleId: "com.example.Browser" }] },
          { type: "click", coordinate: [120, 180] },
          { type: "fill", text: "hello from TestAgent" },
          { type: "press", key: "enter" },
          { type: "scroll", direction: "down", amount: 2, coordinate: [240, 320] },
          { type: "waitForTimeout", value: "10" },
        ],
        screenshot: true,
      }],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const usedComputerUse = report.browserToolCalls.every(call => call.toolName.startsWith("mcp__computer-use__"));
  const tookScreenshot = report.browserToolCalls.some(call => call.toolName.endsWith("screenshot"));
  return {
    pass: report.status === "passed" && usedComputerUse && tookScreenshot && calls.length >= 6,
    report,
    calls,
  };
}

export function runTestAgentWorkOrderNormalizationSelfTest() {
  const normalized = normalizeTestAgentWorkOrder({
    id: `work-order-normalization-self-test-${process.pid}-${Date.now()}`,
    original_user_goal: "Verify work order aliases normalize before execution.",
    acceptance_criteria: ["Browser aliases normalize"],
    required_checks: ["browser_e2e"],
    projects: [{
      name: "normalization-self-test",
      work_dir: process.cwd(),
      browser_checks: [{
        title: "snake case browser check",
        target_url: "http://example.test/",
        steps: [
          { action: "request_access", apps: [{ display_name: "Browser", bundle_id: "com.example.Browser" }] },
          { action: "open_application", bundle_id: "com.example.Browser" },
          { action: "press_key", key_text: "enter" },
          { action: "wait_for_timeout", value: "10" },
        ],
        expectations: [
          { assertion: "url_includes", text: "example.test" },
          { assertion: "console_no_errors" },
        ],
      }],
    }],
  } as any);
  const invalid = normalizeTestAgentWorkOrder({
    id: `work-order-invalid-self-test-${process.pid}-${Date.now()}`,
    projects: [{
      name: "invalid-normalization-self-test",
      workDir: process.cwd(),
      browserChecks: [{ actions: [{ type: "teleport" }] }],
    }],
  } as any);
  const check = normalized.workOrder.projects[0].browserChecks[0];
  const actionTypes = check.actions.map(action => action.type);
  const assertionTypes = check.assertions.map(assertion => assertion.type);
  return {
    pass: normalized.issues.every(issue => issue.severity !== "error")
      && actionTypes.join(",") === "requestAccess,openApplication,press,waitForTimeout"
      && assertionTypes.join(",") === "urlIncludes,consoleNoErrors"
      && invalid.issues.some(issue => issue.code === "invalid_browser_action_type"),
    normalized,
    invalid,
  };
}

export function runTestAgentHandoffBuilderSelfTest() {
  const built = buildTestAgentWorkOrderFromHandoff({
    taskId: "handoff-task-42",
    groupId: "handoff-group",
    originalUserGoal: "Ship the task board feature and prove it works in a browser.",
    acceptanceCriteria: [
      'Task board shows "Ready" at /tasks.',
    ],
    completedTasks: [
      "Task creation flow implemented",
    ],
    completedByProjectAgents: ["frontend-agent", "api-agent"],
    projects: [{
      name: "handoff-web",
      workDir: process.cwd(),
      runCommand: "npm run dev -- --host 127.0.0.1",
      targetUrl: "http://127.0.0.1:5173/tasks",
      changedFiles: ["src/App.tsx", "src/api/tasks.ts"],
      verificationCommands: ["npm test"],
      httpChecks: [{
        name: "Tasks page HTTP",
        url: "http://127.0.0.1:5173/tasks",
        assertions: [{ type: "status", status: 200 }],
      }],
      adversarialBrowserProbeTemplates: [{
        kind: "repeated_click",
        name: "Repeated add task click",
        url: "http://127.0.0.1:5173/tasks",
        target: { role: "button", name: "Add task" },
        expectedText: "Ready",
      }],
      completedTasks: ["Task list persists after save"],
      risks: ["Local storage behavior must be checked in browser."],
    }],
    options: {
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
  });
  const validation = validateTestAgentWorkOrderContract(built.workOrder);
  const normalized = normalizeTestAgentWorkOrder(built.workOrder);
  const required = new Set(built.workOrder.requiredChecks || []);
  const project = built.workOrder.projects?.[0] as any;
  const metadata = built.workOrder.metadata || {};
  return {
    pass: built.warnings.length === 0
      && validation.valid
      && normalized.issues.every(issue => issue.severity !== "error")
      && built.workOrder.schema === "ccm-test-agent-work-order-v1"
      && built.workOrder.issuedBy === "group-main-agent"
      && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task creation flow implemented"))
      && built.workOrder.acceptanceCriteria?.some(item => item.includes("Task list persists after save"))
      && required.has("commands")
      && required.has("http")
      && required.has("browser_e2e")
      && required.has("screenshots")
      && required.has("console_errors")
      && required.has("browser_snapshots")
      && required.has("browser_console_logs")
      && required.has("browser_network_logs")
      && required.has("browser_trace")
      && required.has("browser_har")
      && required.has("adversarial")
      && project.agentSummary.includes("Task list persists after save")
      && project.changedFiles.length === 2
      && metadata.handoffSource === "test-agent-handoff-builder"
      && metadata.completedByProjectAgents.length === 2,
    built,
    validation,
    normalized,
  };
}

export async function runTestAgentArtifactSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifacts-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const report = await runTestAgent({
    id: `artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent writes report artifacts.",
    acceptanceCriteria: ["Report artifacts are written"],
    requiredChecks: ["commands"],
    projects: [{
      name: "artifact-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('artifact ok')"`],
    }],
    options: { artifactDir },
  });
  const files = report.metadata.artifactFiles as any;
  const jsonPath = String(files?.reportJsonPath || "");
  const markdownPath = String(files?.reportMarkdownPath || "");
  const jsonText = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf-8") : "";
  const markdownText = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
  const pass = report.status === "passed"
    && jsonText.includes(report.id)
    && markdownText.includes("# TestAgent Report")
    && markdownText.includes("## Command Details")
    && markdownText.includes("**Output observed:**")
    && markdownText.includes("artifact ok")
    && report.evidence.some(item => item.path === jsonPath)
    && report.evidence.some(item => item.path === markdownPath);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    files: { jsonPath, markdownPath },
  };
}

export async function runTestAgentArtifactManifestSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-manifest-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Manifest Ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "manifest-screenshot.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `artifact-manifest-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent writes an artifact manifest.",
    acceptanceCriteria: ["Artifact manifest lists reports, screenshots, and browser tool transcripts"],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors"],
    projects: [{
      name: "artifact-manifest-self-test",
      workDir: dir,
      browserChecks: [{
        name: "Manifest browser check",
        url: "http://example.test/manifest",
        actions: [{ type: "goto", url: "http://example.test/manifest" }],
        assertions: [{ type: "text", text: "Manifest Ready" }, { type: "consoleNoErrors" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const files = report.metadata.artifactFiles as any;
  const manifestPath = String(files?.manifestPath || "");
  const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const manifestFiles = manifest?.files || [];
  const manifestTypes = new Set<string>(manifestFiles.map((item: any) => String(item.type)));
  const reportJsonEntry = manifestFiles.find((item: any) => item.type === "report_json");
  const screenshotEntry = manifestFiles.find((item: any) => item.type === "screenshot");
  const manifestEntry = manifestFiles.find((item: any) => item.type === "artifact_manifest");
  const pass = report.status === "passed"
    && fs.existsSync(manifestPath)
    && fs.existsSync(transcriptPath)
    && manifest?.schema === "ccm-test-agent-artifact-manifest-v1"
    && manifestTypes.has("report_json")
    && manifestTypes.has("report_markdown")
    && manifestTypes.has("artifact_manifest")
    && manifestTypes.has("screenshot")
    && manifestTypes.has("browser_snapshot")
    && manifestTypes.has("browser_console_log")
    && manifestTypes.has("browser_network_log")
    && manifestTypes.has("browser_tool_transcript")
    && manifest.summary?.screenshots === 1
    && manifest.summary?.browserSnapshots === 1
    && manifest.summary?.browserConsoleLogs === 1
    && manifest.summary?.browserNetworkLogs === 1
    && manifest.summary?.browserToolTranscripts === 1
    && manifest.summary?.integrityMissing === 0
    && manifest.summary?.integrityVerified === manifestFiles.length
    && manifestFiles.every((item: any) => item.integrity?.exists === true)
    && typeof reportJsonEntry?.integrity?.sha256 === "string"
    && reportJsonEntry.integrity.sha256.length === 64
    && typeof screenshotEntry?.integrity?.sha256 === "string"
    && screenshotEntry.integrity.sha256.length === 64
    && manifestEntry?.integrity?.exists === true
    && manifestEntry?.integrity?.error === "sha256 omitted for self-referential artifact.";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    manifest,
  };
}

export async function runTestAgentArtifactVerifierSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-artifact-verifier-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const report = await runTestAgent({
    id: `artifact-verifier-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent artifact manifest can be independently checked.",
    acceptanceCriteria: ["Artifact verifier detects intact and tampered files"],
    requiredChecks: ["commands"],
    projects: [{
      name: "artifact-verifier-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('verifier ok')"`],
    }],
    options: { artifactDir, browserProvider: "none" },
  });

  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const verification = verifyTestAgentArtifactManifestFile(manifestPath);
  const summary = formatTestAgentCliArtifactVerificationSummary(verification);
  const cliStdout: string[] = [];
  const cliStderr: string[] = [];
  const cliResult = await runTestAgentCli(["--verify-artifacts", manifestPath, "--summary"], {
    stdout: { write: message => cliStdout.push(String(message)) },
    stderr: { write: message => cliStderr.push(String(message)) },
  });

  fs.appendFileSync(markdownPath, "\nTAMPERED\n", "utf-8");
  const tampered = verifyTestAgentArtifactManifestFile(manifestPath);
  const tamperedStdout: string[] = [];
  const tamperedResult = await runTestAgentCli(["--verify-artifacts", manifestPath, "--summary"], {
    stdout: { write: message => tamperedStdout.push(String(message)) },
    stderr: { write: message => cliStderr.push(String(message)) },
  });

  const pass = report.status === "passed"
    && verification.status === "passed"
    && verification.summary.failed === 0
    && verification.summary.passed > 0
    && verification.summary.skipped >= 1
    && summary.includes("TestAgent artifact verification: passed")
    && cliResult.exitCode === 0
    && cliStdout.join("").includes("TestAgent artifact verification: passed")
    && cliStderr.length === 0
    && tampered.status === "failed"
    && tampered.items.some(item => item.path === markdownPath && item.error === "Size mismatch: expected " + item.expectedSizeBytes + ", got " + item.actualSizeBytes + ".")
    && tamperedResult.exitCode === 1
    && tamperedStdout.join("").includes("TestAgent artifact verification: failed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    verification,
    tampered,
  };
}

export async function runTestAgentMcpScreenshotArtifactSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-screenshot-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Screenshot artifact ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { image: `data:image/png;base64,${onePixelPng}` };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `mcp-screenshot-artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify MCP screenshot captures become local artifacts.",
    acceptanceCriteria: ["Screenshot artifact is written as a local image"],
    requiredChecks: ["browser_e2e", "screenshots"],
    projects: [{
      name: "mcp-screenshot-artifact-self-test",
      workDir: dir,
      browserChecks: [{
        name: "MCP screenshot artifact",
        url: "http://example.test/screenshot",
        actions: [{ type: "goto", url: "http://example.test/screenshot" }],
        assertions: [{ type: "text", text: "Screenshot artifact ready" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const screenshotPath = String(result?.screenshots?.[0] || "");
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const manifestScreenshot = (manifest?.files || []).find((item: any) => item.type === "screenshot");
  const pass = report.status === "passed"
    && screenshotPath.endsWith(".png")
    && fs.existsSync(screenshotPath)
    && fs.statSync(screenshotPath).size > 20
    && manifestScreenshot?.path === screenshotPath
    && report.evidence.some(item => item.path === screenshotPath)
    && report.requiredCheckCoverage.some(item => item.check === "screenshots" && item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    screenshotPath,
    manifest,
  };
}

export async function runTestAgentBrowserEvidenceArtifactSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-evidence-artifact-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const providerDir = path.join(dir, "provider-artifacts");
  fs.mkdirSync(providerDir, { recursive: true });
  const harPath = path.join(providerDir, "session.har");
  const videoPath = path.join(providerDir, "session.webm");
  fs.writeFileSync(harPath, JSON.stringify({ log: { version: "1.2", entries: [] } }), "utf-8");
  fs.writeFileSync(videoPath, Buffer.from("fake-webm-video"));
  const traceBase64 = Buffer.from("fake-trace-zip").toString("base64");
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Evidence artifacts ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return {
        image: `data:image/png;base64,${onePixelPng}`,
        trace: `data:application/zip;base64,${traceBase64}`,
        harPath,
        videoPath,
      };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `browser-evidence-artifact-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent preserves rich browser evidence artifacts.",
    acceptanceCriteria: ["Browser evidence artifacts are listed, hashed, and verifiable"],
    requiredChecks: ["browser_e2e", "browser_trace", "browser_har", "browser_video", "browser_artifacts"],
    projects: [{
      name: "browser-evidence-artifact-self-test",
      workDir: dir,
      browserChecks: [{
        name: "Browser evidence artifact bundle",
        url: "http://example.test/evidence",
        actions: [{ type: "goto", url: "http://example.test/evidence" }],
        assertions: [{ type: "text", text: "Evidence artifacts ready" }],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const artifacts = result?.browserArtifacts || [];
  const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verification = manifestPath ? verifyTestAgentArtifactManifestFile(manifestPath) : null;
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const manifestTypes = new Set((manifest?.files || []).map((item: any) => item.type));
  const pass = report.status === "passed"
    && artifacts.some(item => item.type === "trace" && item.path.endsWith(".zip") && fs.existsSync(item.path))
    && artifacts.some(item => item.type === "har" && item.path.endsWith(".har") && fs.existsSync(item.path))
    && artifacts.some(item => item.type === "video" && item.path.endsWith(".webm") && fs.existsSync(item.path))
    && byCheck.get("browser_trace")?.status === "verified"
    && byCheck.get("browser_har")?.status === "verified"
    && byCheck.get("browser_video")?.status === "verified"
    && byCheck.get("browser_artifacts")?.status === "verified"
    && manifestTypes.has("browser_trace")
    && manifestTypes.has("browser_har")
    && manifestTypes.has("browser_video")
    && manifest?.summary?.browserTraces === 1
    && manifest?.summary?.browserHars === 1
    && manifest?.summary?.browserVideos === 1
    && verification?.status === "passed";

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    manifest,
    verification,
  };
}

export function runTestAgentCoverageSelfTest() {
  const { workOrder } = normalizeTestAgentWorkOrder({
    id: `coverage-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: [
      "Login page renders",
      "Settings save persists",
      "Checkout flow completes",
    ],
    projects: [{
      name: "coverage-self-test",
      workDir: process.cwd(),
      verificationCommands: ["npm test"],
    }],
  });
  const startedAt = new Date().toISOString();
  const baseCommand = {
    project: "coverage-self-test",
    command: "npm test",
    cwd: process.cwd(),
    startedAt,
    finishedAt: startedAt,
    durationMs: 1,
    stdout: "",
    stderr: "",
    output: "",
    exitCode: 0,
  };
  const coverage = buildAcceptanceCoverage({
    workOrder,
    status: "partial",
    issues: [],
    commandResults: [{
      ...baseCommand,
      status: "passed",
      stdout: "Login page renders",
      output: "Login page renders",
    } as any],
    devServerResults: [],
    httpResults: [],
    browserResults: [{
      provider: "playwright",
      project: "coverage-self-test",
      name: "Settings save persists",
      url: "http://example.test/settings",
      status: "failed",
      startedAt,
      finishedAt: startedAt,
      durationMs: 1,
      steps: [{ kind: "assertion", name: "assert:text", status: "failed", detail: "Settings save persists", error: "Expected saved toast." }],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkErrors: [],
    }],
    browserToolCalls: [],
    evidence: [],
  });
  const byCriterion = new Map(coverage.map(item => [item.criterion, item]));
  return {
    pass: byCriterion.get("Login page renders")?.status === "verified"
      && byCriterion.get("Settings save persists")?.status === "not_verified"
      && byCriterion.get("Checkout flow completes")?.status === "unknown",
    coverage,
  };
}

export async function runTestAgentCommandPlannerSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-command-planner-selftest-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      build: "node -e \"console.log('auto build ok')\"",
      "test:unit": "node -e \"console.log('auto unit ok')\"",
      typecheck: "node -e \"console.log('auto typecheck ok')\"",
      lint: "node -e \"console.log('auto lint ok')\"",
    },
  }, null, 2), "utf-8");

  const report = await runTestAgent({
    id: `command-planner-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent auto-discovers package scripts for required checks.",
    acceptanceCriteria: ["Auto-discovered verification commands run"],
    requiredChecks: ["build", "unit_tests", "typecheck", "lint"],
    projects: [{
      name: "command-planner-self-test",
      workDir: dir,
    }],
  });

  const planned = report.metadata.autoDiscoveredVerificationCommands as any[];
  const output = report.commandResults.map(item => item.output).join("\n");
  const pass = report.status === "passed"
    && Array.isArray(planned)
    && planned.length === 4
    && report.commandResults.length === 4
    && output.includes("auto build ok")
    && output.includes("auto unit ok")
    && output.includes("auto typecheck ok")
    && output.includes("auto lint ok")
    && !report.issues.some(issue => issue.code === "no_executable_checks");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    planned,
  };
}

export async function runTestAgentHttpApiSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-http-api-selftest-"));
  const port = await getFreePort();
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
    "http.createServer(async (req, res) => {",
    "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok', service: { name: 'test-agent-api' } })); return; }",
    "  if (req.url === '/api/echo' && req.method === 'POST') { const body = await readBody(req); res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ received: JSON.parse(body || '{}') })); return; }",
    "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseUrl = `http://127.0.0.1:${port}`;
  const report = await runTestAgent({
    id: `http-api-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent explicit HTTP/API checks.",
    acceptanceCriteria: ["Health endpoint returns ok", "Echo endpoint returns submitted JSON", "Missing endpoint returns 404"],
    requiredChecks: ["api"],
    projects: [{
      name: "http-api-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      startupUrl: `${baseUrl}/api/health`,
      env: { PORT: port },
      httpChecks: [{
        name: "Health endpoint",
        url: `${baseUrl}/api/health`,
        assertions: [
          { type: "status", status: 200 },
          { type: "jsonPathEquals", path: "status", value: "ok" },
          { type: "jsonPathIncludes", path: "service.name", value: "agent" },
        ],
      }, {
        name: "Echo endpoint",
        method: "POST",
        url: `${baseUrl}/api/echo`,
        json: { name: "Ada" },
        assertions: [
          { type: "status", status: 201 },
          { type: "jsonPathEquals", path: "received.name", value: "Ada" },
        ],
      }, {
        name: "Missing endpoint",
        url: `${baseUrl}/api/missing`,
        assertions: [
          { type: "status", status: 404 },
          { type: "jsonPathEquals", path: "error", value: "not found" },
        ],
      }],
    }],
  });

  const apiResults = report.httpResults.filter(item => item.name && item.name !== "Page HTTP probe");
  const pass = report.status === "passed"
    && apiResults.length === 3
    && apiResults.every(item => item.status === "passed")
    && apiResults.some(item => item.method === "POST" && item.statusCode === 201)
    && apiResults.some(item => item.statusCode === 404 && item.status === "passed")
    && report.acceptanceCoverage.some(item => item.criterion.includes("Health") && item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
  };
}

export async function runTestAgentAdversarialHttpSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-adversarial-http-selftest-"));
  const port = await getFreePort();
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const readBody = req => new Promise(resolve => { let body = ''; req.on('data', c => body += c); req.on('end', () => resolve(body)); });",
    "http.createServer(async (req, res) => {",
    "  if (req.url === '/api/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ status: 'ok' })); return; }",
    "  if (req.url === '/api/items' && req.method === 'POST') { const body = JSON.parse(await readBody(req) || '{}'); if (!body.name) { res.writeHead(400, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'name is required' })); return; } res.writeHead(201, {'content-type':'application/json'}); res.end(JSON.stringify({ id: 'item-1', name: body.name })); return; }",
    "  if (req.url.startsWith('/api/items/')) { res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'item not found' })); return; }",
    "  res.writeHead(404, {'content-type':'application/json'}); res.end(JSON.stringify({ error: 'not found' }));",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const baseUrl = `http://127.0.0.1:${port}`;
  const report = await runTestAgent({
    id: `adversarial-http-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records adversarial HTTP probes.",
    acceptanceCriteria: ["Invalid item create is rejected", "Orphan item lookup returns 404"],
    requiredChecks: ["api", "adversarial"],
    projects: [{
      name: "adversarial-http-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      startupUrl: `${baseUrl}/api/health`,
      env: { PORT: port },
      adversarialHttpChecks: [{
        name: "Invalid item create",
        probeType: "boundary",
        method: "POST",
        url: `${baseUrl}/api/items`,
        json: {},
        assertions: [
          { type: "status", status: 400 },
          { type: "jsonPathIncludes", path: "error", value: "name" },
        ],
      }, {
        name: "Orphan item lookup",
        probeType: "orphan",
        url: `${baseUrl}/api/items/does-not-exist`,
        assertions: [
          { type: "status", status: 404 },
          { type: "jsonPathIncludes", path: "error", value: "not found" },
        ],
      }],
    }],
  });

  const probes = report.httpResults.filter(item => item.adversarial);
  const pass = report.status === "passed"
    && probes.length === 2
    && probes.every(item => item.status === "passed")
    && probes.some(item => item.probeType === "boundary" && item.statusCode === 400)
    && probes.some(item => item.probeType === "orphan" && item.statusCode === 404)
    && report.evidence.some(item => item.title.includes("Adversarial"))
    && report.acceptanceCoverage.every(item => item.status === "verified");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
  };
}

export async function runTestAgentAdversarialBrowserSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Login\nInvalid password\nPlease try again";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "adversarial-browser.png" };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `adversarial-browser-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records adversarial browser probes.",
    acceptanceCriteria: ["Invalid login stays on login page"],
    requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
    projects: [{
      name: "adversarial-browser-self-test",
      workDir: process.cwd(),
      adversarialBrowserChecks: [{
        name: "Invalid login stays on login page",
        probeType: "negative_auth_ui",
        url: "http://example.test/login",
        actions: [
          { type: "goto", url: "http://example.test/login" },
        ],
        assertions: [
          { type: "urlIncludes", text: "/login" },
          { type: "visible", text: "Invalid password" },
          { type: "consoleNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const adversarialResults = report.browserResults.filter(item => item.adversarial);
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  return {
    pass: report.status === "passed"
      && adversarialResults.length === 1
      && adversarialResults[0].status === "passed"
      && adversarialResults[0].probeType === "negative_auth_ui"
      && adversarialResults[0].finalUrl === "http://example.test/login"
      && adversarialResults[0].pageTextPreview?.includes("Invalid password")
      && byCheck.get("adversarial")?.status === "verified"
      && report.evidence.some(item => item.title.includes("Adversarial"))
      && report.acceptanceCoverage.every(item => item.status === "verified")
      && calls.length >= 4,
    report,
    calls,
  };
}

export async function runTestAgentBrowserProbeTemplateSelfTest() {
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_type",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return [
        "Login",
        "Invalid password",
        "Counter stable",
        "Saved draft",
      ].join("\n");
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: `${input.filename || "template-check"}.png` };
      return { ok: true };
    },
  });
  const report = await runTestAgent({
    id: `browser-probe-template-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent expands browser probe templates into executable checks.",
    acceptanceCriteria: [
      "Invalid form input template produces a real browser probe",
      "Repeated click template produces idempotent browser click evidence",
      "Refresh persistence template reloads and verifies saved state",
    ],
    requiredChecks: ["browser_e2e", "adversarial", "screenshots", "browser_snapshots", "browser_console_logs", "browser_network_logs", "console_errors"],
    projects: [{
      name: "browser-probe-template-self-test",
      workDir: process.cwd(),
      adversarialBrowserProbeTemplates: [
        {
          kind: "invalid_form_input",
          name: "Invalid form input template",
          url: "http://example.test/login",
          fields: [
            { label: "Email", value: "bad@example.test" },
            { label: "Password", value: "wrong-password" },
          ],
          submit: { role: "button", name: "Sign in" },
          expectedUrlIncludes: "/login",
          expectedText: "Invalid password",
          screenshot: true,
        },
        {
          kind: "repeated_click",
          name: "Repeated click template",
          url: "http://example.test/counter",
          target: { role: "button", name: "Retry" },
          repeat: 4,
          expectedUrlIncludes: "/counter",
          expectedText: "Counter stable",
          screenshot: true,
        },
        {
          kind: "refresh_persistence",
          name: "Refresh persistence template",
          url: "http://example.test/editor",
          setupActions: [
            { type: "fill", label: "Title", value: "Draft title" },
          ],
          stateAssertions: [
            { type: "visible", text: "Saved draft" },
          ],
          expectedUrlIncludes: "/editor",
          screenshot: true,
        },
      ],
    }],
    options: { browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const byProbe = new Map(report.browserResults.map(result => [result.probeType, result]));
  const invalidResult = byProbe.get("invalid_form_input");
  const repeatedResult = byProbe.get("repeated_click");
  const refreshResult = byProbe.get("refresh_persistence");
  const typed = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_type"));
  const retryClicks = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_click") && call.input?.name === "Retry");
  const navigations = report.browserToolCalls.filter(call => call.toolName.endsWith("browser_navigate"));
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  return {
    pass: report.status === "passed"
      && report.browserResults.length === 3
      && invalidResult?.adversarial === true
      && invalidResult?.finalUrl === "http://example.test/login"
      && invalidResult?.pageTextPreview?.includes("Invalid password")
      && (invalidResult?.pageSnapshots || []).length === 1
      && !!invalidResult?.consoleLogPath
      && !!invalidResult?.networkLogPath
      && invalidResult.steps.some(step => step.name.includes("fill") && step.status === "passed")
      && invalidResult.steps.some(step => step.name.includes("click") && step.status === "passed")
      && repeatedResult?.adversarial === true
      && repeatedResult?.finalUrl === "http://example.test/counter"
      && repeatedResult?.pageTextPreview?.includes("Counter stable")
      && repeatedResult.steps.filter(step => step.name.includes("click") && step.status === "passed").length === 4
      && refreshResult?.adversarial === true
      && refreshResult?.finalUrl === "http://example.test/editor"
      && refreshResult?.pageTextPreview?.includes("Saved draft")
      && refreshResult.steps.some(step => step.name.includes("reload") && step.status === "passed")
      && typed.length === 3
      && retryClicks.length === 4
      && navigations.length === 4
      && byCheck.get("browser_snapshots")?.status === "verified"
      && byCheck.get("browser_console_logs")?.status === "verified"
      && byCheck.get("browser_network_logs")?.status === "verified"
      && byCheck.get("adversarial")?.status === "verified"
      && !report.issues.some(issue => issue.code === "no_executable_checks"),
    report,
    calls,
  };
}

export async function runTestAgentAutoBrowserSmokeSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-auto-browser-smoke-selftest-"));
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/dashboard`;
  const artifactDir = path.join(dir, "artifacts");
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = '<!doctype html><title>Auto smoke</title><main><h1>Dashboard</h1><p>Ready for verification</p></main>';",
    "http.createServer((req, res) => { res.writeHead(200, {'content-type':'text/html'}); res.end(html); }).listen(process.env.PORT);",
  ].join("\n"), "utf-8");
  const calls: any[] = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName, input) => {
      calls.push({ toolName, input });
      if (toolName.endsWith("browser_snapshot")) return "Dashboard\nReady for verification";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "auto-smoke.png" };
      return { ok: true };
    },
  });
  const acceptanceCriteria = ['Target URL opens with "Ready for verification" at /dashboard'];
  const derivedAssertions = buildAcceptanceDerivedBrowserAssertions(acceptanceCriteria);
  const autoCheck = buildAutoBrowserSmokeCheck({
    name: "auto-browser-smoke-self-test",
    workDir: dir,
    runCommand: "",
    devServerCommand: "",
    targetUrl,
    startupUrl: targetUrl,
    startupTimeoutMs: 1000,
    env: {},
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  }, acceptanceCriteria);
  const report = await runTestAgent({
    id: `auto-browser-smoke-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent auto-generates a browser smoke check from targetUrl.",
    acceptanceCriteria,
    requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
    projects: [{
      name: "auto-browser-smoke-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
    }],
    options: { browserProvider: "mcp", artifactDir },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const result = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = autoCheck?.probeType === AUTO_BROWSER_SMOKE_PROBE_TYPE
    && autoCheck?.assertions?.some(assertion => assertion.type === "jsTruthy") === true
    && derivedAssertions.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Ready for verification")
    && derivedAssertions.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/dashboard")
    && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Ready for verification") === true
    && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/dashboard") === true
    && report.status === "passed"
    && report.devServerResults.some(item => item.status === "started" || item.status === "already_running")
    && report.httpResults.some(item => item.name === "Page HTTP probe" && item.status === "passed")
    && report.browserResults.length === 1
    && result?.name === "Auto browser smoke: auto-browser-smoke-self-test"
    && result?.probeType === AUTO_BROWSER_SMOKE_PROBE_TYPE
    && result?.status === "passed"
    && result?.pageTextPreview?.includes("Ready for verification")
    && result?.steps.some(step => step.name.includes("jsTruthy") && step.status === "passed")
    && result?.steps.some(step => step.name.includes("text") && step.status === "passed" && step.detail === "Ready for verification")
    && result?.steps.some(step => step.name.includes("urlIncludes") && step.status === "passed" && step.detail === "/dashboard")
    && result?.screenshots.length === 1
    && (result?.pageSnapshots || []).length === 1
    && !!result?.consoleLogPath
    && !!result?.networkLogPath
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && byCheck.get("console_errors")?.status === "verified"
    && byCheck.get("browser_snapshots")?.status === "verified"
    && byCheck.get("browser_console_logs")?.status === "verified"
    && byCheck.get("browser_network_logs")?.status === "verified"
    && report.acceptanceCoverage.every(item => item.status === "verified")
    && calls.some(call => call.toolName.endsWith("browser_navigate"))
    && calls.some(call => call.toolName.endsWith("browser_snapshot"));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    calls,
    autoCheck,
    derivedAssertions,
  };
}

export function runTestAgentAcceptanceDerivedChecksSelfTest() {
  const criteria = [
    'Dashboard displays "Saved successfully" after submit.',
    "User remains on /settings/profile.",
    "Do not infer vague behavior without quoted text.",
  ];
  const derived = buildAcceptanceDerivedBrowserAssertions(criteria);
  const autoCheck = buildAutoBrowserSmokeCheck({
    name: "acceptance-derived-self-test",
    workDir: process.cwd(),
    runCommand: "",
    devServerCommand: "",
    targetUrl: "http://example.test/settings/profile",
    startupUrl: "http://example.test/settings/profile",
    startupTimeoutMs: 1000,
    env: {},
    changedFiles: [],
    verificationCommands: [],
    httpChecks: [],
    adversarialHttpChecks: [],
    adversarialBrowserChecks: [],
    browserChecks: [],
    agentSummary: "",
    risks: [],
  }, criteria);
  return {
    pass: derived.length === 2
      && derived.some(item => item.reason === "quoted_text" && item.assertion.type === "text" && item.assertion.text === "Saved successfully")
      && derived.some(item => item.reason === "explicit_url_path" && item.assertion.type === "urlIncludes" && item.assertion.text === "/settings/profile")
      && autoCheck?.assertions?.some(assertion => assertion.type === "text" && assertion.text === "Saved successfully") === true
      && autoCheck?.assertions?.some(assertion => assertion.type === "urlIncludes" && assertion.text === "/settings/profile") === true
      && autoCheck?.assertions?.some(assertion => assertion.type === "consoleNoErrors") === true,
    derived,
    autoCheck,
  };
}

export function runTestAgentSemanticLocatorSelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `semantic-locator-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser semantic locators normalize"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "semantic-locator-self-test",
      workDir: process.cwd(),
      browser_checks: [{
        title: "semantic browser targets",
        steps: [
          { action: "click", test_id: "save-button" },
          { action: "fill", label: "Email", value: "ada@example.test", exact: true },
          { action: "press_key", key_text: "Enter" },
        ],
        expectations: [
          { assertion: "visible", role: "button", name: "Save" },
          { assertion: "element_text_includes", data_testid: "toast", value: "Saved" },
        ],
      }],
    }],
  } as any);

  const check = workOrder.projects[0].browserChecks[0];
  const actionPlans = check.actions.map(action => buildSemanticLocatorPlan(action));
  const assertionPlans = check.assertions.map(assertion => buildSemanticLocatorPlan(assertion));
  return {
    pass: issues.every(issue => issue.severity !== "error")
      && actionPlans[0]?.kind === "testId"
      && actionPlans[0]?.value === "save-button"
      && actionPlans[1]?.kind === "label"
      && actionPlans[1]?.exact === true
      && actionPlans[2] === null
      && assertionPlans[0]?.kind === "role"
      && assertionPlans[0]?.name === "Save"
      && assertionPlans[1]?.kind === "testId"
      && assertionPlans[1]?.value === "toast",
    actionPlans,
    assertionPlans,
    issues,
  };
}

export function runTestAgentBrowserStateSelfTest() {
  const { workOrder, issues } = normalizeTestAgentWorkOrder({
    id: `browser-state-self-test-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["Browser state checks normalize"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-state-self-test",
      workDir: process.cwd(),
      browser_checks: [{
        title: "state survives refresh",
        steps: [
          { action: "goto", url: "http://example.test/" },
          { action: "evaluate", expression: "localStorage.setItem('profile.saved', 'yes')" },
          { action: "refresh" },
          { action: "go_back" },
          { action: "go_forward" },
        ],
        expectations: [
          { assertion: "local_storage_equals", key: "profile.saved", value: "yes" },
          { assertion: "js_truthy", expression: "Boolean(localStorage.getItem('profile.saved'))" },
          { assertion: "js_equals", expression: "document.readyState", value: "complete" },
        ],
      }],
    }],
  } as any);

  const check = workOrder.projects[0].browserChecks[0];
  const actionTypes = check.actions.map(action => action.type);
  const assertionTypes = check.assertions.map(assertion => assertion.type);
  return {
    pass: issues.every(issue => issue.severity !== "error")
      && actionTypes.join(",") === "goto,evaluate,reload,goBack,goForward"
      && assertionTypes.join(",") === "localStorageEquals,jsTruthy,jsEquals"
      && check.assertions[0].key === "profile.saved"
      && check.assertions[1].expression === "Boolean(localStorage.getItem('profile.saved'))",
    actionTypes,
    assertionTypes,
    issues,
  };
}

export async function runTestAgentBrowserPreflightSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-browser-preflight-selftest-"));
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_snapshot",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
    ],
    onCall: (toolName) => {
      if (toolName.endsWith("browser_snapshot")) return "Preflight Ready";
      if (toolName.endsWith("browser_console_messages")) return [];
      if (toolName.endsWith("browser_network_requests")) return [];
      if (toolName.endsWith("browser_take_screenshot")) return { path: "preflight.png" };
      return { ok: true };
    },
  });

  const artifactDir = path.join(dir, "artifacts");
  const report = await runTestAgent({
    id: `browser-preflight-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent records browser provider preflight.",
    acceptanceCriteria: ["Browser provider preflight is recorded"],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "browser-preflight-self-test",
      workDir: dir,
      browserChecks: [{
        name: "MCP preflight browser check",
        url: "http://example.test/",
        actions: [{ type: "goto", url: "http://example.test/" }],
        assertions: [{ type: "text", text: "Preflight Ready" }],
      }],
    }],
    options: { artifactDir, browserProvider: "mcp" },
  }, { browserProvider: "mcp", browserToolExecutor: executor });

  const preflight = report.metadata.browserProviderPreflight as any[];
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
  const pass = report.status === "passed"
    && Array.isArray(preflight)
    && preflight.some(item => item.provider === "mcp" && item.available === true && item.tools?.includes("mcp__playwright__browser_navigate"))
    && preflight.some(item => item.provider === "playwright")
    && markdown.includes("## Browser Provider Preflight")
    && markdown.includes("mcp__playwright__browser_navigate");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    preflight,
  };
}

export async function runTestAgentPlaywrightRealBrowserSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-real-playwright-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/profile`;
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Real Playwright TestAgent</title></head>",
    "<body>",
    "<main>",
    "<h1>Profile</h1>",
    "<label for=\"name\">Name</label>",
    "<input id=\"name\" name=\"name\" />",
    "<button type=\"button\" id=\"save\">Save</button>",
    "<p id=\"status\" role=\"status\">Waiting</p>",
    "</main>",
    "<script>",
    "document.getElementById('save').addEventListener('click', () => {",
    "  const value = document.getElementById('name').value;",
    "  localStorage.setItem('profile.saved', value);",
    "  document.getElementById('status').textContent = 'Saved ' + value;",
    "});",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const report = await runTestAgent({
    id: `real-playwright-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify TestAgent can operate a real browser through Playwright.",
    acceptanceCriteria: ['Profile page displays "Saved Ada" at /profile'],
    requiredChecks: ["browser_e2e", "screenshots", "console_errors", "browser_snapshots", "browser_console_logs", "browser_network_logs"],
    projects: [{
      name: "real-playwright-self-test",
      workDir: dir,
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      browserChecks: [{
        name: "Real profile save flow",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Name", value: "Ada" },
          { type: "click", role: "button", name: "Save" },
        ],
        assertions: [
          { type: "text", text: "Saved Ada" },
          { type: "localStorageEquals", key: "profile.saved", value: "Ada" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: { artifactDir, browserProvider: "playwright" },
  }, { browserProvider: "playwright" });

  const browser = report.browserResults[0];
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
  const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf-8") : "";
  const pass = report.status === "passed"
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl?.includes("/profile")
    && browser?.pageTextPreview?.includes("Saved Ada")
    && browser?.steps.some(step => step.name === "action:fill" && step.status === "passed")
    && browser?.steps.some(step => step.name === "action:click" && step.status === "passed")
    && browser?.steps.some(step => step.name === "assert:localStorageEquals" && step.status === "passed")
    && browser?.screenshots.length === 1
    && fs.existsSync(browser.screenshots[0])
    && (browser?.pageSnapshots || []).length >= 1
    && !!browser?.consoleLogPath
    && !!browser?.networkLogPath
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && byCheck.get("console_errors")?.status === "verified"
    && markdown.includes("Real profile save flow")
    && !!(report.metadata as any).playwrightLaunch?.launchAttempt;

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
    availability,
  };
}

export async function runTestAgentStandaloneCliRealWebSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-standalone-cli-real-web-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const workOrderPath = path.join(dir, "work-order.json");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/app`;
  const cliPath = path.join(__dirname, "cli.js");
  fs.writeFileSync(path.join(dir, "server.js"), [
    "const http = require('http');",
    "const html = `<!doctype html>",
    "<html><head><title>Standalone CLI Fixture</title></head>",
    "<body>",
    "<main>",
    "<h1>Task board</h1>",
    "<label for=\"task\">Task</label>",
    "<input id=\"task\" name=\"task\" />",
    "<button type=\"button\" id=\"add\">Add task</button>",
    "<ul id=\"tasks\" aria-label=\"Saved task list\"></ul>",
    "<p id=\"status\" role=\"status\">Ready</p>",
    "</main>",
    "<script>",
    "const input = document.getElementById('task');",
    "const list = document.getElementById('tasks');",
    "const status = document.getElementById('status');",
    "function readTasks() { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } }",
    "function writeTasks(tasks) { localStorage.setItem('tasks', JSON.stringify(tasks)); }",
    "function render() {",
    "  const tasks = readTasks();",
    "  list.innerHTML = '';",
    "  for (const task of tasks) { const item = document.createElement('li'); item.textContent = task; list.appendChild(item); }",
    "  status.textContent = tasks.length ? 'Saved ' + tasks[tasks.length - 1] : 'Ready';",
    "}",
    "document.getElementById('add').addEventListener('click', () => {",
    "  const value = input.value.trim();",
    "  if (!value) { status.textContent = 'Task required'; return; }",
    "  const tasks = readTasks();",
    "  tasks.push(value);",
    "  writeTasks(tasks);",
    "  render();",
    "});",
    "render();",
    "</script>",
    "</body></html>`;",
    "http.createServer((req, res) => {",
    "  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true})); return; }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end(html);",
    "}).listen(process.env.PORT);",
  ].join("\n"), "utf-8");

  const workOrder = {
    schema: "ccm-test-agent-work-order-v1",
    id: `standalone-cli-real-web-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify standalone TestAgent CLI can validate a real web feature in a browser.",
    acceptanceCriteria: [
      'Task board saves "Ship TestAgent" and still shows it after refresh at /app',
    ],
    requiredChecks: [
      "commands",
      "http",
      "browser_e2e",
      "screenshots",
      "console_errors",
      "browser_snapshots",
      "browser_console_logs",
      "browser_network_logs",
      "browser_trace",
      "browser_har",
    ],
    projects: [{
      name: "standalone-cli-real-web-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('standalone fixture command ok')"`],
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      httpChecks: [{
        name: "Task board HTTP probe",
        url: targetUrl,
        assertions: [
          { type: "status", status: 200 },
          { type: "textIncludes", text: "Task board" },
        ],
      }],
      browserChecks: [{
        name: "Standalone CLI task board flow",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", selector: "#task", value: "Ship TestAgent" },
          { type: "click", role: "button", name: "Add task" },
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Ship TestAgent" },
          { type: "localStorageIncludes", key: "tasks", value: "Ship TestAgent" },
          { type: "urlIncludes", text: "/app" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
    }],
    options: {
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
  };
  fs.writeFileSync(workOrderPath, JSON.stringify(workOrder, null, 2), "utf-8");

  const runResult = spawnSync(process.execPath, [
    cliPath,
    workOrderPath,
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "playwright",
    "--no-auto-discover",
  ], {
    cwd: dir,
    encoding: "utf-8",
    timeout: 120_000,
    windowsHide: true,
    env: { ...process.env },
  });

  const reportJsonPath = path.join(artifactDir, "report.json");
  const manifestPath = path.join(artifactDir, "artifact-manifest.json");
  const report = fs.existsSync(reportJsonPath) ? JSON.parse(fs.readFileSync(reportJsonPath, "utf-8")) : null;
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verifyResult = fs.existsSync(manifestPath)
    ? spawnSync(process.execPath, [
      cliPath,
      "--verify-artifacts",
      manifestPath,
      "--summary",
    ], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env },
    })
    : null;

  const browser = report?.browserResults?.[0];
  const byCheck = new Map<string, any>((report?.requiredCheckCoverage || []).map((item: any) => [item.check, item]));
  const browserArtifacts = browser?.browserArtifacts || [];
  const stdout = String(runResult.stdout || "");
  const stderr = String(runResult.stderr || "");
  const verifyStdout = String(verifyResult?.stdout || "");
  const pass = fs.existsSync(cliPath)
    && runResult.status === 0
    && !runResult.error
    && stdout.includes("TestAgent report: passed")
    && stderr.trim() === ""
    && report?.status === "passed"
    && report?.commandResults?.some((item: any) => item.status === "passed" && String(item.output || "").includes("standalone fixture command ok"))
    && report?.httpResults?.some((item: any) => item.status === "passed" && item.name === "Task board HTTP probe")
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl?.includes("/app")
    && browser?.pageTextPreview?.includes("Ship TestAgent")
    && browser?.steps?.some((step: any) => step.name === "action:reload" && step.status === "passed")
    && browser?.steps?.some((step: any) => step.name === "assert:localStorageIncludes" && step.status === "passed")
    && browser?.screenshots?.some((item: string) => fs.existsSync(item))
    && browserArtifacts.some((item: any) => item.type === "trace" && fs.existsSync(item.path))
    && browserArtifacts.some((item: any) => item.type === "har" && fs.existsSync(item.path))
    && byCheck.get("commands")?.status === "verified"
    && byCheck.get("http")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("browser_trace")?.status === "verified"
    && byCheck.get("browser_har")?.status === "verified"
    && manifest?.summary?.browserTraces >= 1
    && manifest?.summary?.browserHars >= 1
    && verifyResult?.status === 0
    && verifyStdout.includes("TestAgent artifact verification: passed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    runResult: {
      status: runResult.status,
      signal: runResult.signal,
      error: runResult.error?.message,
      stdout,
      stderr,
    },
    verifyResult: verifyResult ? {
      status: verifyResult.status,
      signal: verifyResult.signal,
      error: verifyResult.error?.message,
      stdout: verifyStdout,
      stderr: String(verifyResult.stderr || ""),
    } : null,
    report,
    manifest,
  };
}

export async function runTestAgentStandaloneHandoffRealWebSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) {
    return {
      pass: false,
      availability,
      reason: availability.reason,
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-standalone-handoff-real-web-selftest-"));
  const artifactDir = path.join(dir, "artifacts");
  const handoffPath = path.join(dir, "handoff.json");
  const port = await getFreePort();
  const targetUrl = `http://127.0.0.1:${port}/app`;
  const cliPath = path.join(__dirname, "cli.js");
  writeTaskBoardFixtureServer(dir);

  const handoff = {
    taskId: `standalone-handoff-real-web-self-test-${process.pid}-${Date.now()}`,
    groupId: "standalone-handoff-self-test-group",
    originalUserGoal: "Verify a group-main-agent handoff can drive TestAgent browser validation for a real web feature.",
    acceptanceCriteria: [
      'Task board saves "Ship handoff browser test" and still shows it after refresh at /app',
    ],
    completedTasks: [
      "The handoff CLI path can launch a real web fixture",
    ],
    completedByProjectAgents: ["frontend-agent", "verification-agent"],
    requiredChecks: [
      "commands",
      "http",
      "browser_e2e",
      "screenshots",
      "console_errors",
      "browser_snapshots",
      "browser_console_logs",
      "browser_network_logs",
      "browser_trace",
      "browser_har",
    ],
    projects: [{
      name: "standalone-handoff-real-web-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('handoff fixture command ok')"`],
      runCommand: `"${process.execPath}" server.js`,
      targetUrl,
      env: { PORT: port },
      httpChecks: [{
        name: "Handoff task board HTTP probe",
        url: targetUrl,
        assertions: [
          { type: "status", status: 200 },
          { type: "textIncludes", text: "Task board" },
        ],
      }],
      browserChecks: [{
        name: "Handoff CLI task board flow",
        url: targetUrl,
        actions: [
          { type: "goto", url: targetUrl },
          { type: "fill", label: "Task", exact: true, value: "Ship handoff browser test" },
          { type: "click", role: "button", name: "Add task" },
          { type: "reload" },
        ],
        assertions: [
          { type: "text", text: "Ship handoff browser test" },
          { type: "localStorageIncludes", key: "tasks", value: "Ship handoff browser test" },
          { type: "urlIncludes", text: "/app" },
          { type: "consoleNoErrors" },
          { type: "networkNoErrors" },
        ],
        screenshot: true,
      }],
      completedTasks: [
        "Task creation and refresh persistence were implemented",
      ],
      risks: [
        "Persistence must be verified in an actual browser session.",
      ],
    }],
    options: {
      browserProvider: "playwright",
      collectBrowserArtifacts: true,
    },
    metadata: {
      handoffSource: "standalone-handoff-real-web-self-test",
    },
  };
  fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2), "utf-8");

  const runResult = spawnSync(process.execPath, [
    cliPath,
    "--from-handoff",
    handoffPath,
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "playwright",
    "--no-auto-discover",
  ], {
    cwd: dir,
    encoding: "utf-8",
    timeout: 120_000,
    windowsHide: true,
    env: { ...process.env },
  });

  const reportJsonPath = path.join(artifactDir, "report.json");
  const manifestPath = path.join(artifactDir, "artifact-manifest.json");
  const report = fs.existsSync(reportJsonPath) ? JSON.parse(fs.readFileSync(reportJsonPath, "utf-8")) : null;
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf-8")) : null;
  const verifyResult = fs.existsSync(manifestPath)
    ? spawnSync(process.execPath, [
      cliPath,
      "--verify-artifacts",
      manifestPath,
      "--summary",
    ], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env },
    })
    : null;

  const browser = report?.browserResults?.[0];
  const byCheck = new Map<string, any>((report?.requiredCheckCoverage || []).map((item: any) => [item.check, item]));
  const browserArtifacts = browser?.browserArtifacts || [];
  const stdout = String(runResult.stdout || "");
  const stderr = String(runResult.stderr || "");
  const verifyStdout = String(verifyResult?.stdout || "");
  const pass = fs.existsSync(cliPath)
    && runResult.status === 0
    && !runResult.error
    && stdout.includes("TestAgent report: passed")
    && stderr.trim() === ""
    && report?.status === "passed"
    && report?.taskId === handoff.taskId
    && report?.groupId === handoff.groupId
    && report?.metadata?.handoffSource === "standalone-handoff-real-web-self-test"
    && report?.metadata?.completedByProjectAgents?.includes("frontend-agent")
    && report?.metadata?.completedByProjectAgents?.includes("verification-agent")
    && report?.commandResults?.some((item: any) => item.status === "passed" && String(item.output || "").includes("handoff fixture command ok"))
    && report?.httpResults?.some((item: any) => item.status === "passed" && item.name === "Handoff task board HTTP probe")
    && browser?.provider === "playwright"
    && browser?.status === "passed"
    && browser?.finalUrl?.includes("/app")
    && browser?.pageTextPreview?.includes("Ship handoff browser test")
    && browser?.steps?.some((step: any) => step.name === "action:reload" && step.status === "passed")
    && browser?.steps?.some((step: any) => step.name === "assert:localStorageIncludes" && step.status === "passed")
    && browser?.screenshots?.some((item: string) => fs.existsSync(item))
    && browserArtifacts.some((item: any) => item.type === "trace" && fs.existsSync(item.path))
    && browserArtifacts.some((item: any) => item.type === "har" && fs.existsSync(item.path))
    && byCheck.get("commands")?.status === "verified"
    && byCheck.get("http")?.status === "verified"
    && byCheck.get("browser_e2e")?.status === "verified"
    && byCheck.get("screenshots")?.status === "verified"
    && byCheck.get("console_errors")?.status === "verified"
    && byCheck.get("browser_trace")?.status === "verified"
    && byCheck.get("browser_har")?.status === "verified"
    && manifest?.summary?.browserTraces >= 1
    && manifest?.summary?.browserHars >= 1
    && verifyResult?.status === 0
    && verifyStdout.includes("TestAgent artifact verification: passed");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    availability,
    runResult: {
      status: runResult.status,
      signal: runResult.signal,
      error: runResult.error?.message,
      stdout,
      stderr,
    },
    verifyResult: verifyResult ? {
      status: verifyResult.status,
      signal: verifyResult.signal,
      error: verifyResult.error?.message,
      stdout: verifyStdout,
      stderr: String(verifyResult.stderr || ""),
    } : null,
    report,
    manifest,
  };
}

export async function runTestAgentPlaywrightAvailabilitySelfTest() {
  let closed = false;
  let fallbackClosed = false;
  const available = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async () => ({
        close: async () => { closed = true; },
      }),
    },
  }));
  const unavailable = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async () => {
        throw new Error("missing chromium binary");
      },
    },
  }));
  const fallback = await checkPlaywrightAvailability(() => ({
    chromium: {
      launch: async (options: any = {}) => {
        if (options.channel === "msedge") {
          return { close: async () => { fallbackClosed = true; } };
        }
        throw new Error(`missing ${options.channel || "bundled"}`);
      },
    },
  }));
  const availableDiagnostics: any = available.diagnostics || {};
  const unavailableDiagnostics: any = unavailable.diagnostics || {};
  const fallbackDiagnostics: any = fallback.diagnostics || {};
  const unavailableReason = String(unavailable.reason || "");
  const fallbackErrors = Array.isArray(fallbackDiagnostics.launchFallbackErrors)
    ? fallbackDiagnostics.launchFallbackErrors
    : [];
  return {
    pass: available.available === true
      && closed
      && availableDiagnostics.packageAvailable === true
      && availableDiagnostics.launchChecked === true
      && availableDiagnostics.launchAttempt === "bundled-chromium"
      && unavailable.available === false
      && unavailableReason.includes("Chromium launch failed")
      && unavailableDiagnostics.launchChecked === true
      && Array.isArray(unavailableDiagnostics.launchAttempts)
      && fallback.available === true
      && fallbackClosed
      && fallbackDiagnostics.channel === "msedge"
      && fallbackDiagnostics.launchAttempt === "msedge-channel"
      && fallbackErrors.length === 1,
    available,
    unavailable,
    fallback,
  };
}

export async function runTestAgentRequiredCheckCoverageSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-required-coverage-selftest-"));
  const report = await runTestAgent({
    id: `required-check-coverage-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify required check coverage gates final status.",
    acceptanceCriteria: ["Required checks are tracked separately"],
    requiredChecks: ["commands", "screenshots"],
    projects: [{
      name: "required-check-coverage-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('required command ok')"`],
    }],
    options: { browserProvider: "none" },
  });
  const byCheck = new Map(report.requiredCheckCoverage.map(item => [item.check, item]));
  const pass = report.status === "partial"
    && byCheck.get("commands")?.status === "verified"
    && byCheck.get("screenshots")?.status === "unknown"
    && !!byCheck.get("screenshots")?.missingReason
    && report.risks.some(item => item.includes("required check screenshots"));
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    report,
  };
}

export async function runTestAgentCliSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-cli-selftest-"));
  const workOrderPath = path.join(dir, "work-order.json");
  const handoffPath = path.join(dir, "handoff.json");
  const invalidHandoffPath = path.join(dir, "invalid-handoff.json");
  const warningHandoffPath = path.join(dir, "warning-handoff.json");
  const artifactDir = path.join(dir, "artifacts");
  const handoffArtifactDir = path.join(dir, "handoff-artifacts");
  const workOrder = {
    schema: "ccm-test-agent-work-order-v1",
    id: `cli-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify standalone TestAgent CLI execution.",
    acceptanceCriteria: ["CLI can validate and execute a work order file"],
    requiredChecks: ["commands"],
    projects: [{
      name: "cli-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('cli command ok')"`],
    }],
  };
  const handoff = {
    taskId: `cli-handoff-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify standalone TestAgent CLI can consume a handoff file.",
    acceptanceCriteria: ["Handoff input becomes a runnable TestAgent work order"],
    completedTasks: ["CLI handoff conversion implemented"],
    completedByProjectAgents: ["handoff-builder-agent"],
    projects: [{
      name: "cli-handoff-self-test",
      workDir: dir,
      verificationCommands: [`"${process.execPath}" -e "console.log('handoff cli command ok')"`],
      completedTasks: ["Handoff command evidence produced"],
    }],
    options: {
      browserProvider: "none",
    },
  };
  const warningHandoff = {
    taskId: `cli-warning-handoff-self-test-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify handoff builder diagnostics are surfaced by the CLI.",
    projects: [{
      name: "warning-handoff-self-test",
      verificationCommands: [`"${process.execPath}" -e "console.log('warning handoff command ok')"`],
    }],
    options: {
      browserProvider: "none",
    },
  };
  fs.writeFileSync(workOrderPath, JSON.stringify(workOrder, null, 2), "utf-8");
  fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2), "utf-8");
  fs.writeFileSync(invalidHandoffPath, "null", "utf-8");
  fs.writeFileSync(warningHandoffPath, JSON.stringify(warningHandoff, null, 2), "utf-8");

  const parsed = parseTestAgentCliArgs([
    workOrderPath,
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "none",
    "--no-auto-discover",
  ]);
  const handoffParsed = parseTestAgentCliArgs([
    "--from-handoff",
    handoffPath,
    "--summary",
    "--artifact-dir",
    handoffArtifactDir,
    "--browser-provider",
    "none",
    "--no-auto-discover",
  ]);
  const invalid = parseTestAgentCliArgs([workOrderPath, "--browser-provider", "unknown"]);
  const invalidHandoffCombo = parseTestAgentCliArgs([workOrderPath, "--from-handoff", handoffPath]);
  const overrides = cliOverrides(parsed.options);
  const handoffOverrides = cliOverrides(handoffParsed.options);
  const contractValidation = validateTestAgentWorkOrderContract(workOrder, overrides);
  const validationSummary = formatTestAgentCliValidationSummary(contractValidation);

  const validateStdout: string[] = [];
  const validateStderr: string[] = [];
  const validateResult = await runTestAgentCli([
    workOrderPath,
    "--validate-only",
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "none",
  ], {
    stdout: { write: message => validateStdout.push(String(message)) },
    stderr: { write: message => validateStderr.push(String(message)) },
  });

  const runStdout: string[] = [];
  const runStderr: string[] = [];
  const runResult = await runTestAgentCli([
    workOrderPath,
    "--summary",
    "--artifact-dir",
    artifactDir,
    "--browser-provider",
    "none",
    "--no-auto-discover",
  ], {
    stdout: { write: message => runStdout.push(String(message)) },
    stderr: { write: message => runStderr.push(String(message)) },
  });
  const reportJsonPath = path.join(artifactDir, "report.json");
  const report = fs.existsSync(reportJsonPath) ? JSON.parse(fs.readFileSync(reportJsonPath, "utf-8")) : null;
  const reportSummary = report ? formatTestAgentCliReportSummary(report) : "";

  const handoffValidateStdout: string[] = [];
  const handoffValidateStderr: string[] = [];
  const handoffValidateResult = await runTestAgentCli([
    "--from-handoff",
    handoffPath,
    "--validate-only",
    "--summary",
    "--artifact-dir",
    handoffArtifactDir,
    "--browser-provider",
    "none",
  ], {
    stdout: { write: message => handoffValidateStdout.push(String(message)) },
    stderr: { write: message => handoffValidateStderr.push(String(message)) },
  });

  const handoffRunStdout: string[] = [];
  const handoffRunStderr: string[] = [];
  const handoffRunResult = await runTestAgentCli([
    "--from-handoff",
    handoffPath,
    "--summary",
    "--artifact-dir",
    handoffArtifactDir,
    "--browser-provider",
    "none",
    "--no-auto-discover",
  ], {
    stdout: { write: message => handoffRunStdout.push(String(message)) },
    stderr: { write: message => handoffRunStderr.push(String(message)) },
  });
  const handoffReportJsonPath = path.join(handoffArtifactDir, "report.json");
  const handoffReport = fs.existsSync(handoffReportJsonPath) ? JSON.parse(fs.readFileSync(handoffReportJsonPath, "utf-8")) : null;
  const handoffReportSummary = handoffReport ? formatTestAgentCliReportSummary(handoffReport) : "";

  const invalidHandoffStdout: string[] = [];
  const invalidHandoffStderr: string[] = [];
  const invalidHandoffResult = await runTestAgentCli([
    "--from-handoff",
    invalidHandoffPath,
    "--validate-only",
  ], {
    stdout: { write: message => invalidHandoffStdout.push(String(message)) },
    stderr: { write: message => invalidHandoffStderr.push(String(message)) },
  });

  const warningHandoffStdout: string[] = [];
  const warningHandoffStderr: string[] = [];
  const warningHandoffResult = await runTestAgentCli([
    "--from-handoff",
    warningHandoffPath,
    "--validate-only",
    "--browser-provider",
    "none",
    "--no-auto-discover",
  ], {
    stdout: { write: message => warningHandoffStdout.push(String(message)) },
    stderr: { write: message => warningHandoffStderr.push(String(message)) },
  });
  let warningHandoffValidation: any = null;
  try { warningHandoffValidation = JSON.parse(warningHandoffStdout.join("")); } catch {}

  const pass = parsed.errors.length === 0
    && parsed.options.workOrderPath === workOrderPath
    && parsed.options.summary === true
    && parsed.options.json === false
    && parsed.options.artifactDir === artifactDir
    && parsed.options.browserProvider === "none"
    && parsed.options.autoDiscoverVerificationCommands === false
    && handoffParsed.errors.length === 0
    && handoffParsed.options.handoffPath === handoffPath
    && handoffParsed.options.workOrderPath === ""
    && handoffParsed.options.artifactDir === handoffArtifactDir
    && handoffOverrides.artifactDir === handoffArtifactDir
    && handoffOverrides.browserProvider === "none"
    && invalid.errors.some(error => error.includes("Unsupported browser provider"))
    && invalidHandoffCombo.errors.some(error => error.includes("--from-handoff cannot be combined"))
    && overrides.artifactDir === artifactDir
    && overrides.browserProvider === "none"
    && overrides.autoDiscoverVerificationCommands === false
    && contractValidation.valid
    && validationSummary.includes("TestAgent work order: valid")
    && validationSummary.includes("Browser provider: none")
    && validateResult.exitCode === 0
    && validateStdout.join("").includes("TestAgent work order: valid")
    && validateStderr.length === 0
    && runResult.exitCode === 0
    && runStdout.join("").includes("TestAgent report: passed")
    && runStdout.join("").includes("Commands: passed:1")
    && runStderr.length === 0
    && report?.status === "passed"
    && reportSummary.includes("Artifacts:")
    && handoffValidateResult.exitCode === 0
    && handoffValidateStdout.join("").includes("TestAgent work order: valid")
    && handoffValidateStdout.join("").includes("Projects: cli-handoff-self-test")
    && handoffValidateStderr.length === 0
    && handoffRunResult.exitCode === 0
    && handoffRunStdout.join("").includes("TestAgent report: passed")
    && handoffRunStdout.join("").includes("Commands: passed:1")
    && handoffRunStderr.length === 0
    && handoffReport?.status === "passed"
    && handoffReport?.requiredChecks?.includes("commands")
    && handoffReport?.metadata?.handoffSource === "test-agent-handoff-builder"
    && handoffReport?.metadata?.completedByProjectAgents?.includes("handoff-builder-agent")
    && handoffReportSummary.includes("Artifacts:")
    && invalidHandoffResult.exitCode === 2
    && invalidHandoffStdout.length === 0
    && invalidHandoffStderr.join("").includes("root value must be a JSON object")
    && warningHandoffResult.exitCode === 0
    && warningHandoffStderr.length === 0
    && warningHandoffValidation?.valid === true
    && warningHandoffValidation?.warnings?.some((item: any) => item.code === "handoff_builder_warning" && String(item.message || "").includes("missing workDir"))
    && warningHandoffValidation?.warnings?.some((item: any) => item.code === "handoff_builder_warning" && String(item.message || "").includes("No acceptance criteria"))
    && warningHandoffValidation?.normalized?.metadata?.handoffWarnings?.some((item: string) => item.includes("missing workDir"));

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    pass,
    parsed,
    handoffParsed,
    invalid,
    invalidHandoffCombo,
    validateResult,
    runResult,
    handoffValidateResult,
    handoffRunResult,
    invalidHandoffResult,
    warningHandoffResult,
    validationSummary,
    reportSummary,
    handoffReportSummary,
    invalidHandoffError: invalidHandoffStderr.join(""),
    warningHandoffValidation,
  };
}

export function runTestAgentContractSelfTest() {
  const workOrderValidation = validateTestAgentWorkOrderContract(TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE);
  const invalidWorkOrderValidation = validateTestAgentWorkOrderContract({
    schema: "ccm-test-agent-work-order-v1",
    id: `contract-invalid-self-test-${process.pid}-${Date.now()}`,
  });
  const now = new Date().toISOString();
  const reportValidation = validateTestAgentReportContract({
    schema: "ccm-test-agent-report-v1",
    agent: "test-agent",
    id: `contract-report-self-test-${process.pid}-${Date.now()}`,
    workOrderId: "contract-work-order",
    taskId: "contract-task",
    groupId: "contract-group",
    status: "passed",
    recommendation: "accept",
    summary: "Contract report validates.",
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
    artifactDir: process.cwd(),
    requiredChecks: [],
    commandResults: [],
    devServerResults: [],
    httpResults: [],
    browserResults: [],
    browserToolCalls: [],
    requiredCheckCoverage: [],
    acceptanceCoverage: [],
    evidence: [],
    risks: [],
    blockedReasons: [],
    issues: [],
    metadata: {},
  });

  return {
    pass: workOrderValidation.valid
      && workOrderValidation.normalized?.schema === "ccm-test-agent-work-order-v1"
      && workOrderValidation.normalized?.projects[0].browserChecks.length === 1
      && workOrderValidation.normalized?.projects[0].adversarialBrowserChecks.length === 1
      && !invalidWorkOrderValidation.valid
      && invalidWorkOrderValidation.errors.some(issue => issue.path === "projects")
      && reportValidation.valid,
    workOrderValidation,
    invalidWorkOrderValidation,
    reportValidation,
  };
}

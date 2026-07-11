import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import {
  normalizeTestAgentWorkOrderForSelfTest as normalizeTestAgentWorkOrder,
  runTestAgentForSelfTest as runTestAgent,
} from "../self-test-policy";
import { verifyTestAgentArtifactManifestFile } from "../artifact-verifier";
import { formatTestAgentCliExecutionPlanSummary } from "../cli";
import { validateTestAgentReportContract, validateTestAgentVerdictContract } from "../contract";
import { buildTestAgentExecutionPlan } from "../execution-plan";
import { buildTestAgentVerdict } from "../verdict";
import { buildAcceptanceClickFlowBrowserChecks } from "./acceptance-click-flows";
import { createStaticBrowserToolExecutor } from "./tool-executor";

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

async function listen(server: http.Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to allocate action-effect self-test port.");
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: http.Server) {
  await new Promise<void>(resolve => server.close(() => resolve()));
}

function actionEffectFixtureServer() {
  const page = `<!doctype html>
<html>
<head><title>Action effect fixture</title></head>
<body>
  <p id="status">Ready</p>
  <button id="effective" type="button">Apply change</button>
  <button id="ineffective" type="button">No effect</button>
  <button id="dialog" type="button">Open dialog</button>
  <a href="/next">Open next page</a>
  <script>
    document.getElementById("effective").addEventListener("click", () => {
      document.getElementById("status").textContent = "Changed";
    });
    document.getElementById("ineffective").addEventListener("click", () => {});
    document.getElementById("dialog").addEventListener("click", () => alert("Action completed"));
  </script>
</body>
</html>`;
  const next = "<!doctype html><html><head><title>Next page</title></head><body><h1>Next page ready</h1></body></html>";
  return http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(request.url === "/next" ? next : page);
  });
}

function multiSessionActionEffectFixtureServer() {
  const page = `<!doctype html>
<html>
<head><title>Multi-session action effect fixture</title></head>
<body>
  <p id="identity"></p>
  <p id="status">Ready</p>
  <button id="setup" type="button">Setup</button>
  <button id="apply" type="button"></button>
  <button id="ineffective" type="button">No effect</button>
  <script>
    const user = new URL(location.href).searchParams.get("user") || "anonymous";
    const status = document.getElementById("status");
    document.getElementById("identity").textContent = "Session " + user;
    document.getElementById("apply").textContent = "Apply " + user;
    document.getElementById("setup").addEventListener("click", () => {
      status.textContent = user + " setup complete";
    });
    document.getElementById("apply").addEventListener("click", () => {
      status.textContent = user + " action complete";
    });
    document.getElementById("ineffective").addEventListener("click", () => {});
  </script>
</body>
</html>`;
  return http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
  });
}

function crossSessionActionEffectFixtureServer() {
  const counts = new Map<string, number>();
  const page = `<!doctype html>
<html>
<head><title>Cross-session action effect fixture</title><link rel="icon" href="data:,"></head>
<body>
  <p id="identity"></p>
  <p id="status">No broadcast</p>
  <button id="broadcast" type="button">Broadcast</button>
  <button id="local" type="button">Local only</button>
  <script>
    const query = new URL(location.href).searchParams;
    const user = query.get("user") || "anonymous";
    const channel = query.get("channel") || "default";
    const status = document.getElementById("status");
    document.getElementById("identity").textContent = "Session " + user;
    document.getElementById("broadcast").addEventListener("click", async () => {
      await fetch("/broadcast?channel=" + encodeURIComponent(channel), { method: "POST" });
    });
    document.getElementById("local").addEventListener("click", () => {
      status.textContent = user + " local change";
    });
    async function refresh() {
      const response = await fetch("/state?channel=" + encodeURIComponent(channel));
      const state = await response.json();
      if (state.count > 0) status.textContent = "Broadcast received " + state.count;
    }
    refresh();
    setInterval(refresh, 50);
  </script>
</body>
</html>`;
  return http.createServer((request, response) => {
    const parsed = new URL(request.url || "/", "http://127.0.0.1");
    const channel = parsed.searchParams.get("channel") || "default";
    if (request.method === "POST" && parsed.pathname === "/broadcast") {
      counts.set(channel, (counts.get(channel) || 0) + 1);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: true, count: counts.get(channel) }));
      return;
    }
    if (request.method === "GET" && parsed.pathname === "/state") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ count: counts.get(channel) || 0 }));
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page);
  });
}

function failedActionEffectArtifact(verification: ReturnType<typeof verifyTestAgentArtifactManifestFile>) {
  return verification.status === "failed"
    && verification.items.some(item => item.type === "browser_action_effect_evidence" && item.status === "failed");
}

export async function runTestAgentPlaywrightActionEffectSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-action-effects-"));
  const server = actionEffectFixtureServer();
  const targetUrl = await listen(server);
  const artifactDir = path.join(dir, "artifacts");
  const input = {
    id: `action-effect-playwright-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify browser actions produce observable user-facing effects.",
    acceptanceCriteria: [
      "Clicking Apply change updates the page.",
      "Clicking No effect must be rejected.",
      "Opening the next page changes the URL.",
      "Opening a dialog increments dialog telemetry.",
    ],
    requiredChecks: ["browser_e2e"],
    projects: [{
      name: "action-effect-playwright",
      workDir: dir,
      targetUrl,
      browserChecks: [
        {
          name: "Page text changes",
          actions: [
            { type: "goto", url: targetUrl },
            { type: "click", role: "button", name: "Apply change", verifyEffect: true, effectSignals: ["page_text"], effectTimeoutMs: 500 },
          ],
          assertions: [{ type: "text", text: "Changed" }],
          screenshot: false,
        },
        {
          name: "No-op click is rejected",
          actions: [
            { type: "goto", url: targetUrl },
            { type: "click", role: "button", name: "No effect", verifyEffect: true, effectSignals: ["url", "title", "page_text", "dom"], effectTimeoutMs: 250 },
          ],
          screenshot: false,
        },
        {
          name: "URL navigation changes",
          actions: [
            { type: "goto", url: targetUrl },
            { type: "click", role: "link", name: "Open next page", verifyEffect: true, effectSignals: ["url"], effectTimeoutMs: 1_000 },
          ],
          assertions: [{ type: "urlIncludes", text: "/next" }],
          screenshot: false,
        },
        {
          name: "Dialog count changes",
          actions: [
            { type: "goto", url: targetUrl },
            { type: "click", role: "button", name: "Open dialog", verifyEffect: true, effectSignals: ["dialog"], effectTimeoutMs: 500 },
          ],
          screenshot: false,
        },
      ],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      browserTimeoutMs: 2_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };

  try {
    const plan = buildTestAgentExecutionPlan(input as any);
    const planText = formatTestAgentCliExecutionPlanSummary(plan);
    const report = await runTestAgent(input as any, { browserProvider: "playwright" });
    const byName = new Map(report.browserResults.map(result => [result.name, result]));
    const changed = byName.get("Page text changes");
    const noEffect = byName.get("No-op click is rejected");
    const navigation = byName.get("URL navigation changes");
    const dialog = byName.get("Dialog count changes");
    const generatedChecks = buildAcceptanceClickFlowBrowserChecks({
      name: "generated-click-flow",
      workDir: dir,
      targetUrl,
    } as any, ['Click "Apply change", then "Changed" should be visible.']);
    const generatedClick = generatedChecks[0]?.actions?.find(action => action.type === "click");
    const contract = validateTestAgentReportContract(report);
    const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
    const reportJsonPath = String((report.metadata.artifactFiles as any)?.reportJsonPath || "");
    const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
    const originalReportText = fs.readFileSync(reportJsonPath, "utf-8");
    const markdown = fs.readFileSync(markdownPath, "utf-8");
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);

    const verifyTamper = (mutate: (tampered: any) => void) => {
      const tampered = JSON.parse(originalReportText);
      mutate(tampered);
      fs.writeFileSync(reportJsonPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");
      refreshManifestItemIntegrity(manifestPath, "report_json");
      return verifyTestAgentArtifactManifestFile(manifestPath);
    };
    const digestTamper = verifyTamper(tampered => {
      const effect = tampered.browserResults
        .find((result: any) => result.name === "Page text changes")
        .actionEffects[0];
      effect.before.pageTextSha256 = effect.after.pageTextSha256;
    });
    const countTamper = verifyTamper(tampered => {
      const effect = tampered.browserResults
        .find((result: any) => result.name === "Dialog count changes")
        .actionEffects[0];
      effect.after.dialogCount = effect.before.dialogCount;
    });
    const summaryTamper = verifyTamper(tampered => {
      tampered.browserActionEffectSummary.actions += 1;
    });
    const rawDetailTamper = verifyTamper(tampered => {
      tampered.browserResults
        .find((result: any) => result.name === "Page text changes")
        .actionEffects[0].rawPageText = "Changed";
    });
    fs.writeFileSync(reportJsonPath, originalReportText, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");

    const pass = report.status === "failed"
      && changed?.status === "passed"
      && changed.actionEffects?.[0]?.status === "changed"
      && changed.actionEffects?.[0]?.changedSignals.join(",") === "page_text"
      && noEffect?.status === "failed"
      && noEffect.actionEffects?.[0]?.status === "unchanged"
      && noEffect.steps.some(step => step.name === "assert:actionEffect" && step.status === "failed")
      && navigation?.status === "passed"
      && navigation.actionEffects?.[0]?.changedSignals.join(",") === "url"
      && dialog?.status === "passed"
      && dialog.actionEffects?.[0]?.changedSignals.join(",") === "dialog"
      && report.browserActionEffectSummary?.checks === 4
      && report.browserActionEffectSummary.actions === 4
      && report.browserActionEffectSummary.changed === 3
      && report.browserActionEffectSummary.failed === 1
      && plan.summary.browserActionEffectChecks === 4
      && plan.summary.browserActionEffectActions === 4
      && plan.projects.every(project => project.browserChecks.every(check => check.actionEffectCount === 1))
      && planText.includes("Browser action effect plan: checks:4 actions:4")
      && generatedClick?.verifyEffect === true
      && generatedClick.effectSignals?.includes("page_text")
      && !generatedClick.effectSignals?.includes("network")
      && markdown.includes("## Browser Action Effect Summary")
      && contract.valid
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_action_effect_evidence" && item.status === "passed")
      && failedActionEffectArtifact(digestTamper)
      && failedActionEffectArtifact(countTamper)
      && failedActionEffectArtifact(summaryTamper)
      && failedActionEffectArtifact(rawDetailTamper);

    return {
      pass,
      report,
      plan,
      contract,
      artifactVerification,
      digestTamper,
      countTamper,
      summaryTamper,
      rawDetailTamper,
      generatedChecks,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export async function runTestAgentMultiSessionActionEffectSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-multi-session-action-effects-"));
  const server = multiSessionActionEffectFixtureServer();
  const targetUrl = await listen(server);
  const artifactDir = path.join(dir, "artifacts");
  const input = {
    id: `multi-session-action-effect-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify browser actions have observable effects in each isolated user session.",
    acceptanceCriteria: [
      "Setup and parallel actions must change the correct session page.",
      "A no-op action in either session must fail the whole multi-session check.",
    ],
    requiredChecks: ["browser_e2e", "browser_multi_session"],
    projects: [{
      name: "multi-session-action-effect",
      workDir: dir,
      targetUrl,
      browserChecks: [
        {
          name: "Session-scoped setup and parallel effects",
          screenshot: false,
          sessions: [
            {
              name: "sender",
              url: `${targetUrl}/?user=sender`,
              setupActions: [{
                type: "click",
                role: "button",
                name: "Setup",
                verifyEffect: true,
                effectSignals: ["page_text"],
                effectTimeoutMs: 500,
              }],
            },
            {
              name: "receiver",
              url: `${targetUrl}/?user=receiver`,
              setupActions: [{
                type: "click",
                role: "button",
                name: "Setup",
              }],
            },
          ],
          sessionSteps: [{
            parallel: [
              {
                session: "sender",
                action: {
                  type: "click",
                  role: "button",
                  name: "Apply sender",
                  verifyEffect: true,
                  effectSignals: ["page_text"],
                  effectTimeoutMs: 500,
                },
              },
              {
                session: "receiver",
                action: {
                  type: "click",
                  role: "button",
                  name: "Apply receiver",
                  verifyEffect: true,
                  effectSignals: ["page_text"],
                  effectTimeoutMs: 500,
                },
              },
            ],
          }],
        },
        {
          name: "Session-scoped no-op is rejected",
          screenshot: false,
          sessions: [
            { name: "left", url: `${targetUrl}/?user=left` },
            { name: "right", url: `${targetUrl}/?user=right` },
          ],
          sessionSteps: [
            {
              session: "left",
              action: {
                type: "click",
                role: "button",
                name: "Apply left",
                verifyEffect: true,
                effectSignals: ["page_text"],
                effectTimeoutMs: 500,
              },
            },
            {
              session: "right",
              action: {
                type: "click",
                role: "button",
                name: "No effect",
                verifyEffect: true,
                effectSignals: ["page_text"],
                effectTimeoutMs: 250,
              },
            },
          ],
        },
      ],
    }],
    options: {
      artifactDir,
      browserProvider: "playwright",
      browserTimeoutMs: 2_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };

  try {
    const plan = buildTestAgentExecutionPlan(input as any);
    const report = await runTestAgent(input as any, { browserProvider: "playwright" });
    const passing = report.browserResults.find(result => result.name === "Session-scoped setup and parallel effects");
    const failing = report.browserResults.find(result => result.name === "Session-scoped no-op is rejected");
    const passingEffects = passing?.actionEffects || [];
    const failingEffects = failing?.actionEffects || [];
    const passingActionSteps = passing?.steps.filter(step => step.kind === "action") || [];
    const contract = validateTestAgentReportContract(report);
    const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
    const reportJsonPath = String((report.metadata.artifactFiles as any)?.reportJsonPath || "");
    const markdownPath = String((report.metadata.artifactFiles as any)?.reportMarkdownPath || "");
    const originalReportText = fs.readFileSync(reportJsonPath, "utf-8");
    const markdown = fs.readFileSync(markdownPath, "utf-8");
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);

    const verifyTamper = (mutate: (tampered: any) => void) => {
      const tampered = JSON.parse(originalReportText);
      mutate(tampered);
      const tamperedContract = validateTestAgentReportContract(tampered);
      fs.writeFileSync(reportJsonPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");
      refreshManifestItemIntegrity(manifestPath, "report_json");
      return {
        contract: tamperedContract,
        artifact: verifyTestAgentArtifactManifestFile(manifestPath),
      };
    };
    const missingSessionTamper = verifyTamper(tampered => {
      delete tampered.browserResults
        .find((result: any) => result.name === "Session-scoped setup and parallel effects")
        .actionEffects[0].session;
    });
    const mismatchedSessionTamper = verifyTamper(tampered => {
      tampered.browserResults
        .find((result: any) => result.name === "Session-scoped setup and parallel effects")
        .actionEffects[0].session = "receiver";
    });
    fs.writeFileSync(reportJsonPath, originalReportText, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");

    const pass = report.status === "failed"
      && passing?.status === "passed"
      && passingActionSteps.map(step => step.name).join(",") === [
        "session:sender:action:goto",
        "session:sender:action:click",
        "session:receiver:action:goto",
        "session:receiver:action:click",
        "session:sender:action:click",
        "session:receiver:action:click",
      ].join(",")
      && passingEffects.length === 3
      && passingEffects.map(effect => effect.actionIndex).join(",") === "1,4,5"
      && passingEffects.map(effect => effect.session).join(",") === "sender,sender,receiver"
      && passingEffects.every(effect => effect.status === "changed")
      && passingEffects.every(effect => effect.changedSignals.join(",") === "page_text")
      && passing?.steps.filter(step => step.name.endsWith(":assert:actionEffect")).length === 3
      && passing?.steps.filter(step =>
        step.name.endsWith(":assert:actionEffect")
        && String(step.detail || "").includes("parallelGroup=1")
      ).length === 2
      && failing?.status === "failed"
      && failingEffects.length === 2
      && failingEffects.map(effect => effect.actionIndex).join(",") === "2,3"
      && failingEffects.map(effect => effect.session).join(",") === "left,right"
      && failingEffects[0]?.status === "changed"
      && failingEffects[1]?.status === "unchanged"
      && failing?.steps.some(step => step.name === "session:right:assert:actionEffect" && step.status === "failed")
      && report.browserActionEffectSummary?.checks === 2
      && report.browserActionEffectSummary.actions === 5
      && report.browserActionEffectSummary.changed === 4
      && report.browserActionEffectSummary.unchanged === 1
      && report.browserActionEffectSummary.failed === 1
      && plan.summary.browserActionEffectChecks === 2
      && plan.summary.browserActionEffectActions === 5
      && plan.projects[0]?.browserChecks[0]?.actionCount === 4
      && plan.projects[0]?.browserChecks[0]?.actionEffectCount === 3
      && plan.projects[0]?.browserChecks[1]?.actionCount === 2
      && plan.projects[0]?.browserChecks[1]?.actionEffectCount === 2
      && markdown.includes("session=sender")
      && markdown.includes("session=receiver")
      && contract.valid
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_action_effect_evidence" && item.status === "passed")
      && !missingSessionTamper.contract.valid
      && failedActionEffectArtifact(missingSessionTamper.artifact)
      && !mismatchedSessionTamper.contract.valid
      && failedActionEffectArtifact(mismatchedSessionTamper.artifact);

    return {
      pass,
      report,
      plan,
      contract,
      artifactVerification,
      missingSessionTamper,
      mismatchedSessionTamper,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export async function runTestAgentCrossSessionActionEffectSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-cross-session-action-effects-"));
  const server = crossSessionActionEffectFixtureServer();
  const targetUrl = await listen(server);
  const passInput = {
    id: `cross-session-action-effect-pass-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify a sender action changes an already-open receiver browser session.",
    acceptanceCriteria: ["Broadcasting from sender updates the receiver page."],
    requiredChecks: ["browser_e2e", "browser_multi_session", "browser_cross_session_effect"],
    projects: [{
      name: "cross-session-action-effect",
      workDir: dir,
      targetUrl,
      browserChecks: [{
        name: "Sender broadcast changes receiver",
        screenshot: false,
        sessions: [
          { name: "sender", url: `${targetUrl}/?user=sender&channel=pass` },
          { name: "receiver", url: `${targetUrl}/?user=receiver&channel=pass` },
        ],
        sessionSteps: [
          {
            parallel: [
              {
                session: "receiver",
                action: {
                  type: "waitForText",
                  text: "Broadcast received 1",
                  timeoutMs: 5_000,
                },
              },
              {
                session: "sender",
                action: {
                  type: "click",
                  role: "button",
                  name: "Broadcast",
                  verifyEffect: true,
                  effectSession: "receiver",
                  effectSignals: ["page_text"],
                  effectTimeoutMs: 2_000,
                },
              },
            ],
          },
          {
            session: "receiver",
            assertion: {
              type: "visible",
              text: "Broadcast received 1",
              exact: true,
            },
          },
        ],
      }],
    }],
    options: {
      artifactDir: path.join(dir, "pass-artifacts"),
      browserProvider: "playwright",
      browserTimeoutMs: 5_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };
  const failInput = {
    ...passInput,
    id: `cross-session-action-effect-fail-${process.pid}-${Date.now()}`,
    acceptanceCriteria: ["A sender-local change must not count as a receiver effect."],
    projects: [{
      ...passInput.projects[0],
      browserChecks: [{
        name: "Sender-local change does not change receiver",
        screenshot: false,
        sessions: [
          { name: "sender", url: `${targetUrl}/?user=sender&channel=fail` },
          { name: "receiver", url: `${targetUrl}/?user=receiver&channel=fail` },
        ],
        sessionSteps: [
          {
            session: "sender",
            action: {
              type: "click",
              role: "button",
              name: "Local only",
              verifyEffect: true,
              effectSession: "receiver",
              effectSignals: ["page_text"],
              effectTimeoutMs: 250,
            },
          },
          {
            session: "receiver",
            assertion: {
              type: "visible",
              text: "No broadcast",
              exact: true,
            },
          },
        ],
      }],
    }],
    options: {
      ...passInput.options,
      artifactDir: path.join(dir, "fail-artifacts"),
    },
  };

  try {
    const plan = buildTestAgentExecutionPlan(passInput as any);
    const planText = formatTestAgentCliExecutionPlanSummary(plan);
    const passReport = await runTestAgent(passInput as any, { browserProvider: "playwright" });
    const failReport = await runTestAgent(failInput as any, { browserProvider: "playwright" });
    const passBrowser = passReport.browserResults[0];
    const failBrowser = failReport.browserResults[0];
    const passEffect = passBrowser?.actionEffects?.[0];
    const failEffect = failBrowser?.actionEffects?.[0];
    const verdict = buildTestAgentVerdict(passReport);
    const passContract = validateTestAgentReportContract(passReport);
    const failContract = validateTestAgentReportContract(failReport);
    const verdictContract = validateTestAgentVerdictContract(verdict);
    const passCoverage = new Map(passReport.requiredCheckCoverage.map(item => [item.check, item]));
    const failCoverage = new Map(failReport.requiredCheckCoverage.map(item => [item.check, item]));
    const manifestPath = String((passReport.metadata.artifactFiles as any)?.manifestPath || "");
    const reportJsonPath = String((passReport.metadata.artifactFiles as any)?.reportJsonPath || "");
    const markdownPath = String((passReport.metadata.artifactFiles as any)?.reportMarkdownPath || "");
    const originalReportText = fs.readFileSync(reportJsonPath, "utf-8");
    const markdown = fs.readFileSync(markdownPath, "utf-8");
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const verifyTamper = (mutate: (tampered: any) => void) => {
      const tampered = JSON.parse(originalReportText);
      mutate(tampered);
      const contract = validateTestAgentReportContract(tampered);
      fs.writeFileSync(reportJsonPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");
      refreshManifestItemIntegrity(manifestPath, "report_json");
      return {
        contract,
        artifact: verifyTestAgentArtifactManifestFile(manifestPath),
      };
    };
    const missingTargetTamper = verifyTamper(tampered => {
      delete tampered.browserResults[0].actionEffects[0].effectSession;
    });
    const mismatchedTargetTamper = verifyTamper(tampered => {
      tampered.browserResults[0].actionEffects[0].effectSession = "sender";
    });
    fs.writeFileSync(reportJsonPath, originalReportText, "utf-8");
    refreshManifestItemIntegrity(manifestPath, "report_json");

    const invalidSingleSession = normalizeTestAgentWorkOrder({
      ...passInput,
      id: `${passInput.id}-single-session-invalid`,
      projects: [{
        ...passInput.projects[0],
        browserChecks: [{
          name: "Invalid single-session target",
          actions: [{
            type: "click",
            text: "Broadcast",
            verifyEffect: true,
            effectSession: "receiver",
          }],
        }],
      }],
    } as any);
    const invalidUnknownTarget = normalizeTestAgentWorkOrder({
      ...passInput,
      id: `${passInput.id}-unknown-target-invalid`,
      projects: [{
        ...passInput.projects[0],
        browserChecks: [{
          ...passInput.projects[0].browserChecks[0],
          sessionSteps: [{
            session: "sender",
            action: {
              type: "click",
              text: "Broadcast",
              verifyEffect: true,
              effectSession: "missing",
            },
          }, {
            session: "receiver",
            assertion: { type: "visible", text: "No broadcast" },
          }],
        }],
      }],
    } as any);
    const invalidMissingVerify = normalizeTestAgentWorkOrder({
      ...passInput,
      id: `${passInput.id}-missing-verify-invalid`,
      projects: [{
        ...passInput.projects[0],
        browserChecks: [{
          ...passInput.projects[0].browserChecks[0],
          sessionSteps: [{
            session: "sender",
            action: {
              type: "click",
              text: "Broadcast",
              effect_session: "receiver",
            },
          }, {
            session: "receiver",
            assertion: { type: "visible", text: "No broadcast" },
          }],
        }],
      }],
    } as any);
    const invalidSameTarget = normalizeTestAgentWorkOrder({
      ...passInput,
      id: `${passInput.id}-same-target-invalid`,
      projects: [{
        ...passInput.projects[0],
        browserChecks: [{
          ...passInput.projects[0].browserChecks[0],
          sessionSteps: [{
            session: "sender",
            action: {
              type: "click",
              text: "Broadcast",
              verifyEffect: true,
              effectSession: "sender",
            },
          }, {
            session: "receiver",
            assertion: { type: "visible", text: "No broadcast" },
          }],
        }],
      }],
    } as any);

    const pass = passReport.status === "passed"
      && passBrowser?.status === "passed"
      && passEffect?.session === "sender"
      && passEffect.effectSession === "receiver"
      && passEffect.actionIndex === 3
      && passEffect.status === "changed"
      && passEffect.changedSignals.join(",") === "page_text"
      && passBrowser.steps.some(step =>
        step.name === "session:sender:assert:actionEffect"
        && step.status === "passed"
        && String(step.detail || "").includes("effectSession=receiver")
      )
      && passBrowser.browserSessions?.find(session => session.name === "receiver")?.pageTextPreview?.includes("Broadcast received 1")
      && passReport.browserActionEffectSummary?.crossSession === 1
      && passReport.browserActionEffectSummary.items[0]?.crossSession === 1
      && verdict.evidenceSummary.browserCrossSessionActionEffects === 1
      && passCoverage.get("browser_cross_session_effect")?.status === "verified"
      && plan.summary.browserActionEffectActions === 1
      && plan.summary.browserCrossSessionActionEffectActions === 1
      && plan.projects[0]?.browserChecks[0]?.actionEffectCount === 1
      && plan.projects[0]?.browserChecks[0]?.crossSessionActionEffectCount === 1
      && planText.includes("Browser action effect plan: checks:1 actions:1 crossSession:1")
      && failReport.status === "failed"
      && failBrowser?.status === "failed"
      && failEffect?.session === "sender"
      && failEffect.effectSession === "receiver"
      && failEffect.status === "unchanged"
      && failBrowser.steps.some(step =>
        step.name === "session:sender:assert:actionEffect"
        && step.status === "failed"
        && String(step.detail || "").includes("effectSession=receiver")
      )
      && failCoverage.get("browser_cross_session_effect")?.status === "not_verified"
      && markdown.includes("effectSession=receiver")
      && passContract.valid
      && failContract.valid
      && verdictContract.valid
      && artifactVerification.status === "passed"
      && !missingTargetTamper.contract.valid
      && failedActionEffectArtifact(missingTargetTamper.artifact)
      && !mismatchedTargetTamper.contract.valid
      && failedActionEffectArtifact(mismatchedTargetTamper.artifact)
      && invalidSingleSession.issues.some(issue => issue.code === "invalid_browser_action_effect_session")
      && invalidUnknownTarget.issues.some(issue => issue.code === "invalid_browser_multi_session" && issue.message.includes("unknown session"))
      && invalidMissingVerify.issues.some(issue => issue.code === "invalid_browser_multi_session" && issue.message.includes("without enabling verifyEffect"))
      && invalidSameTarget.issues.some(issue => issue.code === "invalid_browser_multi_session" && issue.message.includes("must differ from the actor session"));

    return {
      pass,
      passReport,
      failReport,
      plan,
      verdict,
      passContract,
      failContract,
      verdictContract,
      artifactVerification,
      missingTargetTamper,
      mismatchedTargetTamper,
      invalidSingleSession,
      invalidUnknownTarget,
      invalidMissingVerify,
      invalidSameTarget,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export async function runTestAgentMcpActionEffectSelfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-mcp-action-effects-"));
  const secret = `private-action-effect-${process.pid}-${Date.now()}`;
  let changed = false;
  const calls: Array<{ toolName: string; input: Record<string, any> }> = [];
  const executor = createStaticBrowserToolExecutor({
    tools: [
      "mcp__claude-in-chrome__tabs_context_mcp",
      "mcp__claude-in-chrome__tabs_create_mcp",
      "mcp__claude-in-chrome__computer",
      "mcp__claude-in-chrome__get_page_text",
    ],
    onCall(toolName, input) {
      calls.push({ toolName, input });
      if (toolName.endsWith("__tabs_context_mcp")) {
        return { tabs: [{ id: `private-${secret}`, url: `https://private.example.test/${secret}` }] };
      }
      if (toolName.endsWith("__tabs_create_mcp")) return { tabId: `verification-${secret}` };
      if (toolName.endsWith("__computer")) {
        changed = true;
        return { ok: true };
      }
      if (toolName.endsWith("__get_page_text")) {
        return changed ? `Workspace updated ${secret}` : `Workspace ready ${secret}`;
      }
      return [];
    },
  });
  const input = {
    id: `action-effect-mcp-${process.pid}-${Date.now()}`,
    originalUserGoal: "Verify an action in an existing authenticated browser session changes the page.",
    acceptanceCriteria: ["Clicking Update changes the authenticated workspace."],
    requiredChecks: ["browser_e2e", "browser_auth"],
    projects: [{
      name: "action-effect-mcp",
      workDir: dir,
      targetUrl: "https://app.example.test/workspace",
      browserChecks: [{
        name: "Authenticated MCP page-text effect",
        authentication: {
          mode: "existing_session",
          provider: "claude-in-chrome",
          evidencePolicy: "minimal",
        },
        actions: [{
          type: "click",
          text: "Update",
          verifyEffect: true,
          effectSignals: ["page_text"],
          effectTimeoutMs: 500,
        }],
        assertions: [{ type: "text", text: "Workspace updated" }],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, "artifacts"),
      browserProvider: "mcp",
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
    },
  };

  try {
    const plan = buildTestAgentExecutionPlan(input as any);
    const report = await runTestAgent(input as any, {
      browserProvider: "mcp",
      browserToolExecutor: executor,
    });
    const browser = report.browserResults[0];
    const effect = browser?.actionEffects?.[0];
    const reportText = JSON.stringify(report);
    const transcriptPath = String(report.metadata.browserToolTranscriptPath || "");
    const transcriptText = fs.readFileSync(transcriptPath, "utf-8");
    const contract = validateTestAgentReportContract(report);
    const manifestPath = String((report.metadata.artifactFiles as any)?.manifestPath || "");
    const artifactVerification = verifyTestAgentArtifactManifestFile(manifestPath);
    const pass = report.status === "passed"
      && browser?.status === "passed"
      && effect?.provider === "mcp"
      && effect.status === "changed"
      && effect.requestedSignals.join(",") === "page_text"
      && effect.observedSignals.join(",") === "page_text"
      && effect.changedSignals.join(",") === "page_text"
      && effect.detailSuppressed === true
      && Object.keys(effect.before).length === 0
      && Object.keys(effect.after).length === 0
      && report.browserActionEffectSummary?.checks === 1
      && report.browserActionEffectSummary.actions === 1
      && report.browserActionEffectSummary.changed === 1
      && report.browserActionEffectSummary.detailSuppressed === 1
      && plan.summary.browserActionEffectChecks === 1
      && plan.summary.browserActionEffectActions === 1
      && !reportText.includes(secret)
      && !transcriptText.includes(secret)
      && contract.valid
      && artifactVerification.status === "passed"
      && artifactVerification.items.some(item => item.type === "browser_action_effect_evidence" && item.status === "passed");

    return {
      pass,
      report,
      plan,
      contract,
      artifactVerification,
      calls,
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

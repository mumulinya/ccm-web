import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  cancelTestAgentRunsForTask,
  purgeTestAgentRunnerRecordsForTask,
  runTestAgentCliJob,
} = require("../ccm-package/dist/modules/collaboration/test-agent-runner.js");
const {
  pruneTestAgentArtifacts,
  purgeTestAgentArtifactsForTask,
} = require("../ccm-package/dist/test-agent/artifact-retention.js");
const {
  buildTestAgentSubprocessEnv,
  isUnsafeVerificationCommand,
  redactTestAgentSensitiveText,
  validateTestAgentUrl,
  validateTestAgentWorkDir,
} = require("../ccm-package/dist/test-agent/utils.js");
const { normalizeTestAgentWorkOrder } = require("../ccm-package/dist/test-agent/work-order.js");
const { runHttpVerification } = require("../ccm-package/dist/test-agent/http-verifier.js");
const {
  installPlaywrightNetworkSafetyBoundary,
  launchChromiumWithFallback,
} = require("../ccm-package/dist/test-agent/browser/playwright-provider.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-hardening-"));
const runSuffix = `${process.pid}-${Date.now()}`;

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function handoff(name, script, options = {}) {
  const projectDir = path.join(root, name);
  fs.mkdirSync(projectDir, { recursive: true });
  write(path.join(projectDir, script.name), script.source);
  for (const [file, value] of Object.entries(options.files || {})) write(path.join(projectDir, file), value);
  return {
    id: `hardening-${name}-${runSuffix}`,
    taskId: `hardening-task-${name}-${runSuffix}`,
    groupId: "hardening-group",
    issuedBy: "group-main-agent",
    originalUserGoal: `Verify ${name}`,
    acceptanceCriteria: [`${name} verification command passes`],
    requiredChecks: ["commands"],
    completedByProjectAgents: [name],
    projects: [{
      name,
      workDir: projectDir,
      changedFiles: options.changedFiles || [],
      verificationCommands: [`node ${script.name}`],
      env: options.env || {},
    }],
    options: {
      artifactDir: path.join(projectDir, "artifacts"),
      browserProvider: "none",
      commandTimeoutMs: options.commandTimeoutMs || 15_000,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "Production hardening runner self-test uses an isolated command fixture.",
    },
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server) {
  return new Promise(resolve => server.close(() => resolve()));
}

async function runUrlBoundaryChecks(workDir) {
  const server = http.createServer((request, response) => {
    if (request.url === "/redirect-metadata") {
      response.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/redirect-probe" });
      response.end();
      return;
    }
    if (request.url === "/subresource-metadata") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end('<!doctype html><script src="http://169.254.169.254/latest/meta-data/subresource-probe"></script><p>ready</p>');
      return;
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
  });
  await listen(server);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let browser;
  try {
    const redirectWorkOrder = normalizeTestAgentWorkOrder({
      id: `hardening-url-boundary-${runSuffix}`,
      originalUserGoal: "Reject unsafe HTTP redirect targets",
      acceptanceCriteria: ["Cloud metadata redirect is blocked before the redirected request"],
      requiredChecks: ["http"],
      projects: [{
        name: "url-boundary",
        workDir,
        targetUrl: baseUrl,
        httpChecks: [{
          name: "metadata redirect boundary",
          url: `${baseUrl}/redirect-metadata`,
          assertions: [{ type: "status", status: 200 }],
        }],
      }],
      options: {
        artifactDir: path.join(workDir, "url-boundary-artifacts"),
        browserProvider: "none",
        requireAdversarialProbe: false,
        adversarialProbeWaiver: "Isolated URL boundary fault injection.",
      },
    }).workOrder;
    const httpResults = await runHttpVerification(redirectWorkOrder);
    const redirectResult = httpResults.find(result => result.name === "metadata redirect boundary");

    const playwright = require("playwright");
    browser = (await launchChromiumWithFallback(playwright, { headless: true, timeout: 10_000 })).browser;
    const browserContext = await browser.newContext();
    const blockedUrls = [];
    const page = await browserContext.newPage();
    await installPlaywrightNetworkSafetyBoundary(browserContext, page, event => blockedUrls.push(event.url));
    await page.goto(`${baseUrl}/redirect-metadata`, { waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => {});
    const playwrightRedirectTargetBlocked = blockedUrls.some(url => url.startsWith("http://169.254.169.254/"));
    blockedUrls.length = 0;
    await page.goto(`${baseUrl}/subresource-metadata`, { waitUntil: "load", timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(100);
    const playwrightSubresourceTargetBlocked = blockedUrls.some(url => url.startsWith("http://169.254.169.254/"));
    await browserContext.close();

    return {
      httpRedirectTargetRevalidated: redirectResult?.status === "blocked"
        && String(redirectResult.error || "").includes("cloud metadata endpoints are not allowed"),
      playwrightRedirectTargetBlocked,
      playwrightSubresourceTargetBlocked,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await close(server);
  }
}

async function run() {
  const normal = handoff("nonblocking", {
    name: "verify.cjs",
    source: "setTimeout(() => { console.log('verification passed'); }, 700);\n",
  });
  let timerFired = false;
  const firstPromise = runTestAgentCliJob({
    mode: "invocation",
    handoff: normal,
    taskId: normal.taskId,
    groupId: normal.groupId,
    allowedWorkDirs: [normal.projects[0].workDir],
    idempotencyKey: "same-request",
  });
  const duplicatePromise = runTestAgentCliJob({
    mode: "invocation",
    handoff: normal,
    taskId: normal.taskId,
    groupId: normal.groupId,
    allowedWorkDirs: [normal.projects[0].workDir],
    idempotencyKey: "same-request",
  });
  setTimeout(() => { timerFired = true; }, 50);
  await new Promise(resolve => setTimeout(resolve, 120));
  const eventLoopResponsive = timerFired;
  const [first, duplicate] = await Promise.all([firstPromise, duplicatePromise]);
  const reportJsonPath = first.invocation?.report?.metadata?.artifactFiles?.reportJsonPath;
  if (reportJsonPath) fs.appendFileSync(reportJsonPath, "\n", "utf8");
  const tamperedReplay = await runTestAgentCliJob({
    mode: "invocation",
    handoff: normal,
    taskId: normal.taskId,
    groupId: normal.groupId,
    allowedWorkDirs: [normal.projects[0].workDir],
    idempotencyKey: "same-request",
  });

  const cancellable = handoff("cancel", {
    name: "slow.cjs",
    source: "setTimeout(() => { console.log('should not finish'); }, 10000);\n",
  }, { commandTimeoutMs: 20_000 });
  const cancelPromise = runTestAgentCliJob({
    mode: "invocation",
    handoff: cancellable,
    taskId: cancellable.taskId,
    groupId: cancellable.groupId,
    allowedWorkDirs: [cancellable.projects[0].workDir],
    idempotencyKey: "cancel-request",
  });
  await new Promise(resolve => setTimeout(resolve, 350));
  const cancelledIds = cancelTestAgentRunsForTask(cancellable.taskId, "self-test cancellation");
  const cancelled = await cancelPromise;

  const drift = handoff("source-drift", {
    name: "drift.cjs",
    source: "require('fs').writeFileSync('marker.txt', 'changed'); console.log('changed source marker');\n",
  }, { files: { "marker.txt": "before" }, changedFiles: ["marker.txt"] });
  const drifted = await runTestAgentCliJob({
    mode: "invocation",
    handoff: drift,
    taskId: drift.taskId,
    groupId: drift.groupId,
    allowedWorkDirs: [drift.projects[0].workDir],
    idempotencyKey: "drift-request",
  });

  const purgeRace = handoff("purge-race", {
    name: "purge-race.cjs",
    source: "setTimeout(() => { console.log('should have been purged'); }, 10000);\n",
  }, { commandTimeoutMs: 20_000 });
  const purgeRacePromise = runTestAgentCliJob({
    mode: "invocation",
    handoff: purgeRace,
    taskId: purgeRace.taskId,
    groupId: purgeRace.groupId,
    allowedWorkDirs: [purgeRace.projects[0].workDir],
    idempotencyKey: "purge-race-request",
  });
  await new Promise(resolve => setTimeout(resolve, 350));
  const purgeWhileRunning = purgeTestAgentRunnerRecordsForTask(purgeRace.taskId);
  const purgedRun = await purgeRacePromise;
  await new Promise(resolve => setTimeout(resolve, 100));
  const purgeAfterClose = purgeTestAgentRunnerRecordsForTask(purgeRace.taskId);

  const urlBoundaryChecks = await runUrlBoundaryChecks(normal.projects[0].workDir);

  const retentionRoot = path.join(root, "retention");
  const oldRun = path.join(retentionRoot, "old-run");
  const taskRun = path.join(retentionRoot, "task-run");
  write(path.join(oldRun, "report.json"), JSON.stringify({ taskId: "old-task" }));
  write(path.join(taskRun, "report.json"), JSON.stringify({ taskId: "purge-me" }));
  const old = new Date(Date.now() - 10 * 24 * 60 * 60_000);
  fs.utimesSync(oldRun, old, old);
  const retention = pruneTestAgentArtifacts({ rootDir: retentionRoot, retentionDays: 2, maxRuns: 10, maxTotalBytes: 1024 * 1024, force: true });
  const taskPurge = purgeTestAgentArtifactsForTask("purge-me", { rootDir: retentionRoot });

  const restrictedEnv = buildTestAgentSubprocessEnv({ TEST_PASSWORD: "password-123" });
  const previousAllowedRoots = process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS;
  process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS = JSON.stringify([normal.projects[0].workDir]);
  const outsideRegisteredRootRejected = validateTestAgentWorkDir(cancellable.projects[0].workDir).valid === false;
  if (previousAllowedRoots === undefined) delete process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS;
  else process.env.CCM_TEST_AGENT_ALLOWED_WORK_DIRS = previousAllowedRoots;
  const productionPolicy = normalizeTestAgentWorkOrder({
    originalUserGoal: "Check production button",
    acceptanceCriteria: ["Button works"],
    projects: [{
      name: "production-web",
      workDir: normal.projects[0].workDir,
      targetUrl: "https://app.example.com",
      browserChecks: [{ name: "Click button", url: "https://app.example.com", actions: [{ type: "click", text: "Delete" }] }],
    }],
  });
  const checks = {
    eventLoopResponsive,
    invocationContractConsumed: first.invocation?.schema === "ccm-test-agent-invocation-result-v1"
      && first.invocation?.status === "completed"
      && first.invocation?.outputValidation?.valid === true
      && first.invocation?.artifactVerification?.status === "passed",
    duplicateRequestSharesRun: first.record.id === duplicate.record.id,
    cachedArtifactTamperRejected: tamperedReplay.invocation?.status === "runtime_error" && tamperedReplay.invocation?.canAccept === false,
    sourceBindingStableForReadOnlyVerification: first.record.sourceStable === true,
    cancellationStopsRunner: cancelledIds.length === 1 && cancelled.record.status === "cancelled",
    sourceDriftDetected: drifted.record.sourceStable === false,
    shellInjectionBlocked: !!isUnsafeVerificationCommand("npm test && del /s /q C:\\temp"),
    dependencyInstallBlocked: !!isUnsafeVerificationCommand("npm install left-pad"),
    metadataUrlBlocked: validateTestAgentUrl("http://169.254.169.254/latest/meta-data").valid === false,
    registeredWorkDirAccepted: validateTestAgentWorkDir(normal.projects[0].workDir).valid === true,
    outsideRegisteredRootRejected,
    productionMutationNeedsAuthorization: productionPolicy.issues.some(issue => issue.code === "production_browser_mutation_requires_authorization"),
    parentSecretsNotInherited: restrictedEnv.OPENAI_API_KEY === undefined && restrictedEnv.ANTHROPIC_API_KEY === undefined,
    explicitSecretRedacted: redactTestAgentSensitiveText("password=password-123", ["password-123"]) === "password=[REDACTED]",
    expiredArtifactsPruned: retention.removedRuns === 1 && !fs.existsSync(oldRun),
    taskArtifactsPurged: taskPurge.removed.length === 1 && !fs.existsSync(taskRun),
    runningPurgeCannotResurrectRecord: purgeWhileRunning.removedRecords === 1
      && purgedRun.record.status === "cancelled"
      && purgeAfterClose.removedRecords === 0,
    ...urlBoundaryChecks,
  };
  console.log(JSON.stringify({ pass: Object.values(checks).every(Boolean), checks }, null, 2));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;

  purgeTestAgentRunnerRecordsForTask(normal.taskId);
  purgeTestAgentRunnerRecordsForTask(cancellable.taskId);
  purgeTestAgentRunnerRecordsForTask(drift.taskId);
}

try {
  await run();
} finally {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}

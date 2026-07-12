import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import {
  validateTestAgentInvocationRequestContract,
  validateTestAgentInvocationResultContract,
} from "./contract";
import {
  invokeTestAgent,
  invokeTestAgentHandoff,
  invokeTestAgentWorkOrder,
} from "./invocation";
import { TestAgentWorkOrder } from "./types";
import { checkPlaywrightAvailability } from "./browser/playwright-provider";

function listen(server: http.Server) {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

function close(server: http.Server) {
  return new Promise<void>(resolve => server.close(() => resolve()));
}

async function closedPort() {
  const server = http.createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

function handoff(dir: string, artifactName: string, baseUrl: string, expectedText: string) {
  const criterion = `${expectedText} is visible in the browser`;
  return {
    id: `invocation-handoff-${artifactName}-${process.pid}-${Date.now()}`,
    taskId: "invocation-task",
    groupId: "invocation-group",
    issuedBy: "group-main-agent",
    originalUserGoal: "Verify the delivered web page through a real browser.",
    acceptanceCriteria: [criterion],
    requiredChecks: ["browser_e2e"],
    completedByProjectAgents: ["web-project-agent"],
    projects: [{
      name: "invocation-web",
      workDir: dir,
      targetUrl: baseUrl,
      browserChecks: [{
        name: "Invocation browser acceptance",
        url: baseUrl,
        actions: [{ type: "goto", url: baseUrl }],
        assertions: [{ type: "text", text: expectedText, timeoutMs: 1_000 }],
        coversAcceptanceCriteria: [criterion],
        screenshot: false,
      }],
    }],
    options: {
      artifactDir: path.join(dir, artifactName),
      browserProvider: "playwright",
      browserTimeoutMs: 2_000,
      collectBrowserArtifacts: false,
      collectBrowserVideo: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: "Invocation self-test targets the integration boundary.",
    },
  } as any;
}

export async function runTestAgentInvocationSelfTest() {
  const availability = await checkPlaywrightAvailability();
  if (!availability.available) return { pass: false, availability, reason: availability.reason };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-invocation-"));
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Invocation</title><main><h1>Invocation fixture ready</h1></main>");
  });
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const request = {
      schema: "ccm-test-agent-invocation-request-v1",
      source: "handoff",
      payload: handoff(dir, "passed-artifacts", baseUrl, "Invocation fixture ready"),
    };
    const requestContract = validateTestAgentInvocationRequestContract(request);
    const passed = await invokeTestAgentHandoff(request.payload, { browserProvider: "playwright" });
    const passedContract = validateTestAgentInvocationResultContract(passed);

    const failed = await invokeTestAgentHandoff(
      handoff(dir, "failed-artifacts", baseUrl, "Missing invocation text"),
      { browserProvider: "playwright" },
    );
    const failedContract = validateTestAgentInvocationResultContract(failed);

    const unavailablePort = await closedPort();
    const blockedWorkOrder: TestAgentWorkOrder = {
      schema: "ccm-test-agent-work-order-v1",
      id: `invocation-blocked-${process.pid}-${Date.now()}`,
      originalUserGoal: "Verify a web target that is currently unavailable.",
      acceptanceCriteria: ["Unavailable target should be reported as blocked"],
      requiredChecks: ["browser_e2e"],
      projects: [{
        name: "invocation-blocked",
        workDir: dir,
        targetUrl: `http://127.0.0.1:${unavailablePort}`,
        browserChecks: [{ name: "Blocked browser target", screenshot: false }],
      }],
      options: {
        artifactDir: path.join(dir, "blocked-artifacts"),
        browserProvider: "none",
        collectBrowserArtifacts: false,
        collectBrowserVideo: false,
        requireAdversarialProbe: false,
        adversarialProbeWaiver: "Invocation blocked-path fixture.",
      },
    };
    const blocked = await invokeTestAgentWorkOrder(blockedWorkOrder, { browserProvider: "none" });
    const blockedContract = validateTestAgentInvocationResultContract(blocked);

    const rejectedEnvelope = await invokeTestAgent({
      schema: "invalid-invocation-schema",
      source: "unknown",
      payload: {},
    });
    const rejectedEnvelopeContract = validateTestAgentInvocationResultContract(rejectedEnvelope);

    const rejectedPayload = await invokeTestAgent({
      schema: "ccm-test-agent-invocation-request-v1",
      source: "handoff",
      payload: {
        id: "invalid-handoff-without-projects",
        originalUserGoal: "This handoff is intentionally incomplete.",
      },
    });
    const rejectedPayloadContract = validateTestAgentInvocationResultContract(rejectedPayload);

    const pass = requestContract.valid
      && passed.status === "completed"
      && passed.outcome === "passed"
      && passed.recommendation === "accept"
      && passed.canAccept === true
      && passed.inputValidation.valid
      && passed.outputValidation?.valid === true
      && passed.report?.status === "passed"
      && passed.verdict?.canAccept === true
      && passed.artifactVerification?.status === "passed"
      && passedContract.valid
      && failed.status === "completed"
      && failed.outcome === "failed"
      && failed.canAccept === false
      && failed.outputValidation?.valid === true
      && failed.report?.status === "failed"
      && failed.verdict?.needsRework === true
      && failed.artifactVerification?.status === "passed"
      && failedContract.valid
      && blocked.status === "completed"
      && ["blocked", "partial"].includes(String(blocked.outcome))
      && blocked.canAccept === false
      && blocked.outputValidation?.valid === true
      && blocked.verdict?.needsHuman === true
      && blocked.artifactVerification?.status === "passed"
      && blockedContract.valid
      && rejectedEnvelope.status === "rejected"
      && rejectedEnvelope.source === "unknown"
      && rejectedEnvelope.canAccept === false
      && rejectedEnvelope.inputValidation.valid === false
      && !rejectedEnvelope.report
      && rejectedEnvelopeContract.valid
      && rejectedPayload.status === "rejected"
      && rejectedPayload.source === "handoff"
      && rejectedPayload.canAccept === false
      && rejectedPayload.inputValidation.valid === false
      && rejectedPayload.inputValidation.errors.length > 0
      && !rejectedPayload.report
      && rejectedPayloadContract.valid;

    return {
      pass,
      report: passed.report,
      requestContract,
      passed,
      passedContract,
      failed,
      failedContract,
      blocked,
      blockedContract,
      rejectedEnvelope,
      rejectedEnvelopeContract,
      rejectedPayload,
      rejectedPayloadContract,
    };
  } finally {
    await close(server);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

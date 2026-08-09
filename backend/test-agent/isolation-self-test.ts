import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildTestAgentReadonlyCapabilityManifest, verifyTestAgentReadonlyCapabilityManifest } from "./readonly-capabilities";
import { prepareTestAgentIsolation } from "./isolation";
import { evaluateTestAgentBrowserSideEffect, evaluateTestAgentCommandSideEffect, evaluateTestAgentHttpSideEffect } from "./side-effect-policy";

/** Local, no-provider regression checks for TestAgent hardening primitives. */
export async function runTestAgentIsolationSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-hardening-"));
  const project = path.join(root, "project");
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  const workOrder: any = {
    schema: "ccm-test-agent-work-order-v1",
    id: "hardening-self-test",
    taskId: "hardening-self-test",
    groupId: "",
    originalUserGoal: "验证只读安全门",
    acceptanceCriteria: ["只读检查可执行"],
    requiredChecks: ["commands"],
    options: { browserProvider: "none", commandTimeoutMs: 1000, maxOutputChars: 1000 },
    metadata: { riskLevel: "standard" },
    projects: [{
      name: "fixture",
      workDir: project,
      env: {},
      changedFiles: [],
      verificationCommands: ["git status", "npm install"],
      httpChecks: [{ name: "external", url: "https://example.com", method: "GET" }],
      adversarialHttpChecks: [],
      browserChecks: [{ name: "write", url: "http://localhost:3000", actions: [{ type: "click", selector: "#submit" }] }],
      adversarialBrowserChecks: [],
    }],
  };
  const commandReadonly = evaluateTestAgentCommandSideEffect("git status");
  const commandBlocked = evaluateTestAgentCommandSideEffect("npm install");
  const httpBlocked = evaluateTestAgentHttpSideEffect({ url: "https://example.com", method: "GET" });
  const browserBlocked = evaluateTestAgentBrowserSideEffect({ url: "http://localhost:3000", actions: [{ type: "click", selector: "#submit" }] });
  const manifest = buildTestAgentReadonlyCapabilityManifest({ targetName: "test-agent", workDir: project, taskText: "独立验收" });
  const manifestCheck = verifyTestAgentReadonlyCapabilityManifest(manifest.manifest);
  const session = await prepareTestAgentIsolation(workOrder, { mode: "readonly_allowlist" });
  const checks = {
    commandReadonly: commandReadonly.allowed && commandReadonly.class === "read_only",
    commandInstallBlocked: !commandBlocked.allowed && commandBlocked.class === "forbidden",
    externalHostBlocked: !httpBlocked.allowed,
    browserMutationBlocked: !browserBlocked.allowed,
    manifestValid: manifestCheck.valid && manifest.manifest.contentStored === false,
    manifestHasReadonlyMcp: manifest.manifest.mcp.every(tool => tool.readOnly && tool.mutability === "read_only"),
    isolationReceiptNo正文: session.receipt.contentStored === false && !JSON.stringify(session.receipt).includes("package scripts"),
    policyBlocksInstallInSession: !session.validateCommand(session.workOrder.projects[0], "npm install").allowed,
  };
  try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  return { pass: Object.values(checks).every(Boolean), checks, manifest: { checksum: manifest.manifest.checksum, mcpCount: manifest.manifest.mcpCount, skillCount: manifest.manifest.skillCount }, isolation: { status: session.receipt.status, mode: session.receipt.mode } };
}


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
exports.runTestAgentIsolationSelfTest = runTestAgentIsolationSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const readonly_capabilities_1 = require("./readonly-capabilities");
const isolation_1 = require("./isolation");
const side_effect_policy_1 = require("./side-effect-policy");
/** Local, no-provider regression checks for TestAgent hardening primitives. */
async function runTestAgentIsolationSelfTest() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-hardening-"));
    const project = path.join(root, "project");
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
    const workOrder = {
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
    const commandReadonly = (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)("git status");
    const commandBlocked = (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)("npm install");
    const httpBlocked = (0, side_effect_policy_1.evaluateTestAgentHttpSideEffect)({ url: "https://example.com", method: "GET" });
    const browserBlocked = (0, side_effect_policy_1.evaluateTestAgentBrowserSideEffect)({ url: "http://localhost:3000", actions: [{ type: "click", selector: "#submit" }] });
    const manifest = (0, readonly_capabilities_1.buildTestAgentReadonlyCapabilityManifest)({ targetName: "test-agent", workDir: project, taskText: "独立验收" });
    const manifestCheck = (0, readonly_capabilities_1.verifyTestAgentReadonlyCapabilityManifest)(manifest.manifest);
    const session = await (0, isolation_1.prepareTestAgentIsolation)(workOrder, { mode: "readonly_allowlist" });
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
    try {
        fs.rmSync(root, { recursive: true, force: true });
    }
    catch { }
    return { pass: Object.values(checks).every(Boolean), checks, manifest: { checksum: manifest.manifest.checksum, mcpCount: manifest.manifest.mcpCount, skillCount: manifest.manifest.skillCount }, isolation: { status: session.receipt.status, mode: session.receipt.mode } };
}
//# sourceMappingURL=isolation-self-test.js.map
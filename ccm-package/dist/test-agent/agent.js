"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestAgent = runTestAgent;
const browser_verifier_1 = require("./browser-verifier");
const registry_1 = require("./browser/registry");
const tool_executor_1 = require("./browser/tool-executor");
const artifacts_1 = require("./artifacts");
const command_planner_1 = require("./command-planner");
const command_runner_1 = require("./command-runner");
const dev_server_1 = require("./dev-server");
const http_verifier_1 = require("./http-verifier");
const result_builder_1 = require("./result-builder");
const utils_1 = require("./utils");
const work_order_1 = require("./work-order");
async function runTestAgent(input, options = {}) {
    const startedAt = (0, utils_1.nowIso)();
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(input, options);
    const planned = (0, command_planner_1.planVerificationCommands)(normalized.workOrder, normalized.issues);
    const { workOrder, issues } = planned;
    const browserToolRecorder = options.browserToolExecutor
        ? (0, tool_executor_1.createRecordingBrowserToolExecutor)(options.browserToolExecutor, workOrder.options.artifactDir)
        : null;
    if (browserToolRecorder?.transcriptPath) {
        workOrder.metadata = {
            ...workOrder.metadata,
            browserToolTranscriptPath: browserToolRecorder.transcriptPath,
        };
    }
    const runtimeOptions = browserToolRecorder
        ? { ...options, browserToolExecutor: browserToolRecorder.executor }
        : options;
    let commandResults = [];
    let devServers = [];
    let httpResults = [];
    let browserResults = [];
    let browserProviderPreflight = [];
    try {
        browserProviderPreflight = await (0, registry_1.collectBrowserProviderPreflight)(workOrder, runtimeOptions);
        workOrder.metadata = {
            ...workOrder.metadata,
            browserProviderPreflight,
        };
        commandResults = await (0, command_runner_1.runVerificationCommands)(workOrder);
        devServers = await (0, dev_server_1.startDevServersForBrowserChecks)(workOrder);
        httpResults = await (0, http_verifier_1.runHttpVerification)(workOrder);
        browserResults = await (0, browser_verifier_1.runBrowserVerification)(workOrder, runtimeOptions);
    }
    catch (error) {
        issues.push({ severity: "error", code: "test_agent_runtime_error", message: error.message || String(error) });
    }
    finally {
        for (const server of devServers) {
            try {
                server.stop();
            }
            catch { }
        }
    }
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults,
        devServerResults: devServers.map(server => server.result),
        httpResults,
        browserResults,
        browserToolCalls: browserToolRecorder?.getRecords() || [],
    });
    return (0, artifacts_1.writeTestAgentArtifacts)(report);
}
//# sourceMappingURL=agent.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTestAgentIsolationExecutionGate = applyTestAgentIsolationExecutionGate;
const hardening_metrics_1 = require("./hardening-metrics");
/** Apply the isolation policy after planning so model-added checks cannot bypass it. */
function applyTestAgentIsolationExecutionGate(workOrder, session) {
    const issues = [];
    let commandBlockedCount = 0;
    let httpBlockedCount = 0;
    let browserBlockedCount = 0;
    const addBlocked = (project, kind, name, reason) => issues.push({
        severity: "error",
        code: `test_agent_${kind}_side_effect_blocked`,
        message: `${project}: ${name} 已被 TestAgent 隔离安全门阻断：${reason}`.slice(0, 900),
    });
    const projects = workOrder.projects.map(project => {
        if (!session || session.receipt.status === "blocked") {
            const reason = session?.receipt.reason || "隔离环境未成功建立";
            project.verificationCommands.forEach(command => addBlocked(project.name, "command", command, reason));
            [...project.httpChecks, ...project.adversarialHttpChecks].forEach(check => addBlocked(project.name, "http", String(check.name || check.url || "HTTP check"), reason));
            [...project.browserChecks, ...project.adversarialBrowserChecks].forEach(check => addBlocked(project.name, "browser", String(check.name || check.url || "browser check"), reason));
            commandBlockedCount += project.verificationCommands.length;
            httpBlockedCount += project.httpChecks.length + project.adversarialHttpChecks.length;
            browserBlockedCount += project.browserChecks.length + project.adversarialBrowserChecks.length;
            return { ...project, verificationCommands: [], httpChecks: [], adversarialHttpChecks: [], browserChecks: [], adversarialBrowserChecks: [] };
        }
        const verificationCommands = project.verificationCommands.filter(command => {
            const decision = session.validateCommand(project, command);
            if (decision.allowed)
                return true;
            commandBlockedCount += 1;
            addBlocked(project.name, "command", command, decision.reason);
            return false;
        });
        const filterHttp = (checks) => checks.filter(check => {
            const decision = session.validateHttpCheck(project, check);
            if (decision.allowed)
                return true;
            httpBlockedCount += 1;
            addBlocked(project.name, "http", String(check.name || check.url || "HTTP check"), decision.reason);
            return false;
        });
        const filterBrowser = (checks) => checks.filter(check => {
            const decision = session.validateBrowserCheck(project, check);
            if (decision.allowed)
                return true;
            browserBlockedCount += 1;
            addBlocked(project.name, "browser", String(check.name || check.url || "browser check"), decision.reason);
            return false;
        });
        return {
            ...project,
            verificationCommands,
            httpChecks: filterHttp(project.httpChecks),
            adversarialHttpChecks: filterHttp(project.adversarialHttpChecks),
            browserChecks: filterBrowser(project.browserChecks),
            adversarialBrowserChecks: filterBrowser(project.adversarialBrowserChecks),
        };
    });
    const blockedCount = commandBlockedCount + httpBlockedCount + browserBlockedCount;
    if (blockedCount > 0)
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_side_effect_blocked_total", blockedCount);
    if (!session || session.receipt.status === "blocked")
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_isolation_blocked_total");
    const gate = {
        schema: "ccm-test-agent-isolation-execution-gate-v1",
        allowed: blockedCount === 0,
        blockedCount,
        commandBlockedCount,
        httpBlockedCount,
        browserBlockedCount,
        receiptChecksum: String(session?.receipt.checksum || ""),
        contentStored: false,
    };
    return {
        workOrder: {
            ...workOrder,
            projects,
            metadata: {
                ...(workOrder.metadata || {}),
                verificationHardening: {
                    ...(workOrder.metadata?.verificationHardening || {}),
                    isolationExecutionGate: gate,
                },
            },
        },
        issues,
        gate,
    };
}
//# sourceMappingURL=isolation-execution-gate.js.map
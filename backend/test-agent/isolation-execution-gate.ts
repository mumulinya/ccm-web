import type { NormalizedTestAgentWorkOrder, WorkOrderIssue } from "./types";
import type { TestAgentIsolationSession } from "./isolation";
import { recordTestAgentHardeningMetric } from "./hardening-metrics";

export type TestAgentIsolationExecutionGate = {
  schema: "ccm-test-agent-isolation-execution-gate-v1";
  allowed: boolean;
  blockedCount: number;
  commandBlockedCount: number;
  httpBlockedCount: number;
  browserBlockedCount: number;
  receiptChecksum: string;
  contentStored: false;
};

/** Apply the isolation policy after planning so model-added checks cannot bypass it. */
export function applyTestAgentIsolationExecutionGate(
  workOrder: NormalizedTestAgentWorkOrder,
  session: TestAgentIsolationSession | null,
): { workOrder: NormalizedTestAgentWorkOrder; issues: WorkOrderIssue[]; gate: TestAgentIsolationExecutionGate } {
  const issues: WorkOrderIssue[] = [];
  let commandBlockedCount = 0;
  let httpBlockedCount = 0;
  let browserBlockedCount = 0;
  const addBlocked = (project: string, kind: string, name: string, reason: string) => issues.push({
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
      if (decision.allowed) return true;
      commandBlockedCount += 1;
      addBlocked(project.name, "command", command, decision.reason);
      return false;
    });
    const filterHttp = (checks: typeof project.httpChecks) => checks.filter(check => {
      const decision = session.validateHttpCheck(project, check);
      if (decision.allowed) return true;
      httpBlockedCount += 1;
      addBlocked(project.name, "http", String(check.name || check.url || "HTTP check"), decision.reason);
      return false;
    });
    const filterBrowser = (checks: typeof project.browserChecks) => checks.filter(check => {
      const decision = session.validateBrowserCheck(project, check);
      if (decision.allowed) return true;
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
  if (blockedCount > 0) recordTestAgentHardeningMetric("test_agent_side_effect_blocked_total", blockedCount);
  if (!session || session.receipt.status === "blocked") recordTestAgentHardeningMetric("test_agent_isolation_blocked_total");
  const gate: TestAgentIsolationExecutionGate = {
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
          ...((workOrder.metadata as any)?.verificationHardening || {}),
          isolationExecutionGate: gate,
        },
      },
    },
    issues,
    gate,
  };
}

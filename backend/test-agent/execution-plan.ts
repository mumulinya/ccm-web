import { checksForProject } from "./browser/shared";
import { browserSessionParallelGroupCount, flattenBrowserSessionSteps, isBrowserSessionComparisonStep, isBrowserSessionLeafStep } from "./browser/multi-session";
import { browserCheckStabilityRuns } from "./browser/stability-summary";
import { BrowserProviderPlanWarning, buildBrowserProviderPlanWarnings } from "./browser/provider-gaps";
import {
  browserCheckAuthenticationEnvNames,
  browserCheckRequiresAuthentication,
  browserStorageStatePath,
} from "./browser/authentication";
import { browserExistingSessionConfig } from "./browser/existing-session";
import { browserActionEffectRequired, browserActionEffectSession } from "./browser/action-effects";
import { planVerificationCommands } from "./command-planner";
import { TestAgentContractIssue, TestAgentWorkOrderContractValidation } from "./contract";
import { BrowserCheckSpec, NormalizedTestAgentWorkOrder, TestAgentOptions, TestAgentWorkOrder, WorkOrderIssue } from "./types";
import { hasRequiredCheck, resolveUrl } from "./utils";
import { normalizeTestAgentWorkOrder } from "./work-order";
import { buildAdversarialEvidenceRelevance } from "./adversarial-relevance";
import { httpConcurrencySpecFor } from "./http-concurrency";
import { BrowserProviderRoutingReason, browserProviderRouteForCheck } from "./browser/provider-routing";

export interface TestAgentExecutionPlanIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
  project?: string;
}

export interface TestAgentExecutionPlan {
  schema: "ccm-test-agent-execution-plan-v1";
  valid: boolean;
  workOrderId: string;
  taskId: string;
  groupId: string;
  issuedBy: string;
  artifactDir: string;
  browserProvider: Required<TestAgentOptions>["browserProvider"];
  requiredChecks: string[];
  acceptanceCriteria: string[];
  summary: {
    projects: number;
    commands: number;
    autoDiscoveredCommands: number;
    devServers: number;
    httpChecks: number;
    adversarialHttpChecks: number;
    httpConcurrencyChecks: number;
    httpConcurrentRequests: number;
    adversarialProbeRequired: boolean;
    adversarialProbeWaived: boolean;
    adversarialProbeWaiverReason: string;
    adversarialProbeCount: number;
    adversarialLinkedProbeCount: number;
    adversarialUnlinkedProbeCount: number;
    browserChecks: number;
    autoBrowserChecks: number;
    adversarialBrowserChecks: number;
    browserPlannedPlaywrightChecks: number;
    browserPlannedMcpChecks: number;
    browserCapabilityRoutedChecks: number;
    browserExistingSessionRoutedChecks: number;
    browserSessions: number;
    browserSessionSteps: number;
    browserParallelGroups: number;
    browserSessionComparisons: number;
    browserStabilityChecks: number;
    browserStabilityRuns: number;
    browserAuthenticationChecks: number;
    browserManagedAuthenticationChecks: number;
    browserExistingSessionChecks: number;
    browserExistingSessionMinimalEvidenceChecks: number;
    browserExistingSessionFullEvidenceChecks: number;
    browserSessionRecoveryChecks: number;
    browserActionEffectChecks: number;
    browserActionEffectActions: number;
    browserCrossSessionActionEffectActions: number;
    browserExistingSessionProviders: string[];
    browserCredentialEnvBindings: number;
    browserStorageStateFiles: number;
    browserSensitiveArtifactSuppressions: number;
    browserProviderWarnings: number;
    expectedArtifactTypes: string[];
  };
  projects: Array<{
    name: string;
    workDir: string;
    changedFiles: string[];
    commands: Array<{
      command: string;
      autoDiscovered: boolean;
      reason?: string;
      script?: string;
      packageManager?: string;
    }>;
    devServer: {
      needed: boolean;
      command: string;
      startupUrl: string;
      targetUrl: string;
      timeoutMs: number;
    };
    httpChecks: Array<{
      name: string;
      method: string;
      url: string;
      assertionCount: number;
      concurrentRequests: number;
      concurrencyAssertionCount: number;
      adversarial: boolean;
      probeType?: string;
      adversarialRelevance?: "explicit" | "inferred" | "none";
      linkedAcceptanceCriteria?: string[];
      goalLinked?: boolean;
      relevanceScore?: number;
    }>;
    browserChecks: Array<{
      name: string;
      url: string;
      actionCount: number;
      actionEffectCount: number;
      crossSessionActionEffectCount: number;
      assertionCount: number;
      plannedProvider: "playwright" | "mcp" | "none";
      providerRoutingReason: BrowserProviderRoutingReason;
      sessionCount: number;
      sessionStepCount: number;
      parallelGroupCount: number;
      comparisonCount: number;
      stabilityRuns: number;
      authenticationConfigured: boolean;
      authenticationMode?: "managed" | "existing_session";
      existingSessionProvider?: string;
      existingSessionEvidencePolicy?: "minimal" | "full";
      sessionRecoveryEnabled: boolean;
      credentialEnvNames: string[];
      storageStateFileCount: number;
      sensitiveArtifactsSuppressed: boolean;
      screenshot: boolean;
      viewport?: {
        width?: number;
        height?: number;
        isMobile?: boolean;
      };
      adversarial: boolean;
      autoGenerated: boolean;
      probeType?: string;
      adversarialRelevance?: "explicit" | "inferred" | "none";
      linkedAcceptanceCriteria?: string[];
      goalLinked?: boolean;
      relevanceScore?: number;
    }>;
  }>;
  browserProviderWarnings: BrowserProviderPlanWarning[];
  issues: TestAgentExecutionPlanIssue[];
  metadata: Record<string, any>;
}

function issueKey(issue: TestAgentExecutionPlanIssue) {
  return [issue.severity, issue.code, issue.message, issue.path || "", issue.project || ""].join("\0");
}

function toPlanIssue(issue: WorkOrderIssue | TestAgentContractIssue): TestAgentExecutionPlanIssue {
  const rawIssue: any = issue;
  const issuePath = rawIssue.path;
  return {
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    ...(issuePath ? { path: issuePath } : {}),
    ...(rawIssue.project ? { project: rawIssue.project } : {}),
  };
}

function uniqueIssues(issues: TestAgentExecutionPlanIssue[]) {
  const seen = new Set<string>();
  const out: TestAgentExecutionPlanIssue[] = [];
  for (const issue of issues) {
    const key = issueKey(issue);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

function browserCheckUrl(workOrder: NormalizedTestAgentWorkOrder, projectName: string, check: BrowserCheckSpec) {
  const project = workOrder.projects.find(item => item.name === projectName);
  return resolveUrl(project?.targetUrl || "", check.url || project?.targetUrl || "");
}

function expectedArtifactTypes(
  workOrder: NormalizedTestAgentWorkOrder,
  browserChecks: Array<{
    screenshot: boolean;
    authenticationConfigured: boolean;
    minimalExistingSessionEvidence: boolean;
  }>,
) {
  const types = new Set<string>(["report_json", "report_markdown", "artifact_manifest"]);
  const detailEligibleBrowserChecks = browserChecks.filter(check => !check.minimalExistingSessionEvidence);
  if (detailEligibleBrowserChecks.length) {
    types.add("browser_snapshot");
    types.add("browser_accessibility_snapshot");
    types.add("browser_console_log");
    types.add("browser_network_log");
  }
  if (detailEligibleBrowserChecks.some(check => check.screenshot)
    || (detailEligibleBrowserChecks.length && hasRequiredCheck(workOrder.requiredChecks, /screenshot/i))) {
    types.add("screenshot");
  }
  const hasArtifactEligibleBrowserCheck = detailEligibleBrowserChecks.some(check => !check.authenticationConfigured);
  if (hasArtifactEligibleBrowserCheck && workOrder.options.collectBrowserArtifacts && workOrder.options.browserProvider !== "none") {
    types.add("browser_trace");
    types.add("browser_har");
  }
  if (hasArtifactEligibleBrowserCheck && workOrder.options.collectBrowserVideo && workOrder.options.browserProvider !== "none") {
    types.add("browser_video");
  }
  return Array.from(types).sort();
}

function devServerNeeded(workOrder: NormalizedTestAgentWorkOrder, project: NormalizedTestAgentWorkOrder["projects"][number]) {
  const browserChecks = checksForProject(project, workOrder.acceptanceCriteria);
  if (
    !project.devServerCommand
    && !project.httpChecks.length
    && !project.adversarialHttpChecks.length
    && browserChecks.length
    && browserChecks.every(check => Boolean(browserExistingSessionConfig(check)))
  ) {
    return false;
  }
  if (hasRequiredCheck(workOrder.requiredChecks, /browser|e2e|screenshot|console|http|api/i)) return true;
  return !!project.targetUrl || !!project.startupUrl || !!project.browserChecks.length || !!project.httpChecks.length || !!project.adversarialHttpChecks.length;
}

export function buildTestAgentExecutionPlan(
  input: TestAgentWorkOrder,
  overrides: Partial<TestAgentOptions> = {},
  validation?: TestAgentWorkOrderContractValidation,
): TestAgentExecutionPlan {
  const normalized = normalizeTestAgentWorkOrder(input, overrides);
  const planned = planVerificationCommands(normalized.workOrder, normalized.issues);
  const workOrder = planned.workOrder;
  const plannedByCommand = new Map(planned.plannedCommands.map(item => [`${item.project}\0${item.command}`, item]));
  const allBrowserChecksForArtifacts: Array<{
    screenshot: boolean;
    authenticationConfigured: boolean;
    minimalExistingSessionEvidence: boolean;
  }> = [];

  const projects = workOrder.projects.map(project => {
    const httpChecks = [
      ...project.httpChecks.map(check => ({ check, adversarial: false })),
      ...project.adversarialHttpChecks.map(check => ({ check, adversarial: true })),
    ].map(({ check, adversarial }) => {
      const name = check.name || "HTTP check";
      const method = String(check.method || "GET").toUpperCase();
      const url = resolveUrl(project.targetUrl, check.url);
      const probeType = check.probeType || check.probe_type;
      const concurrency = httpConcurrencySpecFor(check);
      const relevance = adversarial
        ? buildAdversarialEvidenceRelevance({
          name,
          target: `${method} ${url}`,
          probeType,
          context: check.context,
          originalUserGoal: workOrder.originalUserGoal,
          acceptanceCriteria: workOrder.acceptanceCriteria,
        })
        : undefined;
      return {
        name,
        method,
        url,
        assertionCount: (check.assertions || []).length,
        concurrentRequests: concurrency?.requests || 0,
        concurrencyAssertionCount: concurrency?.aggregateAssertions.length || 0,
        adversarial,
        ...(probeType ? { probeType } : {}),
        ...(relevance ? {
          adversarialRelevance: relevance.relevance,
          linkedAcceptanceCriteria: relevance.linkedCriteria,
          goalLinked: relevance.goalLinked,
          relevanceScore: relevance.matchScore,
        } : {}),
      };
    });

    const explicitBrowserCount = project.browserChecks.length + project.adversarialBrowserChecks.length;
    const browserChecks = checksForProject(project, workOrder.acceptanceCriteria).map(check => {
      const sessionSteps = flattenBrowserSessionSteps(check);
      const browserActions = [
        ...(check.actions || []),
        ...(check.sessions || []).flatMap(session => session.setupActions || session.setup_actions || []),
        ...sessionSteps.filter(isBrowserSessionLeafStep).map(step => step.action).filter(Boolean),
      ];
      const stabilityRuns = browserCheckStabilityRuns(check);
      const credentialEnvNames = browserCheckAuthenticationEnvNames(check);
      const storageStateFileCount = Number(Boolean(browserStorageStatePath(check)))
        + (check.sessions || []).filter(session => browserStorageStatePath(session)).length;
      const authenticationConfigured = browserCheckRequiresAuthentication(check);
      const existingSession = browserExistingSessionConfig(check);
      const minimalExistingSessionEvidence = existingSession?.evidencePolicy === "minimal";
      const sessionRecoveryEnabled = Boolean(
        existingSession
        && ["auto", "claude-in-chrome", "chrome-devtools"].includes(existingSession.provider),
      );
      const authenticationMode = existingSession
        ? "existing_session" as const
        : authenticationConfigured
          ? "managed" as const
          : undefined;
      const sensitiveArtifactsSuppressed = minimalExistingSessionEvidence
        || (!existingSession
          && authenticationConfigured
          && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo));
      const probeType = check.probeType || check.probe_type;
      const providerRoute = browserProviderRouteForCheck(workOrder, check);
      const relevance = check.adversarial === true
        ? buildAdversarialEvidenceRelevance({
          name: check.name || "Browser check",
          target: browserCheckUrl(workOrder, project.name, check),
          probeType,
          context: check.context,
          originalUserGoal: workOrder.originalUserGoal,
          acceptanceCriteria: workOrder.acceptanceCriteria,
        })
        : undefined;
      const item = {
        name: check.name || "Browser check",
        url: browserCheckUrl(workOrder, project.name, check),
        actionCount: browserActions.length,
        actionEffectCount: browserActions.filter(action => browserActionEffectRequired(action!)).length,
        crossSessionActionEffectCount: browserActions.filter(action =>
          browserActionEffectRequired(action!) && Boolean(browserActionEffectSession(action!))
        ).length,
        assertionCount: (check.assertions || []).length
          + sessionSteps.filter(isBrowserSessionLeafStep).filter(step => Boolean(step.assertion)).length
          + sessionSteps.filter(isBrowserSessionComparisonStep).length,
        plannedProvider: providerRoute.provider,
        providerRoutingReason: providerRoute.reason,
        sessionCount: (check.sessions || []).length,
        sessionStepCount: sessionSteps.length,
        parallelGroupCount: browserSessionParallelGroupCount(check),
        comparisonCount: sessionSteps.filter(isBrowserSessionComparisonStep).length,
        stabilityRuns,
        authenticationConfigured,
        ...(authenticationMode ? { authenticationMode } : {}),
        ...(existingSession ? { existingSessionProvider: existingSession.provider } : {}),
        ...(existingSession ? { existingSessionEvidencePolicy: existingSession.evidencePolicy } : {}),
        sessionRecoveryEnabled,
        credentialEnvNames,
        storageStateFileCount,
        sensitiveArtifactsSuppressed,
        screenshot: check.screenshot !== false,
        ...(check.viewport || check.viewportWidth || check.viewport_width || check.viewportHeight || check.viewport_height ? {
          viewport: {
            ...(check.viewport?.width || check.viewportWidth || check.viewport_width ? { width: check.viewport?.width || check.viewportWidth || check.viewport_width } : {}),
            ...(check.viewport?.height || check.viewportHeight || check.viewport_height ? { height: check.viewport?.height || check.viewportHeight || check.viewport_height } : {}),
            ...(check.isMobile === true || check.is_mobile === true ? { isMobile: true } : {}),
          },
        } : {}),
        adversarial: check.adversarial === true,
        autoGenerated: explicitBrowserCount === 0,
        ...(probeType ? { probeType } : {}),
        ...(relevance ? {
          adversarialRelevance: relevance.relevance,
          linkedAcceptanceCriteria: relevance.linkedCriteria,
          goalLinked: relevance.goalLinked,
          relevanceScore: relevance.matchScore,
        } : {}),
      };
      allBrowserChecksForArtifacts.push({
        screenshot: item.screenshot,
        authenticationConfigured: item.authenticationConfigured,
        minimalExistingSessionEvidence,
      });
      return item;
    });

    return {
      name: project.name,
      workDir: project.workDir,
      changedFiles: project.changedFiles,
      commands: project.verificationCommands.map(command => {
        const plannedCommand = plannedByCommand.get(`${project.name}\0${command}`);
        return {
          command,
          autoDiscovered: !!plannedCommand,
          ...(plannedCommand?.reason ? { reason: plannedCommand.reason } : {}),
          ...(plannedCommand?.script ? { script: plannedCommand.script } : {}),
          ...(plannedCommand?.packageManager ? { packageManager: plannedCommand.packageManager } : {}),
        };
      }),
      devServer: {
        needed: devServerNeeded(workOrder, project),
        command: project.devServerCommand,
        startupUrl: project.startupUrl,
        targetUrl: project.targetUrl,
        timeoutMs: project.startupTimeoutMs,
      },
      httpChecks,
      browserChecks,
    };
  });

  const adversarialProbeRequired = workOrder.options.requireAdversarialProbe
    || workOrder.requiredChecks.some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
  const adversarialProbeCount = projects.reduce(
    (sum, project) => sum
      + project.httpChecks.filter(check => check.adversarial).length
      + project.browserChecks.filter(check => check.adversarial).length,
    0,
  );
  const adversarialLinkedProbeCount = projects.reduce(
    (sum, project) => sum
      + project.httpChecks.filter(check => check.adversarial && check.adversarialRelevance !== "none").length
      + project.browserChecks.filter(check => check.adversarial && check.adversarialRelevance !== "none").length,
    0,
  );
  const adversarialUnlinkedProbeCount = adversarialProbeCount - adversarialLinkedProbeCount;
  const issues = uniqueIssues([
    ...(validation?.errors || []).map(toPlanIssue),
    ...(validation?.warnings || []).map(toPlanIssue),
    ...planned.issues.map(toPlanIssue),
    ...(adversarialProbeRequired && adversarialProbeCount === 0 ? [{
      severity: "warning" as const,
      code: "missing_adversarial_probe_plan",
      message: "The adversarial evidence gate is required, but the execution plan contains no adversarial HTTP or browser probe.",
    }] : []),
    ...(adversarialProbeRequired && adversarialProbeCount > 0 && adversarialLinkedProbeCount === 0 ? [{
      severity: "warning" as const,
      code: "unlinked_adversarial_probe_plan",
      message: "The execution plan contains adversarial probes, but none are linked to the original goal or an acceptance criterion.",
    }] : []),
  ]);
  const expectedArtifacts = expectedArtifactTypes(workOrder, allBrowserChecksForArtifacts);
  const browserProviderWarnings = buildBrowserProviderPlanWarnings(workOrder);
  return {
    schema: "ccm-test-agent-execution-plan-v1",
    valid: issues.every(issue => issue.severity !== "error"),
    workOrderId: workOrder.id,
    taskId: workOrder.taskId,
    groupId: workOrder.groupId,
    issuedBy: workOrder.issuedBy,
    artifactDir: workOrder.options.artifactDir,
    browserProvider: workOrder.options.browserProvider,
    requiredChecks: workOrder.requiredChecks,
    acceptanceCriteria: workOrder.acceptanceCriteria,
    summary: {
      projects: projects.length,
      commands: projects.reduce((sum, project) => sum + project.commands.length, 0),
      autoDiscoveredCommands: planned.plannedCommands.length,
      devServers: projects.filter(project => project.devServer.needed).length,
      httpChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => !check.adversarial).length, 0),
      adversarialHttpChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => check.adversarial).length, 0),
      httpConcurrencyChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => check.concurrentRequests > 0).length, 0),
      httpConcurrentRequests: projects.reduce((sum, project) => sum + project.httpChecks.reduce((projectSum, check) => projectSum + check.concurrentRequests, 0), 0),
      adversarialProbeRequired,
      adversarialProbeWaived: !adversarialProbeRequired && Boolean(workOrder.options.adversarialProbeWaiver),
      adversarialProbeWaiverReason: adversarialProbeRequired ? "" : workOrder.options.adversarialProbeWaiver,
      adversarialProbeCount,
      adversarialLinkedProbeCount,
      adversarialUnlinkedProbeCount,
      browserChecks: projects.reduce((sum, project) => sum + project.browserChecks.length, 0),
      autoBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.autoGenerated).length, 0),
      adversarialBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.adversarial).length, 0),
      browserPlannedPlaywrightChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.plannedProvider === "playwright").length, 0),
      browserPlannedMcpChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.plannedProvider === "mcp").length, 0),
      browserCapabilityRoutedChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.providerRoutingReason === "capability_requires_playwright").length, 0),
      browserExistingSessionRoutedChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.providerRoutingReason === "existing_authenticated_session").length, 0),
      browserSessions: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.sessionCount, 0), 0),
      browserSessionSteps: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.sessionStepCount, 0), 0),
      browserParallelGroups: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.parallelGroupCount, 0), 0),
      browserSessionComparisons: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.comparisonCount, 0), 0),
      browserStabilityChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.stabilityRuns > 1).length, 0),
      browserStabilityRuns: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.stabilityRuns, 0), 0),
      browserAuthenticationChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationConfigured).length, 0),
      browserManagedAuthenticationChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationMode === "managed").length, 0),
      browserExistingSessionChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationMode === "existing_session").length, 0),
      browserExistingSessionMinimalEvidenceChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.existingSessionEvidencePolicy === "minimal").length, 0),
      browserExistingSessionFullEvidenceChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.existingSessionEvidencePolicy === "full").length, 0),
      browserSessionRecoveryChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.sessionRecoveryEnabled).length, 0),
      browserActionEffectChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.actionEffectCount > 0).length, 0),
      browserActionEffectActions: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.actionEffectCount, 0), 0),
      browserCrossSessionActionEffectActions: projects.reduce((sum, project) =>
        sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.crossSessionActionEffectCount, 0)
      , 0),
      browserExistingSessionProviders: Array.from(new Set(
        projects.flatMap(project => project.browserChecks.map(check => check.existingSessionProvider || "").filter(Boolean))
      )).sort(),
      browserCredentialEnvBindings: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.credentialEnvNames.length, 0), 0),
      browserStorageStateFiles: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.storageStateFileCount, 0), 0),
      browserSensitiveArtifactSuppressions: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.sensitiveArtifactsSuppressed).length, 0),
      browserProviderWarnings: browserProviderWarnings.length,
      expectedArtifactTypes: expectedArtifacts,
    },
    projects,
    browserProviderWarnings,
    issues,
    metadata: {
      plannedCommands: planned.plannedCommands,
      normalizedWorkOrder: workOrder,
    },
  };
}

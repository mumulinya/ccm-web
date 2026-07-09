import {
  BrowserCheckSpec,
  BrowserProbeTemplateSpec,
  HttpCheckSpec,
  TestAgentOptions,
  TestAgentProjectTarget,
  TestAgentRequiredCheck,
  TestAgentWorkOrder,
} from "./types";
import { asArray, makeRunId } from "./utils";

export interface TestAgentHandoffProject {
  name?: string;
  workDir?: string;
  work_dir?: string;
  runCommand?: string;
  run_command?: string;
  devServerCommand?: string;
  dev_server_command?: string;
  targetUrl?: string;
  target_url?: string;
  startupUrl?: string;
  startup_url?: string;
  startupTimeoutMs?: number;
  startup_timeout_ms?: number;
  env?: Record<string, string | number | boolean | undefined>;
  changedFiles?: string[];
  changed_files?: string[];
  completedTasks?: string[];
  completed_tasks?: string[];
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  requiredChecks?: TestAgentRequiredCheck[];
  required_checks?: TestAgentRequiredCheck[];
  verificationCommands?: string[];
  verification_commands?: string[];
  httpChecks?: HttpCheckSpec[];
  http_checks?: HttpCheckSpec[];
  apiChecks?: HttpCheckSpec[];
  api_checks?: HttpCheckSpec[];
  adversarialHttpChecks?: HttpCheckSpec[];
  adversarial_http_checks?: HttpCheckSpec[];
  adversarialApiChecks?: HttpCheckSpec[];
  adversarial_api_checks?: HttpCheckSpec[];
  browserChecks?: BrowserCheckSpec[];
  browser_checks?: BrowserCheckSpec[];
  adversarialBrowserChecks?: BrowserCheckSpec[];
  adversarial_browser_checks?: BrowserCheckSpec[];
  adversarialBrowserProbeTemplates?: BrowserProbeTemplateSpec[];
  adversarial_browser_probe_templates?: BrowserProbeTemplateSpec[];
  agentSummary?: string;
  agent_summary?: string;
  risks?: string[];
}

export interface TestAgentHandoff {
  id?: string;
  taskId?: string;
  task_id?: string;
  groupId?: string;
  group_id?: string;
  issuedBy?: string;
  issued_by?: string;
  originalUserGoal?: string;
  original_user_goal?: string;
  acceptanceCriteria?: string[];
  acceptance_criteria?: string[];
  completedTasks?: string[];
  completed_tasks?: string[];
  requiredChecks?: TestAgentRequiredCheck[];
  required_checks?: TestAgentRequiredCheck[];
  projects?: TestAgentHandoffProject[];
  project?: TestAgentHandoffProject;
  options?: TestAgentOptions;
  metadata?: Record<string, any>;
  completedByProjectAgents?: string[];
  completed_by_project_agents?: string[];
}

export interface TestAgentBuiltWorkOrder {
  workOrder: TestAgentWorkOrder;
  warnings: string[];
}

function text(value: any) {
  return String(value || "").trim();
}

function uniqueStrings(values: any[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const item = text(value);
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function projectName(project: TestAgentHandoffProject, index: number) {
  return text(project.name) || `project-${index + 1}`;
}

function completedTaskCriteria(tasks: any[]) {
  return uniqueStrings(tasks).map(task => `Completed task is independently verified: ${task}`);
}

function inferRequiredChecks(projects: TestAgentProjectTarget[], options: TestAgentOptions | undefined) {
  const checks: string[] = [];
  const add = (check: string) => checks.push(check);
  for (const project of projects) {
    if (asArray(project.verificationCommands || project.verification_commands).length) add("commands");
    if (project.targetUrl || project.target_url || project.startupUrl || project.startup_url || asArray((project as any).httpChecks || (project as any).http_checks || (project as any).apiChecks || (project as any).api_checks).length) add("http");
    const hasBrowserSurface = !!(project.targetUrl || project.target_url)
      || asArray(project.browserChecks || project.browser_checks).length > 0
      || asArray(project.adversarialBrowserChecks || project.adversarial_browser_checks).length > 0
      || asArray((project as any).adversarialBrowserProbeTemplates || (project as any).adversarial_browser_probe_templates).length > 0;
    if (hasBrowserSurface) {
      add("browser_e2e");
      add("screenshots");
      add("console_errors");
      add("browser_snapshots");
      add("browser_accessibility_snapshot");
      add("browser_console_logs");
      add("browser_network_logs");
      if (options?.collectBrowserArtifacts !== false && options?.browserProvider !== "none") {
        add("browser_trace");
        add("browser_har");
      }
    }
    if (asArray((project as any).adversarialHttpChecks || (project as any).adversarial_http_checks || (project as any).adversarialApiChecks || (project as any).adversarial_api_checks).length
      || asArray(project.adversarialBrowserChecks || project.adversarial_browser_checks).length
      || asArray((project as any).adversarialBrowserProbeTemplates || (project as any).adversarial_browser_probe_templates).length) {
      add("adversarial");
    }
  }
  return uniqueStrings(checks);
}

function buildProject(project: TestAgentHandoffProject, index: number, warnings: string[]): TestAgentProjectTarget {
  const name = projectName(project, index);
  const workDir = text(project.workDir || project.work_dir);
  if (!workDir) warnings.push(`Project "${name}" is missing workDir; TestAgent validation will reject the work order until a workDir is supplied.`);
  const completedTasks = uniqueStrings(asArray(project.completedTasks || project.completed_tasks));
  const acceptanceCriteria = uniqueStrings(asArray(project.acceptanceCriteria || project.acceptance_criteria));
  const agentSummaryParts = [
    text(project.agentSummary || project.agent_summary),
    completedTasks.length ? `Completed tasks: ${completedTasks.join("; ")}` : "",
    acceptanceCriteria.length ? `Project acceptance criteria: ${acceptanceCriteria.join("; ")}` : "",
  ].filter(Boolean);
  return {
    name,
    workDir,
    runCommand: text(project.runCommand || project.run_command),
    devServerCommand: text(project.devServerCommand || project.dev_server_command),
    targetUrl: text(project.targetUrl || project.target_url),
    startupUrl: text(project.startupUrl || project.startup_url),
    startupTimeoutMs: project.startupTimeoutMs || project.startup_timeout_ms,
    env: project.env,
    changedFiles: uniqueStrings(asArray(project.changedFiles || project.changed_files)),
    verificationCommands: uniqueStrings(asArray(project.verificationCommands || project.verification_commands)),
    httpChecks: asArray(project.httpChecks || project.http_checks || project.apiChecks || project.api_checks) as HttpCheckSpec[],
    adversarialHttpChecks: asArray(project.adversarialHttpChecks || project.adversarial_http_checks || project.adversarialApiChecks || project.adversarial_api_checks) as HttpCheckSpec[],
    browserChecks: asArray(project.browserChecks || project.browser_checks) as BrowserCheckSpec[],
    adversarialBrowserChecks: asArray(project.adversarialBrowserChecks || project.adversarial_browser_checks) as BrowserCheckSpec[],
    adversarialBrowserProbeTemplates: asArray(project.adversarialBrowserProbeTemplates || project.adversarial_browser_probe_templates) as BrowserProbeTemplateSpec[],
    agentSummary: agentSummaryParts.join("\n"),
    risks: uniqueStrings(asArray(project.risks)),
  };
}

export function buildTestAgentWorkOrderFromHandoff(input: TestAgentHandoff): TestAgentBuiltWorkOrder {
  const warnings: string[] = [];
  const rawProjects = [
    ...asArray(input.projects),
    ...(input.project ? [input.project] : []),
  ] as TestAgentHandoffProject[];
  if (!rawProjects.length) warnings.push("No project targets were supplied; TestAgent validation requires at least one project.");
  const projects = rawProjects.map((project, index) => buildProject(project, index, warnings));
  const globalCompletedTasks = uniqueStrings(asArray(input.completedTasks || input.completed_tasks));
  const projectCompletedTasks = rawProjects.flatMap(project => asArray(project.completedTasks || project.completed_tasks));
  const acceptanceCriteria = uniqueStrings([
    ...asArray(input.acceptanceCriteria || input.acceptance_criteria),
    ...rawProjects.flatMap(project => asArray(project.acceptanceCriteria || project.acceptance_criteria)),
    ...completedTaskCriteria([...globalCompletedTasks, ...projectCompletedTasks]),
  ]);
  if (!acceptanceCriteria.length) warnings.push("No acceptance criteria or completed tasks were supplied; coverage will be weaker.");
  const explicitRequiredChecks = uniqueStrings([
    ...asArray(input.requiredChecks || input.required_checks),
    ...rawProjects.flatMap(project => asArray(project.requiredChecks || project.required_checks)),
  ]);
  const options: TestAgentOptions = {
    verificationOnly: true,
    browserProvider: "auto",
    autoDiscoverVerificationCommands: true,
    collectBrowserArtifacts: true,
    ...(input.options || {}),
  };
  const inferredRequiredChecks = inferRequiredChecks(projects, options);
  const workOrder: TestAgentWorkOrder = {
    schema: "ccm-test-agent-work-order-v1",
    id: text(input.id) || makeRunId("test-agent-handoff"),
    taskId: text(input.taskId || input.task_id),
    groupId: text(input.groupId || input.group_id),
    issuedBy: text(input.issuedBy || input.issued_by || "group-main-agent"),
    originalUserGoal: text(input.originalUserGoal || input.original_user_goal),
    acceptanceCriteria,
    requiredChecks: uniqueStrings([...explicitRequiredChecks, ...inferredRequiredChecks]),
    projects,
    options,
    metadata: {
      ...(input.metadata || {}),
      handoffSource: text(input.metadata?.handoffSource) || "test-agent-handoff-builder",
      completedByProjectAgents: uniqueStrings(asArray(input.completedByProjectAgents || input.completed_by_project_agents)),
      ...(warnings.length ? { handoffWarnings: warnings.slice() } : {}),
    },
  };
  return { workOrder, warnings };
}

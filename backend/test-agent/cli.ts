import * as fs from "fs";
import { runTestAgent } from "./agent";
import { TestAgentArtifactVerification, verifyTestAgentArtifactManifest } from "./artifact-verifier";
import { cliOverrides, parseTestAgentCliArgs, testAgentCliUsage } from "./cli-options";
import { TestAgentContractIssue, TestAgentWorkOrderContractValidation, validateTestAgentWorkOrderContract } from "./contract";
import { TestAgentArtifactManifest, TestAgentReport, TestAgentRuntimeOptions, TestAgentWorkOrder } from "./types";
import { buildTestAgentWorkOrderFromHandoff, TestAgentHandoff } from "./work-order-builder";

interface TestAgentCliWriter {
  write(message: string): unknown;
}

export interface TestAgentCliIo {
  stdout?: TestAgentCliWriter;
  stderr?: TestAgentCliWriter;
  readFile?: (file: string) => string;
  runAgent?: (input: TestAgentWorkOrder, options: TestAgentRuntimeOptions) => Promise<TestAgentReport>;
}

interface ParsedJsonFile {
  input: any;
  error: string;
  ok: boolean;
}

function exitCodeForReport(report: TestAgentReport) {
  if (report.status === "passed") return 0;
  if (report.status === "failed") return 1;
  return 2;
}

function statusCounts(items: Array<{ status: string }>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.status, (counts.get(item.status) || 0) + 1);
  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}:${count}`)
    .join(", ") || "none";
}

function formatIssues(label: string, issues: Array<{ code: string; message: string; path?: string; project?: string }>, limit = 5) {
  if (!issues.length) return [`${label}: 0`];
  const lines = [`${label}: ${issues.length}`];
  for (const issue of issues.slice(0, limit)) {
    const location = issue.path || issue.project || "";
    lines.push(`- ${issue.code}${location ? ` (${location})` : ""}: ${issue.message}`);
  }
  if (issues.length > limit) lines.push(`- ... ${issues.length - limit} more`);
  return lines;
}

export function formatTestAgentCliValidationSummary(validation: TestAgentWorkOrderContractValidation) {
  const lines = [
    `TestAgent work order: ${validation.valid ? "valid" : "invalid"}`,
    ...formatIssues("Errors", validation.errors),
    ...formatIssues("Warnings", validation.warnings),
  ];
  if (validation.normalized) {
    lines.push(`Work order: ${validation.normalized.id}`);
    lines.push(`Projects: ${validation.normalized.projects.map(project => project.name).join(", ") || "none"}`);
    lines.push(`Browser provider: ${validation.normalized.options.browserProvider}`);
    lines.push(`Artifact dir: ${validation.normalized.options.artifactDir}`);
  }
  return `${lines.join("\n")}\n`;
}

export function formatTestAgentCliReportSummary(report: TestAgentReport) {
  const coverage = report.requiredCheckCoverage.map(item => `${item.check}:${item.status}`).join(", ") || "none";
  const acceptance = statusCounts(report.acceptanceCoverage);
  const lines = [
    `TestAgent report: ${report.status} (${report.recommendation})`,
    `Summary: ${report.summary}`,
    `Work order: ${report.workOrderId}`,
    `Commands: ${statusCounts(report.commandResults)}`,
    `HTTP checks: ${statusCounts(report.httpResults)}`,
    `Browser checks: ${statusCounts(report.browserResults)}`,
    `Required checks: ${coverage}`,
    `Acceptance coverage: ${acceptance}`,
    `Artifacts: ${report.artifactDir}`,
  ];
  if (report.risks.length) lines.push(`Risks: ${report.risks.slice(0, 5).join("; ")}`);
  if (report.blockedReasons.length) lines.push(`Blocked: ${report.blockedReasons.slice(0, 5).join("; ")}`);
  if (report.issues.length) lines.push(...formatIssues("Issues", report.issues));
  return `${lines.join("\n")}\n`;
}

export function formatTestAgentCliArtifactVerificationSummary(verification: TestAgentArtifactVerification) {
  const lines = [
    `TestAgent artifact verification: ${verification.status}`,
    `Manifest: ${verification.manifestPath || "(inline)"}`,
    `Files: total=${verification.summary.total}, passed=${verification.summary.passed}, failed=${verification.summary.failed}, skipped=${verification.summary.skipped}`,
  ];
  for (const item of verification.items.filter(item => item.status === "failed").slice(0, 8)) {
    lines.push(`- ${item.type} ${item.path}: ${item.error || "failed"}`);
  }
  return `${lines.join("\n")}\n`;
}

function parseWorkOrderJson(file: string, readFile: (file: string) => string, label = "work order"): ParsedJsonFile {
  let text = "";
  try {
    text = readFile(file);
  } catch (error: any) {
    return {
      input: null,
      error: `Unable to read ${label} file "${file}": ${error?.message || String(error)}`,
      ok: false,
    };
  }
  try {
    return { input: JSON.parse(text), error: "", ok: true };
  } catch (error: any) {
    return {
      input: null,
      error: `Invalid JSON in ${label} file "${file}": ${error?.message || String(error)}`,
      ok: false,
    };
  }
}

function isJsonObject(input: any) {
  return !!input && typeof input === "object" && !Array.isArray(input);
}

function invalidJsonRootMessage(label: string, file: string) {
  return `Invalid ${label} file "${file}": root value must be a JSON object.`;
}

function handoffWarningIssues(warnings: string[]): TestAgentContractIssue[] {
  return warnings.map(message => ({
    severity: "warning",
    code: "handoff_builder_warning",
    message,
  }));
}

function withAdditionalWarnings(validation: TestAgentWorkOrderContractValidation, warnings: TestAgentContractIssue[]) {
  if (!warnings.length) return validation;
  return {
    ...validation,
    warnings: [...warnings, ...validation.warnings],
  };
}

export async function runTestAgentCli(args = process.argv.slice(2), io: TestAgentCliIo = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const readFile = io.readFile || ((file: string) => fs.readFileSync(file, "utf-8"));
  const runAgent = io.runAgent || runTestAgent;
  const parsed = parseTestAgentCliArgs(args);
  const { options, errors } = parsed;

  if (options.help) {
    stdout.write(`${testAgentCliUsage()}\n`);
    return { exitCode: 0 };
  }

  if (errors.length) {
    stderr.write(`${testAgentCliUsage()}\n\n${errors.map(error => `Error: ${error}`).join("\n")}\n`);
    return { exitCode: 2 };
  }

  if (options.verifyArtifactsPath) {
    const manifestJson = parseWorkOrderJson(options.verifyArtifactsPath, readFile, "artifact manifest");
    if (!manifestJson.ok) {
      stderr.write(`${manifestJson.error}\n`);
      return { exitCode: 2 };
    }
    if (!isJsonObject(manifestJson.input)) {
      stderr.write(`${invalidJsonRootMessage("artifact manifest", options.verifyArtifactsPath)}\n`);
      return { exitCode: 2 };
    }
    const manifest = manifestJson.input as TestAgentArtifactManifest;
    if (manifest?.schema !== "ccm-test-agent-artifact-manifest-v1" || !Array.isArray(manifest.files)) {
      stderr.write(`Invalid TestAgent artifact manifest: ${options.verifyArtifactsPath}\n`);
      return { exitCode: 2 };
    }
    const verification = verifyTestAgentArtifactManifest(manifest, options.verifyArtifactsPath);
    stdout.write(options.summary
      ? formatTestAgentCliArtifactVerificationSummary(verification)
      : `${JSON.stringify(verification, null, 2)}\n`);
    return { exitCode: verification.status === "passed" ? 0 : 1 };
  }

  const workOrderJson = parseWorkOrderJson(options.handoffPath || options.workOrderPath, readFile, options.handoffPath ? "handoff" : "work order");
  if (!workOrderJson.ok) {
    stderr.write(`${workOrderJson.error}\n`);
    return { exitCode: 2 };
  }
  const inputLabel = options.handoffPath ? "handoff" : "work order";
  const inputPath = options.handoffPath || options.workOrderPath;
  if (!isJsonObject(workOrderJson.input)) {
    stderr.write(`${invalidJsonRootMessage(inputLabel, inputPath)}\n`);
    return { exitCode: 2 };
  }

  const overrides = cliOverrides(options);
  let additionalWarnings: TestAgentContractIssue[] = [];
  let workOrderInput: TestAgentWorkOrder;
  if (options.handoffPath) {
    const built = buildTestAgentWorkOrderFromHandoff(workOrderJson.input as TestAgentHandoff);
    workOrderInput = built.workOrder;
    additionalWarnings = handoffWarningIssues(built.warnings);
  } else {
    workOrderInput = workOrderJson.input as TestAgentWorkOrder;
  }
  const validation = withAdditionalWarnings(validateTestAgentWorkOrderContract(workOrderInput, overrides), additionalWarnings);
  if (options.validateOnly || !validation.valid) {
    stdout.write(options.summary
      ? formatTestAgentCliValidationSummary(validation)
      : `${JSON.stringify(validation, null, 2)}\n`);
    return { exitCode: validation.valid ? 0 : 2 };
  }

  const report = await runAgent(workOrderInput, overrides);
  stdout.write(options.summary
    ? formatTestAgentCliReportSummary(report)
    : `${JSON.stringify(report, null, 2)}\n`);
  return { exitCode: exitCodeForReport(report) };
}

async function main() {
  const result = await runTestAgentCli();
  process.exit(result.exitCode);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(2);
  });
}

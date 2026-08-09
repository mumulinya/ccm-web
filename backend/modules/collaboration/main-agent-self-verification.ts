import * as crypto from "crypto";
import { spawn, spawnSync } from "child_process";
import {
  buildTestAgentSubprocessEnv,
  redactTestAgentSensitiveText,
  verificationCommandInvocation,
} from "../../test-agent/utils";
import { runSemanticDecision } from "../../system/semantic-decision-runtime";
import type { TaskAcceptancePolicySnapshot } from "./task-acceptance-policy";

type VerificationProject = {
  name: string;
  workDir: string;
  verificationCommands: string[];
  env?: Record<string, string>;
};

type VerificationResult = {
  id: string;
  project: string;
  command: string;
  status: "passed" | "failed" | "blocked" | "timed_out";
  exit_code: number | null;
  duration_ms: number;
  output: string;
  error: string;
};

export type MainAgentSelfVerificationReceiptV1 = {
  schema: "ccm-main-agent-self-verification-receipt-v1";
  version: 1;
  task_id: string;
  scope: "group" | "project";
  scope_id: string;
  exact_session_id: string;
  acceptance_policy_checksum: string;
  mode: "main_agent_self_verification";
  round: 1;
  model_status: "confirmed" | "failed";
  semantic_decision_receipt: any;
  source_snapshot_checksum: string;
  changed_files: any[];
  verification_results: VerificationResult[];
  criterion_coverage: any[];
  deterministic_gate: {
    pass: boolean;
    checks: Array<{ id: string; pass: boolean; detail: string }>;
  };
  canAccept: boolean;
  status: "main_agent_self_verified" | "main_agent_self_verification_failed";
  report: { summary: string; verification: string[]; risks: string[]; blockers: string[] };
  verdict: { accepted: boolean; gaps: string[]; evidence: string[]; nextActions: string[] };
  decision: { route: "complete" | "needs_user"; reason: string };
  completed_at: string;
  checksum: string;
};

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function cleanList(value: any, max = 40, itemMax = 800) {
  return [...new Set((Array.isArray(value) ? value : []).map(item => String(item || "").trim().slice(0, itemMax)).filter(Boolean))].slice(0, max);
}

async function runCommand(project: VerificationProject, command: string, index: number, timeoutMs: number): Promise<VerificationResult> {
  const id = `command:${project.name}:${index + 1}`;
  const invocation = verificationCommandInvocation(command);
  if (invocation.error) {
    return { id, project: project.name, command, status: "blocked", exit_code: null, duration_ms: 0, output: "", error: invocation.error };
  }
  const started = Date.now();
  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawn(invocation.executable, invocation.args, {
      cwd: project.workDir,
      shell: invocation.requiresShell,
      windowsHide: true,
      env: buildTestAgentSubprocessEnv(project.env || {}),
    });
    const finish = (status: VerificationResult["status"], exitCode: number | null, error = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const secrets = Object.values(project.env || {});
      resolve({
        id,
        project: project.name,
        command,
        status,
        exit_code: exitCode,
        duration_ms: Date.now() - started,
        output: redactTestAgentSensitiveText(`${stdout}\n${stderr}`.trim(), secrets).slice(0, 1600),
        error: redactTestAgentSensitiveText(error, secrets).slice(0, 600),
      });
    };
    const timer = setTimeout(() => {
      if (process.platform === "win32" && child.pid) {
        try { spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" }); } catch {}
      } else {
        try { child.kill("SIGTERM"); } catch {}
      }
      finish("timed_out", null, `验证命令超过 ${timeoutMs}ms`);
    }, timeoutMs);
    timer.unref?.();
    child.stdout?.on("data", chunk => { stdout = (stdout + String(chunk)).slice(-12_000); });
    child.stderr?.on("data", chunk => { stderr = (stderr + String(chunk)).slice(-12_000); });
    child.on("error", error => finish("failed", null, error.message));
    child.on("close", code => finish(code === 0 ? "passed" : "failed", code, code === 0 ? "" : `验证命令退出码 ${code}`));
  });
}

async function runConfiguredVerification(projects: VerificationProject[], timeoutMs: number) {
  const results: VerificationResult[] = [];
  for (const project of projects.slice(0, 8)) {
    const commands = cleanList(project.verificationCommands, 8, 300);
    for (let index = 0; index < commands.length; index += 1) {
      results.push(await runCommand(project, commands[index], index, timeoutMs));
    }
  }
  return results;
}

function normalizeCoverage(value: any, criteria: string[], evidenceIds: Set<string>) {
  const rows = Array.isArray(value) ? value : [];
  return criteria.map(criterion => {
    const row = rows.find(item => String(item?.criterion || "").trim() === criterion) || {};
    const requestedIds = cleanList(row.evidence_ids || row.evidenceIds, 20, 200);
    const validIds = requestedIds.filter(id => evidenceIds.has(id));
    const claimed = String(row.status || "").trim();
    const verified = claimed === "verified" && validIds.length > 0 && validIds.length === requestedIds.length;
    return {
      criterion,
      status: verified ? "verified" : claimed === "needs_user" ? "needs_user" : "unverified",
      evidence_ids: validIds,
      reason: String(row.reason || (verified ? "已有真实证据" : "缺少绑定到真实执行结果的证据")).trim().slice(0, 700),
    };
  });
}

export async function runMainAgentSelfVerification(input: {
  task: any;
  policy: TaskAcceptancePolicySnapshot;
  acceptanceCriteria?: string[];
  changedFiles?: any[];
  projects?: VerificationProject[];
  workerOutputs?: string[];
  sourceSnapshotChecksum?: string;
  commandTimeoutMs?: number;
  semanticModelCall?: (request: { config: any; messages: any[]; maxTokens: number }) => Promise<any>;
  semanticConfig?: any;
}): Promise<MainAgentSelfVerificationReceiptV1> {
  if (input.policy.mode !== "main_agent_self_verification" || input.policy.test_agent_enabled) {
    throw new Error("主 Agent 自验拒绝使用非自验模式的策略快照");
  }
  const task = input.task || {};
  const criteria = cleanList(input.acceptanceCriteria?.length ? input.acceptanceCriteria : String(task.acceptance_criteria || "").split(/\r?\n|；/), 30, 900);
  if (!criteria.length) criteria.push(String(task.business_goal || task.description || task.title || "完成任务").trim().slice(0, 900));
  const changedFiles = (Array.isArray(input.changedFiles) ? input.changedFiles : []).map(item => ({
    path: String(item?.path || item?.file || item || "").trim(),
    project: String(item?.project || item?.projectName || task.target_project || "").trim(),
    status: String(item?.status_kind || item?.status || "modified").trim(),
  })).filter(item => item.path).slice(0, 200);
  const projects = (input.projects || []).filter(project => project?.name && project?.workDir);
  const verificationResults = await runConfiguredVerification(projects, Math.max(10_000, Math.min(300_000, Number(input.commandTimeoutMs || 120_000))));
  const evidenceIds = new Set<string>([
    ...changedFiles.map(item => `file:${item.project}:${item.path}`),
    ...verificationResults.filter(item => item.status === "passed").map(item => item.id),
  ]);
  const requiresChanges = task.requires_code_changes === true || task.requiresCodeChanges === true;
  const requiresVerification = task.requires_verification !== false && (task.requires_verification === true || task.requiresVerification === true || requiresChanges);
  const checks = [
    { id: "policy", pass: input.policy.mode === "main_agent_self_verification", detail: "任务已绑定主 Agent 自验策略" },
    { id: "source_changes", pass: !requiresChanges || changedFiles.length > 0, detail: changedFiles.length ? `${changedFiles.length} 个系统捕获文件变更` : "未捕获文件变更" },
    { id: "verification_configured", pass: !requiresVerification || projects.some(project => project.verificationCommands?.length), detail: verificationResults.length ? `${verificationResults.length} 个验证命令已执行` : "没有可执行的项目验证命令" },
    { id: "verification_passed", pass: !requiresVerification || (verificationResults.length > 0 && verificationResults.every(item => item.status === "passed")), detail: verificationResults.every(item => item.status === "passed") ? "所有验证命令通过" : "存在失败、阻塞或超时验证" },
  ];
  let semanticReceipt: any = null;
  let semanticValue: any = null;
  let modelError = "";
  try {
    const decision = await runSemanticDecision({
      kind: "main_agent_self_verification",
      identity: {
        scope: input.policy.scope,
        scopeId: input.policy.scope_id || String(task.target_project || task.group_id || task.id),
        sessionId: input.policy.exact_session_id || String(task.id),
        taskId: String(task.id || input.policy.task_id),
      },
      system: `你是当前任务的主 Agent，TestAgent 已关闭。你只能分析服务端提供的真实证据，不得编造命令、文件或通过结论。为每条验收标准返回一条覆盖记录；只有 evidence_ids 中提供的ID可以引用。返回 JSON：{"summary":"自验说明","criterion_coverage":[{"criterion":"原标准","status":"verified|unverified|needs_user","evidence_ids":["真实ID"],"reason":"依据"}],"risks":[],"gaps":[],"confidence":0.0}。不要返回 accepted 字段。`,
      input: {
        goal: task.business_goal || task.description || task.title,
        source_snapshot_checksum: String(input.sourceSnapshotChecksum || checksum(changedFiles)),
        acceptance_criteria: criteria,
        deterministic_checks: checks,
        evidence: {
          changed_files: changedFiles.map(item => ({ id: `file:${item.project}:${item.path}`, ...item })),
          verification_results: verificationResults.map(item => ({ ...item, output: item.output.slice(0, 800) })),
        },
        worker_output_previews: cleanList(input.workerOutputs, 12, 1200),
      },
      validate: value => {
        if (!value || typeof value !== "object" || !Array.isArray(value.criterion_coverage || value.criterionCoverage)) throw new Error("主 Agent 自验缺少结构化验收覆盖");
        return {
          summary: String(value.summary || "").trim().slice(0, 1600),
          criterionCoverage: value.criterion_coverage || value.criterionCoverage,
          risks: cleanList(value.risks, 20, 700),
          gaps: cleanList(value.gaps, 20, 700),
          confidence: Math.max(0, Math.min(1, Number(value.confidence || 0))),
        };
      },
      confidence: value => value.confidence,
      maxTokens: 1800,
      ...(input.semanticModelCall ? { modelCall: input.semanticModelCall } : {}),
      ...(input.semanticConfig ? { config: input.semanticConfig } : {}),
    });
    semanticReceipt = decision.receipt;
    semanticValue = decision.value;
  } catch (error: any) {
    semanticReceipt = error?.semanticDecisionReceipt || null;
    modelError = String(error?.message || error || "主 Agent 自验模型调用失败").slice(0, 800);
  }
  const criterionCoverage = normalizeCoverage(semanticValue?.criterionCoverage, criteria, evidenceIds);
  checks.push({ id: "model_decision", pass: !!semanticValue && semanticReceipt?.status === "confirmed", detail: modelError || "主 Agent 已完成结构化证据分析" });
  checks.push({ id: "criterion_coverage", pass: criterionCoverage.length > 0 && criterionCoverage.every(item => item.status === "verified"), detail: `${criterionCoverage.filter(item => item.status === "verified").length}/${criterionCoverage.length} 条标准有真实证据` });
  const gatePass = checks.every(item => item.pass);
  const blockers = [
    ...checks.filter(item => !item.pass).map(item => item.detail),
    ...cleanList(semanticValue?.gaps, 20, 700),
  ].filter(Boolean);
  const summary = semanticValue?.summary || (gatePass ? "主 Agent 自验通过" : `主 Agent 自验未通过：${blockers.join("；")}`);
  const completedAt = new Date().toISOString();
  const core = {
    schema: "ccm-main-agent-self-verification-receipt-v1" as const,
    version: 1 as const,
    task_id: String(task.id || input.policy.task_id),
    scope: input.policy.scope,
    scope_id: input.policy.scope_id,
    exact_session_id: input.policy.exact_session_id,
    acceptance_policy_checksum: input.policy.checksum,
    mode: "main_agent_self_verification" as const,
    round: 1 as const,
    model_status: semanticReceipt?.status === "confirmed" ? "confirmed" as const : "failed" as const,
    semantic_decision_receipt: semanticReceipt,
    source_snapshot_checksum: String(input.sourceSnapshotChecksum || checksum(changedFiles)),
    changed_files: changedFiles,
    verification_results: verificationResults,
    criterion_coverage: criterionCoverage,
    deterministic_gate: { pass: gatePass, checks },
    canAccept: gatePass,
    status: gatePass ? "main_agent_self_verified" as const : "main_agent_self_verification_failed" as const,
    report: {
      summary,
      verification: verificationResults.filter(item => item.status === "passed").map(item => `${item.project}: ${item.command}`),
      risks: cleanList(semanticValue?.risks, 20, 700),
      blockers,
    },
    verdict: { accepted: gatePass, gaps: blockers, evidence: [...evidenceIds], nextActions: blockers },
    decision: { route: gatePass ? "complete" as const : "needs_user" as const, reason: summary },
    completed_at: completedAt,
  };
  return { ...core, checksum: checksum(core) };
}

export function validateMainAgentSelfVerificationReceipt(task: any, policy: TaskAcceptancePolicySnapshot, receipt: any) {
  if (!receipt || receipt.schema !== "ccm-main-agent-self-verification-receipt-v1" || receipt.version !== 1) return { valid: false, reason: "self_verification_receipt_missing" };
  const { checksum: supplied, ...core } = receipt;
  if (!supplied || checksum(core) !== supplied) return { valid: false, reason: "self_verification_receipt_checksum_mismatch" };
  if (String(receipt.task_id || "") !== String(task?.id || "")) return { valid: false, reason: "self_verification_task_mismatch" };
  if (receipt.acceptance_policy_checksum !== policy.checksum) return { valid: false, reason: "self_verification_policy_mismatch" };
  if (receipt.scope !== policy.scope || receipt.scope_id !== policy.scope_id || receipt.exact_session_id !== policy.exact_session_id) return { valid: false, reason: "self_verification_scope_mismatch" };
  if (receipt.round !== 1 || receipt.model_status !== "confirmed" || receipt.deterministic_gate?.pass !== true || receipt.canAccept !== true) return { valid: false, reason: "self_verification_gate_failed" };
  return { valid: true, reason: "ok" };
}

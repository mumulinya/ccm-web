import * as crypto from "crypto";
import { spawn, spawnSync } from "child_process";
import {
  buildTestAgentSubprocessEnv,
  redactTestAgentSensitiveText,
  verificationCommandInvocation,
} from "../../test-agent/utils";
import { runSemanticDecision } from "../../system/semantic-decision-runtime";
import type { TaskAcceptancePolicySnapshot } from "./task-acceptance-policy";
import { discoverProjectVerificationCommands } from "../../agents/project-verification-discovery";

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

function normalizeAcceptanceCriterionForSignedPolicy(criterion: string) {
  return String(criterion || "")
    .replace(
      /并走\s*TestAgent\s*和\s*Terminal Gate\s*验收/gi,
      "并由本次签署的主 Agent 自验完成复核；Terminal Gate 在本复核通过后由 CCM 执行",
    )
    .replace(
      /require\s+(?:a\s+)?TestAgent\s+and\s+Terminal Gate\s+(?:review|acceptance)/gi,
      "use the signed main-agent self-verification policy; CCM runs Terminal Gate after this review passes",
    );
}

function isSupersededProviderBlocker(value: string) {
  const blocker = String(value || "").toLowerCase();
  return blocker.includes("testagent 未创建")
    || blocker.includes("testagent not created")
    || blocker.includes("terminal gate")
    || (blocker.includes("agent communication") && (blocker.includes("签名") || blocker.includes("signed")));
}

function applyTaskLifetimeFileProvenance(task: any, projects: VerificationProject[], files: any[]) {
  const workItemIds = new Set<string>([
    String(task?.work_item_id || task?.workItemId || ""),
    ...((Array.isArray(task?.task_context?.workItems) ? task.task_context.workItems : [])
      .map((item: any) => String(item?.workItemId || item?.work_item_id || ""))),
  ].filter(Boolean));
  const taskStartedAt = Date.parse(String(task?.created_at || task?.createdAt || task?.task_context?.updatedAt || ""));
  return files.map(file => {
    if (String(file?.status || "").toLowerCase() === "added") return file;
    const project = projects.find(item => item.name === file.project);
    if (!project?.workDir || !file.path) return file;
    const result = spawnSync("git", ["log", "--diff-filter=A", "-1", "--format=%H%x09%cI%x09%s", "--", file.path], {
      cwd: project.workDir,
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) return file;
    const [commit = "", committedAt = "", subject = ""] = String(result.stdout || "").trim().split("\t");
    const committedAtMs = Date.parse(committedAt);
    const normalizedSubject = subject.trim().toLowerCase();
    const belongsToTask = normalizedSubject.includes(String(task?.id || "").toLowerCase())
      || [...workItemIds].some(id => normalizedSubject === `ccm: ${id}`.toLowerCase());
    if (!commit || !belongsToTask || (Number.isFinite(taskStartedAt) && Number.isFinite(committedAtMs) && committedAtMs < taskStartedAt)) return file;
    return {
      ...file,
      status: "added",
      task_lifetime_status: "added",
      provenance: "task_work_item_commit",
      provenance_checksum: checksum({ taskId: task?.id || "", path: file.path, commit, committedAt, subject }),
      contentStored: false,
    };
  });
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
    const configured = cleanList(project.verificationCommands, 8, 300);
    const commands = configured.length ? configured : discoverProjectVerificationCommands(project.workDir, 4);
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
  workerReceipts?: any[];
  sourceSnapshotChecksum?: string;
  commandTimeoutMs?: number;
  semanticModelCall?: (request: { config: any; messages: any[]; maxTokens: number }) => Promise<any>;
  semanticConfig?: any;
}): Promise<MainAgentSelfVerificationReceiptV1> {
  if (input.policy.mode !== "main_agent_self_verification" || input.policy.test_agent_enabled) {
    throw new Error("主 Agent 自验拒绝使用非自验模式的策略快照");
  }
  const task = input.task || {};
  const criteria = cleanList(input.acceptanceCriteria?.length ? input.acceptanceCriteria : String(task.acceptance_criteria || "").split(/\r?\n|；/), 30, 900)
    .map(normalizeAcceptanceCriterionForSignedPolicy);
  if (!criteria.length) criteria.push(String(task.business_goal || task.description || task.title || "完成任务").trim().slice(0, 900));
  let changedFiles = (Array.isArray(input.changedFiles) ? input.changedFiles : []).map(item => ({
    path: String(item?.path || item?.file || item || "").trim(),
    project: String(item?.project || item?.projectName || task.target_project || "").trim(),
    status: String(item?.status_kind || item?.status || "modified").trim(),
  })).filter(item => item.path).slice(0, 200);
  const projects = (input.projects || []).filter(project => project?.name && project?.workDir).map(project => ({
    ...project,
    verificationCommands: cleanList(project.verificationCommands, 8, 300).length
      ? cleanList(project.verificationCommands, 8, 300)
      : discoverProjectVerificationCommands(project.workDir, 4),
  }));
  changedFiles = applyTaskLifetimeFileProvenance(task, projects, changedFiles);
  const verificationResults = await runConfiguredVerification(projects, Math.max(10_000, Math.min(300_000, Number(input.commandTimeoutMs || 120_000))));
  const workerReceipts = (Array.isArray(input.workerReceipts) ? input.workerReceipts : []).slice(0, 12).map((receipt, index) => ({
    id: `worker_receipt:${index + 1}`,
    status: String(receipt?.status || receipt?.receipt_status || "").slice(0, 80),
    summary: String(receipt?.summary || "").slice(0, 1000),
    actions: cleanList(receipt?.actions, 30, 500),
    filesChanged: cleanList(receipt?.filesChanged || receipt?.files_changed || receipt?.files, 100, 500),
    verification: cleanList(receipt?.verification || receipt?.verificationResults || receipt?.tests, 30, 500),
    // TestAgent and Terminal Gate are owned by CCM after the worker returns.
    // Likewise, reaching this verifier proves that the strict pre-execution
    // ACK gate already accepted the signed communication envelope. Provider
    // text cannot turn those downstream/platform responsibilities into a
    // delivery blocker.
    blockers: cleanList(receipt?.blockers, 20, 500).filter(item => !isSupersededProviderBlocker(item)),
    contentStored: false,
  })).filter(item => item.actions.length || item.filesChanged.length || item.verification.length || item.summary);
  const evidenceIds = new Set<string>([
    "acceptance_policy:main_agent_self_verification",
    ...changedFiles.map(item => `file:${item.project}:${item.path}`),
    ...verificationResults.filter(item => item.status === "passed").map(item => item.id),
    ...workerReceipts.map(item => item.id),
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
      system: `You are the main Agent reviewing the current task while TestAgent is disabled by the signed acceptance policy. Analyze only server-provided evidence; never invent commands, files, or pass conclusions. A structured worker receipt is supporting evidence only and cannot override failed deterministic file or command checks. File status is task-lifetime status: an added status with provenance task_work_item_commit proves that an earlier attempt of this same task created the file, even if the current recovery attempt now sees it as modified. A provider-reported command blocker is superseded only when the same command has a fresh passed CCM verification result; unrelated scope or file blockers remain valid. The acceptance criteria supplied to you are the canonical policy-normalized criteria for this review: the signed main-agent self-verification replaces TestAgent, and Terminal Gate runs only after this receipt passes. Therefore never demand a TestAgent receipt or a pre-existing Terminal Gate receipt. Cite acceptance_policy:main_agent_self_verification when policy substitution is relevant. Return one coverage row for every acceptance criterion and cite only IDs present in evidence_ids. Return JSON: {"summary":"self-review summary","criterion_coverage":[{"criterion":"original criterion","status":"verified|unverified|needs_user","evidence_ids":["real evidence ID"],"reason":"evidence basis"}],"risks":[],"gaps":[],"confidence":0.0}. Do not return an accepted field.`,
      input: {
        goal: task.business_goal || task.description || task.title,
        source_snapshot_checksum: String(input.sourceSnapshotChecksum || checksum(changedFiles)),
        acceptance_criteria: criteria,
        deterministic_checks: checks,
        evidence: {
          acceptance_policy: {
            id: "acceptance_policy:main_agent_self_verification",
            mode: input.policy.mode,
            test_agent_enabled: input.policy.test_agent_enabled,
            terminal_gate_stage: "after_self_verification",
            checksum: input.policy.checksum,
            contentStored: false,
          },
          changed_files: changedFiles.map(item => ({ id: `file:${item.project}:${item.path}`, ...item })),
          verification_results: verificationResults.map(item => ({ ...item, output: item.output.slice(0, 800) })),
          worker_receipts: workerReceipts,
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

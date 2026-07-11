import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { CommandRunResult, TestAgentReport } from "../test-agent/types";
import { isSafeVerificationCommand, runManagedCommand } from "./execution-kernel";

export type MainAgentPostReviewSpotCheckStatus =
  | "not_required"
  | "passed"
  | "needs_recheck"
  | "needs_user";

export interface MainAgentPostReviewSpotCheckItem {
  project: string;
  command: string;
  cwd: string;
  review_status: string;
  review_exit_code: number | null;
  review_output_hash: string;
  review_output_preview: string;
  command_block_complete: boolean;
  safe_to_run: boolean;
  observed_status: "passed" | "failed" | "blocked";
  observed_exit_code: number | null;
  observed_output_hash: string;
  observed_output_preview: string;
  observed_output_file: string;
  output_consistency: "exact" | "silent" | "outcome_matched" | "divergent" | "not_run";
  matches_review: boolean;
  error: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
}

export interface MainAgentPostReviewSpotCheck {
  schema: "ccm-main-agent-post-review-spot-check-v1";
  required: boolean;
  pass: boolean;
  status: MainAgentPostReviewSpotCheckStatus;
  report_id: string;
  work_order_id: string;
  candidate_count: number;
  selected_count: number;
  executed_count: number;
  passed_count: number;
  mismatch_count: number;
  incomplete_command_block_count: number;
  unavailable_command_count: number;
  checks: MainAgentPostReviewSpotCheckItem[];
  issues: string[];
  headline: string;
  next_action: string;
  generated_at: string;
  display_policy: {
    user_text_first: true;
    technical_default_collapsed: true;
    hide_internal_protocols: true;
    show_for_ordinary_conversation: false;
  };
}

export interface MainAgentPostReviewSpotCheckSummary {
  schema: "ccm-main-agent-post-review-spot-check-summary-v1";
  title: string;
  status: "passed" | "needs_recheck" | "needs_user" | "recorded";
  status_label: string;
  headline: string;
  rows: string[];
  next_action: string;
  display_policy: MainAgentPostReviewSpotCheck["display_policy"];
}

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function compactText(value: any, max = 4000) {
  const text = String(value || "").replace(/\u001b\[[0-9;]*m/g, "").trim();
  if (text.length <= max) return text;
  const head = Math.max(400, Math.floor(max * 0.58));
  const tail = Math.max(200, max - head - 40);
  return `${text.slice(0, head)}\n...[output truncated]...\n${text.slice(-tail)}`;
}

function outputText(value: any) {
  const direct = String(value?.output || "").trim();
  if (direct) return direct;
  return [value?.stdout, value?.stderr].map(item => String(item || "").trim()).filter(Boolean).join("\n");
}

function outputHash(value: any) {
  const text = String(value || "").replace(/\u001b\[[0-9;]*m/g, "").replace(/\r\n/g, "\n").trim();
  return text ? crypto.createHash("sha256").update(text).digest("hex").slice(0, 20) : "";
}

function hasOwn(value: any, key: string) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function commandBlockComplete(item: any) {
  return !!String(item?.command || "").trim()
    && !!String(item?.cwd || "").trim()
    && hasOwn(item, "exitCode")
    && hasOwn(item, "stdout")
    && hasOwn(item, "stderr")
    && hasOwn(item, "output");
}

function isWithinRoot(candidate: string, root: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function existingDirectory(value: any) {
  try {
    const resolved = path.resolve(String(value || ""));
    return fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? fs.realpathSync(resolved) : "";
  } catch {
    return "";
  }
}

function resolveCommandCwd(item: any, projectRoot: string) {
  const root = existingDirectory(projectRoot);
  const candidate = existingDirectory(item?.cwd);
  if (!candidate) return "";
  if (root && !isWithinRoot(candidate, root)) return "";
  return candidate;
}

function uniquePassedCommands(report: TestAgentReport) {
  const seen = new Set<string>();
  const rows: CommandRunResult[] = [];
  for (const item of asArray<CommandRunResult>(report?.commandResults)) {
    if (String(item?.status || "").toLowerCase() !== "passed") continue;
    const key = `${String(item?.project || "").trim().toLowerCase()}|${String(item?.cwd || "").trim().toLowerCase()}|${String(item?.command || "").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(item);
  }
  return rows;
}

function buildBaseResult(report: TestAgentReport, required = true): MainAgentPostReviewSpotCheck {
  return {
    schema: "ccm-main-agent-post-review-spot-check-v1",
    required,
    pass: !required,
    status: required ? "needs_recheck" : "not_required",
    report_id: String(report?.id || ""),
    work_order_id: String(report?.workOrderId || ""),
    candidate_count: 0,
    selected_count: 0,
    executed_count: 0,
    passed_count: 0,
    mismatch_count: 0,
    incomplete_command_block_count: 0,
    unavailable_command_count: 0,
    checks: [],
    issues: [],
    headline: required ? "TestAgent 已通过，我还需要抽查关键验证。" : "本次不需要完成前抽查。",
    next_action: required ? "抽查通过后再进入最终总结。" : "",
    generated_at: new Date().toISOString(),
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function failedCheckFromCandidate(item: CommandRunResult, projectRoot: string, issue: string): MainAgentPostReviewSpotCheckItem {
  const reviewOutput = outputText(item);
  const cwd = resolveCommandCwd(item, projectRoot);
  return {
    project: String(item?.project || ""),
    command: String(item?.command || ""),
    cwd,
    review_status: String(item?.status || ""),
    review_exit_code: item?.exitCode ?? null,
    review_output_hash: outputHash(reviewOutput),
    review_output_preview: compactText(reviewOutput),
    command_block_complete: commandBlockComplete(item),
    safe_to_run: isSafeVerificationCommand(String(item?.command || "")),
    observed_status: "blocked",
    observed_exit_code: null,
    observed_output_hash: "",
    observed_output_preview: "",
    observed_output_file: "",
    output_consistency: "not_run",
    matches_review: false,
    error: issue,
    started_at: "",
    finished_at: "",
    duration_ms: 0,
  };
}

export async function runMainAgentPostReviewSpotCheck(input: {
  report: TestAgentReport;
  taskId?: string;
  projectRoot?: string;
  required?: boolean;
  maxCommands?: number;
  timeoutMs?: number;
}): Promise<MainAgentPostReviewSpotCheck> {
  const report = input.report;
  const required = input.required !== false;
  const result = buildBaseResult(report, required);
  if (!required) return result;

  const candidates = uniquePassedCommands(report);
  const maxCommands = Math.max(1, Math.min(3, Number(input.maxCommands || 3)));
  result.candidate_count = candidates.length;
  result.incomplete_command_block_count = candidates.filter(item => !commandBlockComplete(item)).length;

  if (!candidates.length) {
    result.issues.push("TestAgent 的通过报告没有可供我抽查的命令结果。");
    result.headline = "TestAgent 已通过，但没有可抽查的命令记录。";
    result.next_action = "要求 TestAgent 补齐实际命令结果并重新判断后，再进入最终总结。";
    return result;
  }

  const runnable: Array<{ item: CommandRunResult; cwd: string }> = [];
  for (const item of candidates) {
    const command = String(item?.command || "").trim();
    const cwd = resolveCommandCwd(item, String(input.projectRoot || ""));
    const complete = commandBlockComplete(item);
    const safe = isSafeVerificationCommand(command);
    if (!complete || !safe || !cwd) {
      const issue = !complete
        ? "TestAgent 的通过记录缺少完整命令结果块。"
        : !safe
          ? "命令不符合完成前安全抽查规则。"
          : "命令工作目录不可用或超出被复核项目。";
      result.checks.push(failedCheckFromCandidate(item, String(input.projectRoot || ""), issue));
      result.issues.push(issue);
      result.unavailable_command_count += 1;
      continue;
    }
    runnable.push({ item, cwd });
  }

  const selected = runnable.slice(0, maxCommands);
  result.selected_count = selected.length;
  if (!selected.length) {
    result.headline = "TestAgent 已通过，但我暂时无法安全重跑报告中的命令。";
    result.next_action = "要求 TestAgent 修正命令结果或项目目录后重新判断。";
    result.issues = [...new Set(result.issues)];
    return result;
  }

  for (const { item, cwd } of selected) {
    const startedAt = new Date();
    const reviewOutput = outputText(item);
    let observed: any = null;
    let error: any = null;
    try {
      observed = await runManagedCommand({
        taskId: String(input.taskId || report.taskId || report.id || "post-review-spot-check"),
        command: String(item.command || ""),
        cwd,
        timeoutMs: Math.max(10_000, Number(input.timeoutMs || 300_000)),
        maxOutputBytes: 1024 * 1024,
        project: String(item.project || ""),
        agentType: "main-agent",
        source: "post-review-spot-check",
        commandLabel: "完成前抽查",
        title: "主 Agent 抽查 TestAgent 验证",
      });
    } catch (caught: any) {
      error = caught;
      observed = caught || {};
    }
    const finishedAt = new Date();
    const observedOutput = [observed?.stdout, observed?.stderr].map(value => String(value || "").trim()).filter(Boolean).join("\n");
    const reviewExitCode = Number(item.exitCode);
    const observedExitCode = Number(observed?.exitCode);
    const reviewPassed = String(item.status || "").toLowerCase() === "passed" && reviewExitCode === 0;
    const observedPassed = !error && observedExitCode === 0;
    const exitStatusMatches = Number.isFinite(reviewExitCode)
      && Number.isFinite(observedExitCode)
      && reviewExitCode === observedExitCode;
    const reviewHash = outputHash(reviewOutput);
    const observedHash = outputHash(observedOutput);
    const consistency = reviewPassed && observedPassed && exitStatusMatches
      ? reviewHash && observedHash && reviewHash === observedHash
        ? "exact"
        : !reviewHash && !observedHash
          ? "silent"
          : "outcome_matched"
      : "divergent";
    const check: MainAgentPostReviewSpotCheckItem = {
      project: String(item.project || ""),
      command: String(item.command || ""),
      cwd,
      review_status: String(item.status || ""),
      review_exit_code: item.exitCode ?? null,
      review_output_hash: reviewHash,
      review_output_preview: compactText(reviewOutput),
      command_block_complete: commandBlockComplete(item),
      safe_to_run: true,
      observed_status: observedPassed ? "passed" : "failed",
      observed_exit_code: observed?.exitCode ?? null,
      observed_output_hash: observedHash,
      observed_output_preview: compactText(observedOutput || error?.message || ""),
      observed_output_file: String(observed?.outputFile || ""),
      output_consistency: consistency,
      matches_review: reviewPassed && observedPassed && exitStatusMatches,
      error: reviewPassed && observedPassed && exitStatusMatches
        ? ""
        : compactText(
          error?.message
            || (!reviewPassed ? `TestAgent 的通过记录与退出状态不一致（记录退出码：${item.exitCode ?? "缺失"}）。` : "")
            || observed?.stderr
            || observed?.stdout
            || "命令抽查未通过。",
          1200,
        ),
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    };
    result.checks.push(check);
  }

  result.executed_count = result.checks.filter(item => item.observed_status !== "blocked").length;
  result.passed_count = result.checks.filter(item => item.matches_review).length;
  result.mismatch_count = result.checks.filter(item => !item.matches_review).length;
  result.issues = [...new Set(result.issues)];
  result.pass = result.executed_count > 0
    && result.mismatch_count === 0
    && result.incomplete_command_block_count === 0
    && result.unavailable_command_count === 0;
  result.status = result.pass ? "passed" : "needs_recheck";
  result.headline = result.pass
    ? `我已抽查 ${result.executed_count} 项验证，结果与 TestAgent 的通过结论一致。`
    : `我已抽查 ${result.executed_count} 项验证，其中 ${result.mismatch_count || result.unavailable_command_count || result.incomplete_command_block_count} 项需要重新确认。`;
  result.next_action = result.pass
    ? "继续核对交付总结并完成最终验收。"
    : "把抽查差异交回 TestAgent 重新执行并重新判断；结论一致前不宣布完成。";
  return result;
}

export function buildPostReviewSpotCheckSummary(value: any): MainAgentPostReviewSpotCheckSummary | null {
  if (!value || typeof value !== "object" || value.required === false || value.status === "not_required") return null;
  const status = value.status === "passed"
    ? "passed"
    : value.status === "needs_user"
      ? "needs_user"
      : value.status === "needs_recheck"
        ? "needs_recheck"
        : "recorded";
  const executed = Number(value.executed_count || value.executedCount || 0);
  const passed = Number(value.passed_count || value.passedCount || 0);
  const mismatch = Number(value.mismatch_count || value.mismatchCount || 0);
  const incomplete = Number(value.incomplete_command_block_count || value.incompleteCommandBlockCount || 0);
  const unavailable = Number(value.unavailable_command_count || value.unavailableCommandCount || 0);
  const rows = [
    executed ? `已抽查 ${executed} 项验证，${passed} 项结果一致${mismatch ? `，${mismatch} 项不一致` : ""}` : "尚未完成可复跑验证的抽查",
    incomplete ? `TestAgent 有 ${incomplete} 条通过记录缺少完整命令结果` : "",
    unavailable ? `有 ${unavailable} 项验证暂时无法安全复跑` : "",
  ].filter(Boolean).slice(0, 4);
  return {
    schema: "ccm-main-agent-post-review-spot-check-summary-v1",
    title: "完成前抽查",
    status,
    status_label: status === "passed" ? "已通过" : status === "needs_user" ? "待确认" : status === "needs_recheck" ? "需复验" : "已记录",
    headline: String(value.headline || (status === "passed"
      ? "我已抽查关键验证，结果与独立复核一致。"
      : "我的完成前抽查还没有通过。")),
    rows,
    next_action: String(value.next_action || value.nextAction || (status === "passed"
      ? "继续完成最终验收。"
      : "重新运行 TestAgent 并核对抽查差异。")),
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function collectReceiptSpotChecks(receipts: any[] = []) {
  return receipts.flatMap(receipt => [
    receipt?.post_review_spot_check,
    receipt?.postReviewSpotCheck,
    receipt?.testAgentReport?.post_review_spot_check,
    receipt?.testAgentReport?.postReviewSpotCheck,
    receipt?.test_agent_report?.post_review_spot_check,
    receipt?.test_agent_report?.postReviewSpotCheck,
  ]).filter((item: any) => item?.schema === "ccm-main-agent-post-review-spot-check-v1");
}

function spotCheckTime(value: any) {
  const time = Date.parse(String(value?.generated_at || value?.generatedAt || ""));
  return Number.isFinite(time) ? time : 0;
}

export function buildPostReviewSpotCheckGate(input: {
  required?: boolean;
  receipts?: any[];
}) {
  const required = input.required === true;
  const checks = collectReceiptSpotChecks(asArray(input.receipts)).sort((a, b) => spotCheckTime(a) - spotCheckTime(b));
  const latest = checks[checks.length - 1] || null;
  const pass = !required || latest?.pass === true || latest?.status === "passed";
  const status = !required
    ? "not_required"
    : pass
      ? "passed"
      : latest?.status === "needs_user"
        ? "needs_user"
        : latest
          ? "needs_recheck"
          : "missing";
  const reason = !required
    ? "本次不需要完成前抽查"
    : pass
      ? "TestAgent 通过后，我已完成关键验证抽查"
      : latest?.headline || "TestAgent 已通过，但我还没有完成关键验证抽查";
  return {
    schema: "ccm-main-agent-post-review-spot-check-gate-v1",
    required,
    pass,
    status,
    reason,
    check_count: checks.length,
    latest,
    summary: buildPostReviewSpotCheckSummary(latest),
  };
}

export function runPostReviewSpotCheckContractSelfTest() {
  const passed = buildPostReviewSpotCheckGate({
    required: true,
    receipts: [{
      post_review_spot_check: {
        ...buildBaseResult({ id: "report-pass", workOrderId: "work-order-pass" } as TestAgentReport, true),
        pass: true,
        status: "passed",
        executed_count: 2,
        passed_count: 2,
        mismatch_count: 0,
        headline: "我已抽查 2 项验证，结果一致。",
      },
    }],
  });
  const missing = buildPostReviewSpotCheckGate({ required: true, receipts: [] });
  const mismatch = buildPostReviewSpotCheckGate({
    required: true,
    receipts: [{
      postReviewSpotCheck: {
        ...buildBaseResult({ id: "report-mismatch", workOrderId: "work-order-mismatch" } as TestAgentReport, true),
        pass: false,
        status: "needs_recheck",
        executed_count: 2,
        passed_count: 1,
        mismatch_count: 1,
        headline: "我已抽查 2 项验证，其中 1 项不一致。",
      },
    }],
  });
  return {
    pass: passed.pass === true
      && passed.status === "passed"
      && passed.summary?.rows?.some((item: string) => item.includes("2 项结果一致"))
      && missing.pass === false
      && missing.status === "missing"
      && mismatch.pass === false
      && mismatch.status === "needs_recheck"
      && mismatch.summary?.rows?.some((item: string) => item.includes("1 项不一致")),
    passed,
    missing,
    mismatch,
  };
}

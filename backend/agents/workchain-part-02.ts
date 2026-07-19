// Behavior-freeze split from workchain.ts (part 2/2).
import {
  type MainAgentWorkchainInput,
  type MainAgentWorkchainSurface,
  sanitizeWorkchainUserText,
  collectCompletionEvidence,
  terminalWorkchain,
  stageStatus,
  buildMainAgentProgressCheckpoints,
  buildWorkchainTodoPlan,
  buildFinalSummaryQuality,
  collectWorkchainVisibleQualityText,
  sanitizeTestAgentFailureText,
  INTERNAL_TEXT_PATTERN,
  WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN,
  GENERIC_COMPLETION_REPLY_PATTERN,
  compactText,
  narrativeList,
  stringList,
} from "./workchain-part-01";

function buildWorkchainQualityFollowup(quality: any) {
  if (!quality?.required || quality?.passed) return null;
  const missing = narrativeList(quality.missing, 5, "交付总结缺少必要内容。");
  if (!missing.length) return null;
  const independentReviewGap = Array.isArray(quality.checks)
    ? quality.checks.find((item: any) => item?.id === "independent_review" && item?.passed === false)
    : null;
  const postReviewSpotCheckGap = Array.isArray(quality.checks)
    ? quality.checks.find((item: any) => item?.id === "post_review_spot_check" && item?.passed === false)
    : null;
  const independentReviewDetail = sanitizeWorkchainUserText(independentReviewGap?.detail || "", "", 220);
  const independentReviewNeedsConfirmation = /需要确认|待确认|证据待确认|人工确认/i.test(independentReviewDetail);
  const independentReviewNeedsRecheck = /需要重新验证|重新复验|复核证据.*没有闭环|会话恢复.*没有闭环/i.test(independentReviewDetail);
  const independentReviewNeedsEnvironment = /需要补齐执行条件|环境|登录条件|运行条件/i.test(independentReviewDetail);
  const postReviewSpotCheckDetail = sanitizeWorkchainUserText(postReviewSpotCheckGap?.detail || "", "", 220);
  const nextAction = postReviewSpotCheckGap
    ? `${postReviewSpotCheckDetail || "TestAgent 通过后我仍需抽查关键验证。"}。沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证；结论一致后再给出最终交付总结。`
    : independentReviewGap
    ? independentReviewDetail && !/复杂变更独立复核仍需补齐/.test(independentReviewDetail)
      ? independentReviewNeedsRecheck
        ? "先补齐可观察结果、会话恢复或目标关联的边界检查，再重新运行 TestAgent；不要直接要求原实现成员返工。"
        : independentReviewNeedsConfirmation
          ? `${independentReviewDetail}。确认或补齐证据后重新运行 TestAgent/独立复核，再给出最终交付总结。`
          : independentReviewNeedsEnvironment
            ? "先补齐环境、登录或运行条件，再继续 TestAgent 复核和最终总结。"
            : "先让原实现成员修复复核失败点，修复后重新运行 TestAgent/独立复核，再给出最终交付总结。"
      : "先让原实现成员修复复核未通过的问题，修复后重新运行 TestAgent/独立复核，再给出最终交付总结。"
    : `先补齐${missing[0]}，再给出最终交付总结。`;
  return {
    schema: "ccm-main-agent-quality-followup-v1",
    title: "交付总结还需补齐",
    headline: `这轮结果还不能当作完整交付总结，缺少：${missing.join("、")}。`,
    missing,
    next_action: nextAction,
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

function buildWorkchainQualityFollowupUserVisibleText(baseText: string, qualityFollowup: any) {
  if (!qualityFollowup) return baseText;
  const missing = narrativeList(qualityFollowup.missing, 3, "交付总结缺少必要内容。");
  const missingText = missing.length ? `，还缺少${missing.join("、")}` : "";
  const nextAction = sanitizeWorkchainUserText(qualityFollowup.next_action || qualityFollowup.nextAction, "", 220);
  const base = GENERIC_COMPLETION_REPLY_PATTERN.test(String(baseText || "").trim()) || /已完成|已处理|任务已处理|处理完成/.test(String(baseText || ""))
    ? "任务已有处理结果"
    : sanitizeWorkchainUserText(baseText, "任务已有处理结果", 180).replace(/[。.!！\s]+$/, "");
  return compactText(`${base}，但最终交付总结还在补齐${missingText}。${nextAction ? `下一步：${nextAction}` : ""}`, 360);
}

function buildUserVisibleText(input: MainAgentWorkchainInput, evidence: ReturnType<typeof collectCompletionEvidence>) {
  const status = String(input.status || "").toLowerCase();
  const phase = String(input.phase || input.mode || "").toLowerCase();
  const summary = input.summary || {};
  const completion = input.completion || {};
  const explicit = completion.summary || summary.headline || input.userText;
  if (status === "supervising") {
    const explicitText = sanitizeWorkchainUserText(explicit, "", 420);
    const nextText = sanitizeWorkchainUserText(completion.next_action || completion.nextAction || "", "", 260);
    if (phase === "needs_confirmation" && explicitText) return explicitText;
    if (/返工|rework|修复|重新复核|重新运行 TestAgent/i.test(`${explicitText}\n${nextText}`) && explicitText) return explicitText;
    return "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。";
  }
  if (evidence.postReviewSpotCheck?.failed) {
    const failure = sanitizeWorkchainUserText(evidence.postReviewSpotCheck.failedText || "", "", 260);
    return failure
      ? `这轮还不能算完成：${failure}`
      : "这轮还不能算完成：TestAgent 已通过，但我的完成前抽查尚未一致。";
  }
  if (evidence.postReviewSpotCheck?.needsUser) {
    const detail = sanitizeWorkchainUserText(evidence.postReviewSpotCheck.failedText || "", "", 260);
    return detail
      ? `这轮还需要确认：${detail}`
      : "这轮还需要确认：完成前抽查缺少可复跑的验证条件。";
  }
  if (evidence.independentReviewGate?.failed) {
    const failure = sanitizeWorkchainUserText(evidence.independentReviewGate.failedText || "", "", 260);
    return failure
      ? `这轮还不能算完成：${failure}。`
      : "这轮还不能算完成：独立复核未通过，需要原实现成员返工后重新复核。";
  }
  if (evidence.independentReviewGate?.needsRecheck) {
    const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
    return detail
      ? `这轮还不能算完成：${detail}。`
      : "这轮还不能算完成：TestAgent 的复核证据还没有闭环，需要重新复验。";
  }
  if (evidence.independentReviewGate?.needsEnvironment) {
    const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
    return detail
      ? `这轮还不能算完成：${detail}。`
      : "这轮还不能算完成：TestAgent 复核需要先补齐环境或登录条件。";
  }
  if (evidence.independentReviewGate?.needsUser) {
    const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
    return detail
      ? `这轮还需要确认：${detail}。`
      : "这轮还需要确认：TestAgent 标记了待确认的验收项。";
  }
  if (["failed"].includes(status) || phase === "failed") return sanitizeWorkchainUserText(explicit, "这次处理没有完成；原因和排障信息已放在技术详情里。");
  if (["cancelled", "canceled"].includes(status) || phase === "cancelled") return "本次处理已停止，不会继续执行。";
  if (["completed", "done", "succeeded"].includes(status) || phase === "completed") {
    if (explicit && !GENERIC_COMPLETION_REPLY_PATTERN.test(String(explicit).trim())) return sanitizeWorkchainUserText(explicit, "本轮处理已完成。");
    const parts = [];
    if (evidence.files.length) parts.push(`修改了 ${evidence.files.length} 个文件`);
    if (evidence.verification.length) parts.push(`完成 ${evidence.verification.length} 项检查`);
    if (evidence.independentReview.length
      && !evidence.independentReviewGate?.failed
      && !evidence.independentReviewGate?.needsRecheck
      && !evidence.independentReviewGate?.needsEnvironment
      && !evidence.independentReviewGate?.needsUser) parts.push(`完成独立复核`);
    if (evidence.workersDone) parts.push(`${evidence.workersDone} 个执行目标已完成`);
    return parts.length
      ? `已完成：${parts.join("，")}。`
      : input.mode === "conversation"
        ? "回复已整理给你。"
        : "处理结果已整理，是否已经交付以验收和最终总结为准。";
  }
  if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user") return sanitizeWorkchainUserText(explicit, "我需要你确认目标、范围或授权后再继续。");
  return sanitizeWorkchainUserText(explicit, input.surface === "global" ? "我正在处理你的需求。" : "协作群正在协调处理你的需求。");
}

function buildTechnicalSections(input: MainAgentWorkchainInput) {
  const technical = input.technical || {};
  const records: any[] = [];
  const troubleshooting: any[] = [];
  if (input.traceId) records.push({ label: "Trace", value: input.traceId });
  if (input.runId) records.push({ label: "Run", value: input.runId });
  if (input.taskId) records.push({ label: "Task", value: input.taskId });
  if (input.missionId) records.push({ label: "Mission", value: input.missionId });
  if (input.supervisorId) records.push({ label: "Supervisor", value: input.supervisorId });
  if (technical.execution_ids?.length) records.push({ label: "执行", value: technical.execution_ids.join("、") });
  if (technical.session_ids?.length) records.push({ label: "会话", value: technical.session_ids.join("、") });
  if ((input.actionIds || []).length) records.push({ label: "动作", value: (input.actionIds || []).join(", ") });
  const technicalContent = technical.technical_content || technical.technicalContent || technical.raw_reply || technical.rawReply || technical.raw_content || technical.rawContent || "";
  if (technicalContent) records.push({ label: "原始回复", value: compactText(technicalContent, 1600) });
  const blockers = stringList([...(technical.blockers || []), ...((input.summary || {}).blockers || [])], 6);
  if (blockers.length) troubleshooting.push({ label: "阻塞", value: blockers.join("；") });
  if ((input.rawEvents || []).length) records.push({ label: "原始事件", value: `${(input.rawEvents || []).length} 条，默认隐藏` });
  return [
    { id: "troubleshooting", title: "排障摘要", items: troubleshooting },
    { id: "records", title: "完整记录", items: records },
  ].filter(section => section.items.length);
}

export function buildMainAgentWorkchain(input: MainAgentWorkchainInput) {
  const evidence = collectCompletionEvidence(input);
  const userVisibleText = buildUserVisibleText(input, evidence);
  const stages = [
    { id: "intake", label: "理解需求", status: stageStatus(input, "intake"), summary: "确认用户真正想完成什么" },
    { id: "plan", label: "形成计划", status: stageStatus(input, "plan"), summary: "拆成可执行步骤和验收标准" },
    { id: "execute", label: input.surface === "global" ? "调度执行" : "协作执行", status: stageStatus(input, "execute"), summary: "调用工具或安排执行成员落地" },
    { id: "verify", label: "检查验收", status: stageStatus(input, "verify"), summary: "核对文件、结果说明、验证和风险" },
    { id: "summarize", label: "总结交付", status: stageStatus(input, "summarize"), summary: "用用户能看懂的话说明结果" },
  ];
  const terminal = terminalWorkchain(input);
  const baseProgressCheckpoints = buildMainAgentProgressCheckpoints(input, stages, evidence);
  const baseTodoPlan = buildWorkchainTodoPlan(input, stages, evidence, terminal);
  const explicitNextAction = sanitizeWorkchainUserText(input.completion?.next_action, "", 260);
  const provisionalNextAction = explicitNextAction
    || evidence.postReviewSpotCheck?.nextAction
    || evidence.independentReviewGate?.nextAction
    || (evidence.risks.length ? "先处理风险或缺口，再继续交付" : terminal ? "可以查看详情、继续补充要求或保存为知识" : "继续执行并在完成后给出总结");
  const provisionalQuality = buildFinalSummaryQuality(input, evidence, terminal, userVisibleText, provisionalNextAction, { todoPlan: baseTodoPlan, progressCheckpoints: baseProgressCheckpoints });
  const provisionalQualityFollowup = buildWorkchainQualityFollowup(provisionalQuality);
  const todoPlan = provisionalQualityFollowup ? buildWorkchainTodoPlan(input, stages, evidence, terminal, { qualityFollowup: provisionalQualityFollowup }) : baseTodoPlan;
  const progressCheckpoints = provisionalQualityFollowup ? buildMainAgentProgressCheckpoints(input, stages, evidence, { qualityFollowup: provisionalQualityFollowup }) : baseProgressCheckpoints;
  const nextAction = provisionalQualityFollowup?.next_action || provisionalNextAction;
  const provisionalUserVisibleText = provisionalQualityFollowup ? buildWorkchainQualityFollowupUserVisibleText(userVisibleText, provisionalQualityFollowup) : userVisibleText;
  const finalSummaryQuality = provisionalQualityFollowup
    ? buildFinalSummaryQuality(input, evidence, terminal, provisionalUserVisibleText, nextAction, { todoPlan, progressCheckpoints })
    : provisionalQuality;
  const qualityFollowup = buildWorkchainQualityFollowup(finalSummaryQuality);
  const finalUserVisibleText = qualityFollowup ? buildWorkchainQualityFollowupUserVisibleText(userVisibleText, qualityFollowup) : userVisibleText;
  return {
    schema: "ccm-main-agent-workchain-v1",
    surface: input.surface,
    mode: input.mode || "",
    status: input.status || "",
    phase: input.phase || "",
    user_visible_text: finalUserVisibleText,
    stages,
    todo_plan: todoPlan,
    todoPlan,
    progress_checkpoints: progressCheckpoints,
    completion_summary: {
      headline: finalUserVisibleText,
      evidence: evidence.evidence,
      files: evidence.files,
      verification: evidence.verification,
      acceptance: evidence.acceptance,
      independent_review: evidence.independentReview,
      independentReview: evidence.independentReview,
      post_review_spot_check: evidence.postReviewSpotCheck?.spotCheck || null,
      postReviewSpotCheck: evidence.postReviewSpotCheck?.spotCheck || null,
      post_review_spot_check_summary: evidence.postReviewSpotCheck?.summary || null,
      postReviewSpotCheckSummary: evidence.postReviewSpotCheck?.summary || null,
      post_review_spot_check_gate: evidence.postReviewSpotCheck?.gate || null,
      postReviewSpotCheckGate: evidence.postReviewSpotCheck?.gate || null,
      post_review_spot_check_required: evidence.postReviewSpotCheck?.required === true,
      post_review_spot_check_gate_passed: evidence.postReviewSpotCheck?.passed === true,
      risks: evidence.risks,
      next_action: nextAction,
      verification_status: finalSummaryQuality.verification_status,
      risk_status: finalSummaryQuality.risk_status,
      final_summary_quality: finalSummaryQuality,
      quality_followup: qualityFollowup,
      qualityFollowup,
      todo_plan: todoPlan,
      todoPlan,
      terminal,
    },
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      final_summary_required: true,
    },
    technical_details: buildTechnicalSections(input),
  };
}

function completionSummaryHasEvidence(summary: any) {
  return Array.isArray(summary?.evidence) && summary.evidence.length > 0
    || Array.isArray(summary?.files) && summary.files.length > 0
    || Array.isArray(summary?.verification) && summary.verification.length > 0
    || Array.isArray(summary?.risks) && summary.risks.length > 0
    || !!summary?.delivery_report
    || !!summary?.deliveryReport;
}

function replyAlreadyHasFinalSummaryShape(value: string) {
  if (!value) return false;
  const text = String(value || "");
  const hasOutcome = /完成内容|处理总结|交付|已完成|已处理|结果/.test(text);
  const hasVerification = /验证|验收|检查|证据/.test(text);
  const hasRiskOrNext = /风险|需要留意|下一步|接下来/.test(text);
  return hasOutcome && hasVerification && hasRiskOrNext;
}

export function formatMainAgentCompletionReply(options: { reply?: any; workchain: any; includeDetails?: boolean }) {
  const original = sanitizeWorkchainUserText(options.reply, "", 1200);
  if (options.workchain?.mode === "conversation" && options.includeDetails !== true) return original;
  const generic = !original || GENERIC_COMPLETION_REPLY_PATTERN.test(original);
  const summary = options.workchain?.completion_summary || {};
  const quality = summary.final_summary_quality || {};
  const shouldShape = options.includeDetails === true || quality.required === true || completionSummaryHasEvidence(summary);
  if (!shouldShape && !generic && !options.includeDetails) return original;
  if (!generic && shouldShape && replyAlreadyHasFinalSummaryShape(original)) return original;
  const headline = sanitizeWorkchainUserText(summary.headline, "处理结果已整理，是否已经交付以验收和最终总结为准。", 360);
  const evidenceLines = narrativeList(summary.evidence, 6, "处理证据已整理，技术细节已放入技术详情。");
  const verificationLines = narrativeList(summary.verification, 6, "验证记录已整理，技术细节已放入技术详情。");
  const verificationStatus = sanitizeWorkchainUserText(summary.verification_status, "", 260);
  const reviewLines = [
    ...narrativeList(summary.acceptance, 4, "验收结论已整理，技术细节已放入技术详情。").map(item => `验收：${item}`),
    ...narrativeList(summary.independent_review || summary.independentReview, 4, "复核结论已整理，技术细节已放入技术详情。").map(item => `复核：${item}`),
    ...narrativeList(summary.post_review_spot_check_summary?.rows || summary.postReviewSpotCheckSummary?.rows, 3, "完成前抽查结论已整理。").map(item => `抽查：${item}`),
  ];
  const riskLines = narrativeList(summary.risks, 5, "风险信息已整理，技术细节已放入技术详情。");
  const riskStatus = sanitizeWorkchainUserText(summary.risk_status, "", 260);
  const qualityFollowup = summary.quality_followup || summary.qualityFollowup || null;
  const qualityMissing = qualityFollowup ? narrativeList(qualityFollowup.missing, 5, "交付总结缺少必要内容。") : [];
  const qualityHeadline = qualityFollowup ? sanitizeWorkchainUserText(qualityFollowup.headline, "", 320) : "";
  const nextAction = sanitizeWorkchainUserText(summary.next_action, "", 260);
  const lines = [generic ? headline : original];
  if (shouldShape && evidenceLines.length) lines.push(`处理总结：\n- ${evidenceLines.join("\n- ")}`);
  else if (shouldShape && quality.required) lines.push(quality.passed === false
    ? "处理总结：本轮已有处理记录，但还缺少可验收的交付证据。"
    : "处理总结：处理结果已整理，但没有更多可展示的业务证据。");
  if (shouldShape && qualityMissing.length) {
    lines.push(`还需补齐：\n- ${qualityMissing.join("\n- ")}${qualityHeadline ? `\n${qualityHeadline}` : ""}`);
  }
  if (shouldShape && verificationLines.length) lines.push(`验证与验收：\n- ${verificationLines.join("\n- ")}`);
  else if (shouldShape && verificationStatus) lines.push(`验证与验收：${verificationStatus}`);
  if (shouldShape && reviewLines.length) lines.push(`复核与验收：\n- ${reviewLines.slice(0, 6).join("\n- ")}`);
  if (shouldShape && riskLines.length) lines.push(`需要留意：\n- ${riskLines.join("\n- ")}`);
  else if (shouldShape && riskStatus) lines.push(`需要留意：${riskStatus}`);
  if (shouldShape && nextAction) lines.push(`下一步：${nextAction}`);
  return lines.filter(Boolean).join("\n\n");
}

export function runMainAgentWorkchainSelfTest() {
  const simple = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "已完成。", traceId: "trace-1", runId: "run-1" });
  const group = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    summary: {
      actual_file_changes: [{ path: "src/app.ts" }],
      verification_executed: ["npm test"],
      receipt_count: 2,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review_gate: {
        evidence: [{
          reviewer: "test-agent",
          reviewSubject: "web-app",
          verdict: "passed",
          summary: "TestAgent 已复核交付证据并给出可以接受的结论。",
        }],
      },
    },
    technical: { blockers: ["trace_id=hidden"], execution_ids: ["exec-1"] },
    traceId: "trace-2",
    taskId: "task-1",
  });
  const failedReview = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test 未通过"],
      receipt_count: 2,
      acceptance_gate_passed: false,
      independent_review_required: true,
      independent_review_gate_passed: false,
      independent_review_gate: {
        required: true,
        status: "failed",
        failed_count: 1,
        failed_evidence: [{
          reviewer: "test-agent",
          reviewSubject: "web-app",
          verdict: "failed",
          summary: "登录恢复验证仍未通过。",
          evidence: ["npm test 未通过"],
        }],
      },
    },
  });
  const failedTestAgentSummary = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "failed",
        recommendation: "rework",
        failureSummary: [{
          type: "browser",
          project: "web-app",
          title: "登录恢复浏览器复核",
          status: "failed",
          reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/workchain/screenshots/login.failure.png。",
          nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
          diagnostics: [
            "打开失败截图核对页面是否仍停留在登录态。",
            "检查浏览器网络日志中的 /api/session 请求。",
          ],
        }],
        metadata: {
          artifactFiles: {
            reportMarkdownPath: "C:/tmp/test-agent-artifacts/workchain/report.md",
            manifestPath: "C:/tmp/test-agent-artifacts/workchain/artifact-manifest.json",
          },
        },
      },
    },
  });
  const summaryOnlyTestAgentGap = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/login.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        verdict: {
          schema: "ccm-test-agent-verdict-v1",
          status: "passed",
          recommendation: "accept",
          canAccept: true,
          requiredCheckSummary: {
            total: 1,
            statusCounts: { verified: 0, not_verified: 1, unknown: 0 },
            verified: [],
            notVerified: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
            unknown: [],
          },
          acceptanceSummary: {
            total: 1,
            statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
            matchStrengthCounts: { direct: 1, token: 0, fallback: 0, none: 0 },
            evidenceSourceCounts: { matched_evidence: 1, single_criterion_report_status: 0, none: 0 },
            verified: [{ criterion: "登录恢复可用", status: "verified", evidence: ["浏览器断言通过"], matchStrength: "direct", evidenceSource: "matched_evidence" }],
            notVerified: [],
            unknown: [],
          },
        },
      },
    },
  });
  const weakTestAgentAcceptanceSummary = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        verdict: {
          schema: "ccm-test-agent-verdict-v1",
          status: "passed",
          recommendation: "accept",
          canAccept: true,
          requiredCheckSummary: {
            total: 1,
            statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
            verified: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
            notVerified: [],
            unknown: [],
          },
          acceptanceSummary: {
            total: 1,
            statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
            matchStrengthCounts: { direct: 0, token: 0, fallback: 1, none: 0 },
            evidenceSourceCounts: { matched_evidence: 0, single_criterion_report_status: 1, none: 0 },
            verified: [{
              criterion: "登录恢复需要真实浏览器证据",
              status: "verified",
              evidence: ["整体报告通过"],
              matchStrength: "fallback",
              evidenceSource: "single_criterion_report_status",
            }],
            notVerified: [],
            unknown: [],
          },
        },
      },
    },
  });
  const failedBrowserFlowSummary = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/settings.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        browserFlowSummary: {
          total: 2,
          statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
          flowTypeCount: 1,
          criteriaCount: 2,
          actionCount: 4,
          assertionCount: 5,
          failedStepCount: 1,
          items: [{
            flowType: "acceptance_popup_flow",
            total: 2,
            statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
            criteria: ["打开设置弹窗后可以保存"],
            failedStepCount: 1,
            failures: [{ project: "web", name: "设置弹窗", status: "failed", failedSteps: ["raw locator"] }],
          }],
        },
      },
    },
  });
  const failedMultiSessionBrowserSummary = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/collaboration.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        browserMultiSessionSummary: {
          total: 2,
          statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
          sessionCount: 4,
          uniqueSessionCount: 4,
          sessionNames: ["sender", "receiver", "author", "observer"],
          parallelGroupCount: 2,
          comparisonCount: 2,
          failedComparisonCount: 1,
          actionCount: 7,
          assertionCount: 8,
          failedStepCount: 1,
          items: [{
            check: "作者更新后观察方同步刷新",
            status: "failed",
            sessionNames: ["author", "observer"],
            failedSessionNames: ["observer"],
            failedComparisonCount: 1,
            failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
          }],
        },
      },
    },
  });
  const failedBrowserAuthenticationSummary = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      independent_review_required: true,
      independent_review_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        metadata: {
          browserAuthenticationSummary: {
            configuredChecks: 2,
            passedChecks: 1,
            failedChecks: 1,
            blockedChecks: 0,
            authenticatedSessions: 2,
            credentialEnvNames: ["PRIVATE_LOGIN_EMAIL", "PRIVATE_LOGIN_PASSWORD"],
            storageStateCount: 2,
            sensitiveArtifactSuppressionCount: 2,
          },
        },
      },
    },
  });
  const blockedBrowserAuthenticationSummary = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      independent_review_required: true,
      independent_review_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        metadata: {
          browserAuthenticationSummary: {
            configuredChecks: 1,
            passedChecks: 0,
            failedChecks: 0,
            blockedChecks: 1,
            authenticatedSessions: 0,
            credentialEnvNames: ["PRIVATE_LOGIN_EMAIL", "PRIVATE_LOGIN_PASSWORD"],
            storageStateCount: 1,
            sensitiveArtifactSuppressionCount: 1,
          },
        },
      },
    },
  });
  const failedActionEffectAndAdversarialSummary = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/settings.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      independent_review_required: true,
      independent_review_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        verdict: {
          schema: "ccm-test-agent-verdict-v1",
          status: "passed",
          recommendation: "accept",
          canAccept: true,
        },
        browserActionEffectSummary: {
          checks: 1,
          actions: 1,
          changed: 0,
          unchanged: 1,
          unavailable: 0,
          failed: 1,
          detailSuppressed: 0,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
          items: [{
            project: "web",
            name: "保存设置",
            provider: "playwright",
            status: "failed",
            actions: 1,
            changed: 0,
            unchanged: 1,
            unavailable: 0,
            failed: 1,
            detailSuppressed: 0,
            crossSession: 0,
            actionTypes: { click: 1 },
            changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
          }],
        },
        adversarialEvidenceSummary: {
          required: true,
          waived: false,
          status: "failed",
          total: 1,
          passed: 0,
          failed: 1,
          blocked: 0,
          skipped: 0,
          http: 0,
          browser: 1,
          relevant: 1,
          unlinked: 0,
          passedRelevant: 0,
          goalLinked: 1,
          criteriaCovered: ["重复保存不能产生重复记录"],
          probeTypes: ["duplicate_submit"],
          items: [{
            project: "web",
            surface: "browser",
            name: "重复保存设置",
            target: "http://127.0.0.1:5173/settings?token=hidden",
            status: "failed",
            probeType: "duplicate_submit",
            provider: "playwright",
            relevance: "explicit",
            linkedCriteria: ["重复保存不能产生重复记录"],
            goalLinked: true,
            matchScore: 100,
          }],
        },
      },
    },
  });
  const needsRecheckLatestEvidenceSummary = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
      independent_review_required: true,
      independent_review_gate_passed: true,
      test_agent_report: {
        schema: "ccm-test-agent-report-v1",
        status: "passed",
        recommendation: "accept",
        verdict: {
          schema: "ccm-test-agent-verdict-v1",
          status: "passed",
          recommendation: "accept",
          canAccept: true,
        },
        browserActionEffectSummary: {
          checks: 1,
          actions: 1,
          changed: 0,
          unchanged: 0,
          unavailable: 1,
          failed: 1,
          detailSuppressed: 1,
          crossSession: 0,
          actionTypes: { click: 1 },
          changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
          items: [{
            project: "web",
            name: "提交登录表单",
            provider: "playwright",
            status: "blocked",
            actions: 1,
            changed: 0,
            unchanged: 0,
            unavailable: 1,
            failed: 1,
            detailSuppressed: 1,
            crossSession: 0,
            actionTypes: { click: 1 },
            changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
          }],
        },
        browserRecoverySummary: {
          checks: 1,
          attempted: 1,
          recovered: 0,
          failed: 0,
          notRetried: 1,
          items: [{
            project: "web",
            name: "提交登录表单",
            provider: "playwright",
            status: "blocked",
            attempted: 1,
            recovered: 0,
            failed: 0,
            notRetried: 1,
            events: [{ reason: "unsafe duplicate side effect", sessionId: "hidden-session" }],
          }],
        },
        adversarialEvidenceSummary: {
          required: true,
          waived: false,
          status: "missing",
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          http: 0,
          browser: 0,
          relevant: 0,
          unlinked: 0,
          passedRelevant: 0,
          goalLinked: 0,
          criteriaCovered: [],
          probeTypes: [],
          items: [],
        },
      },
    },
  });
  const passedPostReviewSpotCheck = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      receipt_count: 2,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review_gate: {
        required: true,
        pass: true,
        status: "passed",
        evidence: [{ reviewer: "test-agent", verdict: "passed", summary: "TestAgent 已通过独立复核。" }],
      },
      post_review_spot_check_required: true,
      post_review_spot_check_gate_passed: true,
      post_review_spot_check_gate: {
        required: true,
        pass: true,
        status: "passed",
        reason: "TestAgent 通过后，我已完成关键验证抽查",
      },
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: true,
        status: "passed",
        executed_count: 2,
        passed_count: 2,
        mismatch_count: 0,
        headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
        next_action: "继续完成最终验收。",
      },
      post_review_spot_check_summary: {
        schema: "ccm-main-agent-post-review-spot-check-summary-v1",
        title: "完成前抽查",
        status: "passed",
        status_label: "已通过",
        headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
        rows: ["已抽查 2 项验证，2 项结果一致"],
        next_action: "继续完成最终验收。",
      },
    },
  });
  const failedPostReviewSpotCheck = buildMainAgentWorkchain({
    surface: "global",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/session.ts" }],
      verification_executed: ["npm test"],
      receipt_count: 2,
      acceptance_gate_passed: true,
      acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
      independent_review_required: true,
      independent_review_gate_passed: true,
      independent_review_gate: {
        required: true,
        pass: true,
        status: "passed",
        evidence: [{ reviewer: "test-agent", verdict: "passed", summary: "TestAgent 已通过独立复核。" }],
      },
      post_review_spot_check_required: true,
      post_review_spot_check_gate_passed: false,
      post_review_spot_check_gate: {
        required: true,
        pass: false,
        status: "needs_recheck",
        reason: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
      },
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: false,
        status: "needs_recheck",
        executed_count: 2,
        passed_count: 1,
        mismatch_count: 1,
        headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
        next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
      },
      post_review_spot_check_summary: {
        schema: "ccm-main-agent-post-review-spot-check-summary-v1",
        title: "完成前抽查",
        status: "needs_recheck",
        status_label: "需复验",
        headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
        rows: ["已抽查 2 项验证，1 项结果一致，1 项不一致"],
        next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
      },
    },
  });
  const reply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: group, includeDetails: true });
  const shapedReply = formatMainAgentCompletionReply({ reply: "任务已建立", workchain: group, includeDetails: false });
  const ordinary = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "知识库压缩会按时间和主题整理。", traceId: "trace-3" });
  const ordinaryWithSyntheticEvidence = {
    ...ordinary,
    completion_summary: {
      ...(ordinary.completion_summary || {}),
      evidence: ["不应展示的内部处理记录"],
      verification: ["不应展示的内部验证记录"],
    },
  };
  const ordinaryReply = formatMainAgentCompletionReply({ reply: "知识库压缩会按时间和主题整理。", workchain: ordinary, includeDetails: false });
  const ordinarySyntheticEvidenceReply = formatMainAgentCompletionReply({ reply: "你好啊！我在呢。", workchain: ordinaryWithSyntheticEvidence, includeDetails: false });
  const runningTodo = buildMainAgentWorkchain({
    surface: "group",
    status: "running",
    mode: "delegation",
    steps: [
      { id: "read", content: "读取代码上下文", activeForm: "正在读取代码上下文", status: "completed" },
      { id: "edit", content: "修改页面逻辑", activeForm: "正在修改页面逻辑", status: "in_progress" },
      { id: "verify", content: "运行验证", activeForm: "正在运行验证", status: "pending" },
    ],
    summary: { actual_file_changes: [{ path: "src/app.ts" }] },
  });
  const missingVerificationTodo = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    steps: [
      { id: "read", content: "读取代码上下文", activeForm: "正在读取代码上下文", status: "completed" },
      { id: "edit", content: "修改页面逻辑", activeForm: "正在修改页面逻辑", status: "completed" },
      { id: "summarize", content: "整理改动说明", activeForm: "正在整理改动说明", status: "completed" },
    ],
    summary: { actual_file_changes: [{ path: "src/app.ts" }] },
  });
  const incompleteQuality = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    actionIds: ["dispatch_child_agent"],
    userText: "任务已处理。",
  });
  const incompleteQualityReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: incompleteQuality, includeDetails: true });
  const weakAcceptanceOnly = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "已完成。",
    summary: {
      actual_file_changes: [{ path: "src/Settings.vue" }],
      acceptance_gate_passed: true,
    },
  });
  const weakAcceptanceOnlyReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: weakAcceptanceOnly, includeDetails: true });
  const protocolLeak = buildMainAgentWorkchain({
    surface: "group",
    status: "completed",
    mode: "delegation",
    userText: "CCM_AGENT_RECEIPT done raw payload trace_id=abc",
    completion: {
      evidence: ["CCM_AGENT_RECEIPT done raw payload trace_id=abc"],
      verification: ["trace_id raw payload"],
      next_action: "继续查看 raw payload trace_id",
    },
    summary: {
      actual_file_changes: [{ path: "src/app.ts" }],
      verification_executed: ["npm test"],
      acceptance_gate_passed: true,
    },
    rawEvents: [{ type: "child_agent_receipt", status: "ok", message: "CCM_AGENT_RECEIPT raw payload trace_id=abc" }],
  });
  const protocolLeakReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: protocolLeak, includeDetails: true });
  const legacySummaryReply = formatMainAgentCompletionReply({
    reply: "已完成。",
    includeDetails: true,
    workchain: {
      completion_summary: {
        headline: "CCM_AGENT_RECEIPT done raw payload trace_id=legacy",
        evidence: ["raw payload trace_id=legacy", "src/app.ts"],
        verification: ["session_id=legacy npm test"],
        acceptance: ["CCM_AGENT_RECEIPT done"],
        independent_review: ["task-notification raw payload"],
        risks: ["execution_lease blocked"],
        next_action: "查看 raw payload trace_id",
        final_summary_quality: { required: true },
      },
    },
  });
  const rawLeakQuality = buildFinalSummaryQuality({
    surface: "group",
    status: "completed",
    mode: "delegation",
  }, {
    files: [],
    verification: ["npm test"],
    acceptance: [],
    independentReview: [],
    receipts: 0,
    workersDone: 1,
    evidence: ["trace_id raw payload should fail"],
    risks: [],
  } as any, true, "已完成", "继续");
  const protectedFailureCopy = sanitizeWorkchainUserText("CCM_AGENT_RECEIPT failed raw payload trace_id=hidden denied");
  const testAgentFailureFallbackCopy = sanitizeTestAgentFailureText(null);
  const checks = {
    protectedFailureCopyUsesInvestigationLanguage: protectedFailureCopy.includes("我会继续排查")
      && protectedFailureCopy.includes("技术详情")
      && !protectedFailureCopy.includes("需要处理")
      && !INTERNAL_TEXT_PATTERN.test(protectedFailureCopy),
    testAgentFailureFallbackUsesGapLanguage: testAgentFailureFallbackCopy.includes("待补齐")
      && !testAgentFailureFallbackCopy.includes("需要处理"),
    simpleHasSummary: simple.user_visible_text.includes("回复已整理给你"),
    groupEvidenceVisible: group.completion_summary.evidence.length >= 5,
    groupCompletionSummaryIncludesReviewEvidence: group.completion_summary.acceptance?.some((item: string) => item.includes("最终验收已通过"))
      && group.completion_summary.independent_review?.some((item: string) => item.includes("test-agent"))
      && group.completion_summary.evidence?.some((item: string) => item.includes("独立复核")),
    finalSummaryQualityRequired: group.completion_summary.final_summary_quality?.required === true && group.completion_summary.final_summary_quality?.passed === true,
    passedPostReviewSpotCheckAllowsCompletion: passedPostReviewSpotCheck.completion_summary.final_summary_quality?.passed === true
      && passedPostReviewSpotCheck.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "post_review_spot_check" && item.passed === true)
      && passedPostReviewSpotCheck.completion_summary.post_review_spot_check_gate_passed === true
      && passedPostReviewSpotCheck.completion_summary.post_review_spot_check_summary?.rows?.some((item: string) => item.includes("2 项结果一致"))
      && !passedPostReviewSpotCheck.user_visible_text.includes("主 Agent"),
    failedPostReviewSpotCheckBlocksFalseCompletion: failedPostReviewSpotCheck.completion_summary.final_summary_quality?.passed === false
      && failedPostReviewSpotCheck.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "post_review_spot_check" && item.passed === false)
      && failedPostReviewSpotCheck.completion_summary.post_review_spot_check_gate_passed === false
      && failedPostReviewSpotCheck.user_visible_text.includes("不能算完成")
      && failedPostReviewSpotCheck.user_visible_text.includes("完成前抽查")
      && failedPostReviewSpotCheck.completion_summary.next_action?.includes("沿用原复核工作单重新运行 TestAgent")
      && failedPostReviewSpotCheck.todo_plan?.quality_followup_required === true
      && failedPostReviewSpotCheck.todo_plan?.current_step?.id === "quality-followup"
      && !/^已完成/.test(failedPostReviewSpotCheck.user_visible_text || "")
      && !failedPostReviewSpotCheck.user_visible_text.includes("主 Agent"),
    failedReviewBlocksFalseCompletion: failedReview.completion_summary.final_summary_quality?.passed === false
      && failedReview.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "independent_review" && item.passed === false)
      && failedReview.user_visible_text.includes("不能算完成")
      && failedReview.user_visible_text.includes("复核未通过")
      && !/^已完成/.test(failedReview.user_visible_text || ""),
    failedReviewShowsReworkNextAction: failedReview.completion_summary.independent_review?.some((item: string) => item.includes("需要原实现成员返工"))
      && failedReview.completion_summary.quality_followup?.next_action?.includes("重新运行 TestAgent")
      && failedReview.completion_summary.next_action?.includes("重新运行 TestAgent"),
    failedReviewKeepsTodoActive: failedReview.todo_plan?.quality_followup_required === true
      && failedReview.todo_plan?.current_step?.id === "quality-followup"
      && failedReview.todo_plan?.current_step?.activeForm?.includes("独立复核"),
    testAgentFailureSummaryBlocksFalseCompletion: failedTestAgentSummary.completion_summary.final_summary_quality?.passed === false
      && failedTestAgentSummary.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "independent_review" && item.passed === false)
      && failedTestAgentSummary.user_visible_text.includes("TestAgent 复核未通过")
      && failedTestAgentSummary.user_visible_text.includes("登录恢复浏览器复核")
      && failedTestAgentSummary.completion_summary.independent_review?.some((item: string) => item.includes("返工重点") && item.includes("浏览器检查"))
      && failedTestAgentSummary.completion_summary.independent_review?.some((item: string) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
      && failedTestAgentSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
      && failedTestAgentSummary.todo_plan?.quality_followup_required === true
      && !/^已完成/.test(failedTestAgentSummary.user_visible_text || "")
      && !/test-agent-artifacts|artifact-manifest|report\.md|C:\/tmp|ccm-test-agent-report-v1/i.test(JSON.stringify({
        text: failedTestAgentSummary.user_visible_text,
        review: failedTestAgentSummary.completion_summary.independent_review,
        next: failedTestAgentSummary.completion_summary.next_action,
      })),
    testAgentSummaryOnlyCoverageGapBlocksFalseCompletion: summaryOnlyTestAgentGap.completion_summary.final_summary_quality?.passed === false
      && summaryOnlyTestAgentGap.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "independent_review" && item.passed === false)
      && summaryOnlyTestAgentGap.user_visible_text.includes("TestAgent 复核未通过")
      && summaryOnlyTestAgentGap.user_visible_text.includes("必检项：浏览器流程未覆盖")
      && summaryOnlyTestAgentGap.completion_summary.independent_review?.some((item: string) => item.includes("返工重点") && item.includes("浏览器流程未覆盖"))
      && summaryOnlyTestAgentGap.completion_summary.next_action?.includes("重新运行 TestAgent")
      && !/^已完成/.test(summaryOnlyTestAgentGap.user_visible_text || ""),
    testAgentWeakAcceptanceSummaryNeedsConfirmation: weakTestAgentAcceptanceSummary.completion_summary.final_summary_quality?.passed === false
      && weakTestAgentAcceptanceSummary.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "independent_review" && item.passed === false)
      && weakTestAgentAcceptanceSummary.user_visible_text.includes("还需要确认")
      && weakTestAgentAcceptanceSummary.user_visible_text.includes("验收证据待确认")
      && weakTestAgentAcceptanceSummary.completion_summary.independent_review?.some((item: string) => item.includes("证据强度") && item.includes("整体复核结果推断"))
      && weakTestAgentAcceptanceSummary.completion_summary.next_action?.includes("确认或补齐证据")
      && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify({
        text: weakTestAgentAcceptanceSummary.user_visible_text,
        review: weakTestAgentAcceptanceSummary.completion_summary.independent_review,
        next: weakTestAgentAcceptanceSummary.completion_summary.next_action,
      })),
    testAgentFailedBrowserFlowBlocksFalseCompletion: failedBrowserFlowSummary.completion_summary.final_summary_quality?.passed === false
      && failedBrowserFlowSummary.user_visible_text.includes("TestAgent 真实浏览器验收未通过")
      && failedBrowserFlowSummary.completion_summary.independent_review?.some((item: string) => item.includes("真实浏览器验收") && item.includes("1 个未通过"))
      && failedBrowserFlowSummary.completion_summary.independent_review?.some((item: string) => item.includes("弹窗流程") && item.includes("未通过"))
      && !/acceptance_popup_flow|raw locator|ccm-test-agent/i.test(JSON.stringify({
        text: failedBrowserFlowSummary.user_visible_text,
        review: failedBrowserFlowSummary.completion_summary.independent_review,
      })),
    testAgentFailedMultiSessionBrowserBlocksFalseCompletion: failedMultiSessionBrowserSummary.completion_summary.final_summary_quality?.passed === false
      && failedMultiSessionBrowserSummary.user_visible_text.includes("TestAgent 多人协作浏览器验收未通过")
      && failedMultiSessionBrowserSummary.completion_summary.independent_review?.some((item: string) => item.includes("多人协作浏览器验收") && item.includes("1 个未通过"))
      && failedMultiSessionBrowserSummary.completion_summary.independent_review?.some((item: string) => item.includes("观察方") && item.includes("未通过"))
      && failedMultiSessionBrowserSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
      && !/^已完成/.test(failedMultiSessionBrowserSummary.user_visible_text || "")
      && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|ccm-test-agent/i.test(JSON.stringify({
        text: failedMultiSessionBrowserSummary.user_visible_text,
        review: failedMultiSessionBrowserSummary.completion_summary.independent_review,
        next: failedMultiSessionBrowserSummary.completion_summary.next_action,
      })),
    testAgentFailedAuthenticationBlocksLegacyPass: failedBrowserAuthenticationSummary.completion_summary.final_summary_quality?.passed === false
      && failedBrowserAuthenticationSummary.user_visible_text.includes("TestAgent 登录态浏览器验收未通过")
      && failedBrowserAuthenticationSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("登录态浏览器验收") && item.includes("1 项未通过")
      )
      && failedBrowserAuthenticationSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
      && failedBrowserAuthenticationSummary.todo_plan?.quality_followup_required === true
      && !/^已完成/.test(failedBrowserAuthenticationSummary.user_visible_text || "")
      && !/PRIVATE_LOGIN_EMAIL|PRIVATE_LOGIN_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
        text: failedBrowserAuthenticationSummary.user_visible_text,
        review: failedBrowserAuthenticationSummary.completion_summary.independent_review,
        next: failedBrowserAuthenticationSummary.completion_summary.next_action,
      })),
    testAgentBlockedAuthenticationNeedsConfirmation: blockedBrowserAuthenticationSummary.completion_summary.final_summary_quality?.passed === false
      && blockedBrowserAuthenticationSummary.user_visible_text.includes("还需要确认")
      && blockedBrowserAuthenticationSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("测试账号或登录条件")
      )
      && blockedBrowserAuthenticationSummary.completion_summary.next_action?.includes("确认")
      && blockedBrowserAuthenticationSummary.todo_plan?.quality_followup_required === true
      && !/^已完成/.test(blockedBrowserAuthenticationSummary.user_visible_text || "")
      && !/PRIVATE_LOGIN_EMAIL|PRIVATE_LOGIN_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
        text: blockedBrowserAuthenticationSummary.user_visible_text,
        review: blockedBrowserAuthenticationSummary.completion_summary.independent_review,
        next: blockedBrowserAuthenticationSummary.completion_summary.next_action,
      })),
    testAgentFailedActionEffectAndAdversarialEvidenceBlockLegacyPass: failedActionEffectAndAdversarialSummary.completion_summary.final_summary_quality?.passed === false
      && failedActionEffectAndAdversarialSummary.user_visible_text.includes("TestAgent 操作结果验证未通过")
      && failedActionEffectAndAdversarialSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("操作结果验证") && item.includes("没有产生可见效果")
      )
      && failedActionEffectAndAdversarialSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("边界与异常验证") && item.includes("未通过")
      )
      && failedActionEffectAndAdversarialSummary.completion_summary.next_action?.includes("原实现成员修复")
      && !/^已完成/.test(failedActionEffectAndAdversarialSummary.user_visible_text || "")
      && !/127\.0\.0\.1|token=hidden|duplicate_submit|playwright|changedSignals/i.test(JSON.stringify({
        text: failedActionEffectAndAdversarialSummary.user_visible_text,
        review: failedActionEffectAndAdversarialSummary.completion_summary.independent_review,
        next: failedActionEffectAndAdversarialSummary.completion_summary.next_action,
      })),
    testAgentIncompleteLatestEvidenceRequiresRecheckWithoutImplementationRework: needsRecheckLatestEvidenceSummary.completion_summary.final_summary_quality?.passed === false
      && needsRecheckLatestEvidenceSummary.user_visible_text.includes("TestAgent 复核需要重新验证")
      && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("暂时无法确认页面效果")
      )
      && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("不代表实现失败")
      )
      && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item: string) =>
        item.includes("TestAgent 工作单")
      )
      && needsRecheckLatestEvidenceSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
      && needsRecheckLatestEvidenceSummary.completion_summary.next_action?.includes("不要直接要求原实现成员返工")
      && needsRecheckLatestEvidenceSummary.todo_plan?.quality_followup_required === true
      && !/^已完成/.test(needsRecheckLatestEvidenceSummary.user_visible_text || "")
      && !/hidden-session|unsafe duplicate side effect|sessionId|actionTypes|changedSignals|playwright/i.test(JSON.stringify({
        text: needsRecheckLatestEvidenceSummary.user_visible_text,
        review: needsRecheckLatestEvidenceSummary.completion_summary.independent_review,
        next: needsRecheckLatestEvidenceSummary.completion_summary.next_action,
      })),
    workchainQualityRequiresProtocolSanitizer: group.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === true)
      && protocolLeak.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === true),
    workchainVisibleProtocolLeakSanitized: !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(protocolLeak.user_visible_text)
      && !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(protocolLeakReply)
      && !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(collectWorkchainVisibleQualityText([
        protocolLeak.completion_summary.evidence,
        protocolLeak.completion_summary.verification,
        protocolLeak.completion_summary.risks,
        protocolLeak.completion_summary.next_action,
        protocolLeak.todo_plan?.visible_steps || [],
        protocolLeak.progress_checkpoints?.items || [],
      ]).join("\n")),
    legacyCompletionReplySanitizesVisibleSummary: !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(legacySummaryReply)
      && legacySummaryReply.includes("处理总结")
      && legacySummaryReply.includes("技术详情")
      && legacySummaryReply.includes("src/app.ts"),
    workchainQualityGateCatchesRawVisibleProtocol: rawLeakQuality.passed === false
      && rawLeakQuality.checks?.some((item: any) => item.id === "user_visible_protocol_sanitized" && item.passed === false),
    technicalCollapsedPolicy: group.display_policy.technical_default_collapsed === true,
    noInternalLeakInUserText: !INTERNAL_TEXT_PATTERN.test(group.user_visible_text),
    replyHasSummary: reply.includes("处理总结") && reply.includes("修改文件"),
    shapedReplyAddsRequiredSections: shapedReply.includes("处理总结") && shapedReply.includes("验证与验收") && shapedReply.includes("需要留意") && shapedReply.includes("下一步"),
    shapedReplyIncludesReviewAndAcceptance: shapedReply.includes("复核与验收") && shapedReply.includes("test-agent") && shapedReply.includes("最终验收已通过"),
    shapedReplyHidesTechnicalBlockers: !INTERNAL_TEXT_PATTERN.test(shapedReply) && shapedReply.includes("排障信息已放入技术详情"),
    ordinaryReplyStaysPlain: ordinaryReply === "知识库压缩会按时间和主题整理。" && !ordinaryReply.includes("处理总结"),
    ordinarySyntheticEvidenceStillStaysPlain: ordinarySyntheticEvidenceReply === "你好啊！我在呢。" && !ordinarySyntheticEvidenceReply.includes("处理总结"),
    ordinaryTodoHiddenByPolicy: ordinary.todo_plan?.display_policy?.hide_for_ordinary_conversation === true,
    workchainTodoPlanCarriesCcStyleForms: group.todo_plan?.schema === "ccm-main-agent-workchain-todo-v1"
      && group.todo_plan?.steps?.length >= 5
      && group.todo_plan.steps.every((step: any) => step.content && step.activeForm && step.active_form)
      && group.todo_plan.display_policy?.quiet_completed === true
      && group.todo_plan.display_policy?.archive_completed_todo === true
      && group.todo_plan.visible_steps?.length === 0
      && group.todo_plan.archive_summary?.includes("主视图只保留最终总结"),
    workchainTodoPlanHasSingleActiveStep: runningTodo.todo_plan?.steps?.filter((step: any) => step.status === "in_progress").length === 1
      && runningTodo.todo_plan?.current_step?.id === "edit",
    workchainTodoVerificationNudge: missingVerificationTodo.todo_plan?.verification_reminder?.schema === "ccm-main-agent-plan-verification-reminder-v1"
      && missingVerificationTodo.todo_plan?.verification_nudge === true
      && missingVerificationTodo.todo_plan?.verification_reminder?.headline.includes("专门的验证/验收步骤")
      && missingVerificationTodo.todo_plan?.display_policy?.archive_completed_todo === false,
    workchainQualityFailureCreatesUserFollowup: incompleteQuality.completion_summary.final_summary_quality?.passed === false
      && incompleteQuality.completion_summary.quality_followup?.schema === "ccm-main-agent-quality-followup-v1"
      && incompleteQuality.completion_summary.quality_followup?.missing?.includes("交付证据")
      && incompleteQuality.completion_summary.next_action?.includes("先补齐交付证据"),
    workchainQualityFailureUserTextAvoidsFalseDone: incompleteQuality.user_visible_text?.includes("最终交付总结还在补齐")
      && incompleteQuality.completion_summary.headline?.includes("最终交付总结还在补齐")
      && !/^任务已处理。?$/.test(incompleteQuality.user_visible_text || "")
      && incompleteQualityReply.startsWith("任务已有处理结果，但最终交付总结还在补齐"),
    workchainQualityFailureKeepsTodoActive: incompleteQuality.todo_plan?.quality_followup_required === true
      && incompleteQuality.todo_plan?.current_step?.id === "quality-followup"
      && incompleteQuality.todo_plan?.current_step?.activeForm?.includes("正在补齐交付证据")
      && incompleteQuality.todo_plan?.display_policy?.archive_completed_todo === false
      && incompleteQuality.progress_checkpoints?.items?.some((item: any) => item.id === "quality-followup-checkpoint" && item.status === "active"),
    workchainQualityFailureReplyShowsMissingItems: incompleteQualityReply.includes("还需补齐")
      && incompleteQualityReply.includes("交付证据")
      && incompleteQualityReply.includes("先补齐交付证据"),
    workchainGenericCompletionFallbackAvoidsFalseDone: simple.user_visible_text === "回复已整理给你。"
      && !simple.user_visible_text.includes("已完成本轮处理")
      && !incompleteQualityReply.includes("我已完成本轮处理"),
    workchainWeakAcceptanceOnlyBlocksFalseCompletion: weakAcceptanceOnly.completion_summary.final_summary_quality?.passed === false
      && weakAcceptanceOnly.completion_summary.final_summary_quality?.checks?.some((item: any) => item.id === "verification" && item.passed === false)
      && weakAcceptanceOnly.completion_summary.verification_status?.includes("没有捕获到实际验证")
      && weakAcceptanceOnly.completion_summary.quality_followup?.missing?.includes("验证或验收")
      && weakAcceptanceOnly.completion_summary.next_action?.includes("先补齐验证或验收")
      && weakAcceptanceOnly.todo_plan?.quality_followup_required === true
      && weakAcceptanceOnly.todo_plan?.current_step?.id === "quality-followup"
      && weakAcceptanceOnly.user_visible_text?.includes("最终交付总结还在补齐")
      && !/^已完成/.test(weakAcceptanceOnly.user_visible_text || "")
      && weakAcceptanceOnlyReply.includes("还需补齐")
      && weakAcceptanceOnlyReply.includes("验证或验收"),
    traceInTechnical: group.technical_details.some(section => section.items.some((item: any) => item.label === "Trace" && item.value === "trace-2")),
    progressCheckpointsVisible: group.progress_checkpoints?.schema === "ccm-main-agent-progress-checkpoints-v1" && group.progress_checkpoints.items.length > 0,
    progressCheckpointsHideRawProtocol: !INTERNAL_TEXT_PATTERN.test(JSON.stringify(group.progress_checkpoints.items)),
  };
  return { pass: Object.values(checks).every(Boolean), checks, simple, group, failedTestAgentSummary, summaryOnlyTestAgentGap, weakTestAgentAcceptanceSummary, passedPostReviewSpotCheck, failedPostReviewSpotCheck, reply, shapedReply, ordinaryReply, runningTodo, missingVerificationTodo, incompleteQuality, incompleteQualityReply, protocolLeak, protocolLeakReply, legacySummaryReply, rawLeakQuality };
}


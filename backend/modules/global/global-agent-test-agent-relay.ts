// TestAgent plan and review events projected from a group task into the global run.
export function createGlobalAgentTestAgentRelay(deps: any) {
  const { buildPostReviewSpotCheckSummary, collectGlobalTestAgentCoverageGaps, collectGlobalTestAgentFailureSummaries, globalUniqueStrings, globalVisibleText, summarizeTestAgentAdversarialEvidence, summarizeTestAgentBrowserActionEffects, summarizeTestAgentBrowserAuthentication, summarizeTestAgentBrowserFlows, summarizeTestAgentBrowserRecovery, summarizeTestAgentMultiSessionBrowser } = deps

  function compactGlobalTestAgentExecutionPlanRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
    if (String(event?.type || "") !== "test_agent_execution_plan_ready") return null;
    const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
    if (!plan) return null;
    const rawSummary = event.test_agent_execution_plan_summary || event.testAgentExecutionPlanSummary || event.detail || "";
    const blocked = plan?.valid === false || String(event.status || "").toLowerCase() === "warn";
    const detail = globalVisibleText(
      blocked
        ? "TestAgent 复核计划预检未通过，我会先修复交接信息再执行。"
        : "TestAgent 已生成复核计划，我会按计划启动独立复核。",
      "TestAgent 复核计划已整理。",
      260,
    );
    return {
      type: "test_agent_execution_plan_ready",
      source: "group-main-agent",
      run_id: options.globalRunId || event.run_id || "",
      trace_id: options.traceId || event.trace_id || "",
      status: options.status || "running",
      phase: options.phase || "execute",
      agent: event.agent || "TestAgent",
      taskId: event.taskId || event.task_id || "",
      task_id: event.task_id || event.taskId || "",
      detail,
      testAgentExecutionPlan: plan,
      test_agent_execution_plan: plan,
      testAgentExecutionPlanSummary: rawSummary,
      test_agent_execution_plan_summary: rawSummary,
      technical: {
        test_agent_execution_plan: plan,
        test_agent_plan_dispatch: event.technical?.test_agent_plan_dispatch || event.technical?.testAgentPlanDispatch || null,
        group_task_id: event.task_id || event.taskId || "",
      },
    };
  }
  
  function compactGlobalTestAgentReviewRelayEvent(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string } = {}) {
    if (String(event?.type || "") !== "test_agent_review_ready" && String(event?.type || "") !== "agent_done") return null;
    const receipt = event.receipt || event.testAgentReceipt || event.test_agent_receipt || event.data?.receipt || null;
    const report = event.test_agent_report || event.testAgentReport || receipt?.testAgentReport || receipt?.test_agent_report || null;
    if (!receipt && !report && !/TestAgent\s*独立复核完成|TestAgent.+复核/i.test(String(event.text || event.detail || ""))) return null;
    const verdict = event.test_agent_verdict || event.testAgentVerdict || report?.verdict || receipt?.testAgentVerdict || receipt?.test_agent_verdict || receipt?.testAgentReport?.verdict || receipt?.test_agent_report?.verdict || null;
    const rawStatus = String(verdict?.status || report?.status || receipt?.status || event.status || "").toLowerCase();
    const rawRecommendation = String(verdict?.recommendation || report?.recommendation || receipt?.testAgentReport?.recommendation || "").toLowerCase();
    const postReviewSpotCheck = event.technical?.post_review_spot_check
      || event.post_review_spot_check
      || event.postReviewSpotCheck
      || receipt?.post_review_spot_check
      || receipt?.postReviewSpotCheck
      || null;
    const postReviewSpotCheckSummary = event.post_review_spot_check_summary
      || event.postReviewSpotCheckSummary
      || receipt?.post_review_spot_check_summary
      || receipt?.postReviewSpotCheckSummary
      || buildPostReviewSpotCheckSummary(postReviewSpotCheck);
    const spotCheckRequired = postReviewSpotCheck?.required === true;
    const spotCheckPassed = !spotCheckRequired || postReviewSpotCheck?.pass === true || postReviewSpotCheck?.status === "passed";
    const spotCheckNeedsUser = spotCheckRequired && !spotCheckPassed && /needs[_-]?user|manual|待确认|人工/i.test(String(postReviewSpotCheck?.status || postReviewSpotCheckSummary?.status || ""));
    const spotCheckNeedsRecheck = spotCheckRequired && !spotCheckPassed && !spotCheckNeedsUser;
    const coverageGaps = collectGlobalTestAgentCoverageGaps(report, verdict);
    const hasFailedCoverage = coverageGaps.failedLines.length > 0;
    const hasUnknownCoverage = coverageGaps.unknownLines.length > 0;
    const hasWeakAcceptance = coverageGaps.weakLines.length > 0;
    const browserFlows = summarizeTestAgentBrowserFlows(report, verdict);
    const hasFailedBrowserFlows = !!browserFlows?.failedCount || !!browserFlows?.failedStepCount;
    const hasIncompleteBrowserFlows = !!browserFlows?.blockedCount || !!browserFlows?.skippedCount;
    const multiSessionBrowser = summarizeTestAgentMultiSessionBrowser(report, verdict);
    const hasFailedMultiSessionBrowser = !!multiSessionBrowser?.failedCount
      || !!multiSessionBrowser?.failedStepCount
      || !!multiSessionBrowser?.failedComparisonCount;
    const hasIncompleteMultiSessionBrowser = !!multiSessionBrowser?.blockedCount || !!multiSessionBrowser?.skippedCount;
    const browserAuthentication = summarizeTestAgentBrowserAuthentication(report, verdict);
    const hasFailedBrowserAuthentication = !!browserAuthentication?.failedChecks;
    const hasIncompleteBrowserAuthentication = !!browserAuthentication?.blockedChecks || !!browserAuthentication?.pendingChecks;
    const browserActionEffects = summarizeTestAgentBrowserActionEffects(report, verdict);
    const hasFailedBrowserActionEffects = !!browserActionEffects?.unchanged;
    const hasIncompleteBrowserActionEffects = !!browserActionEffects?.unavailable;
    const browserRecovery = summarizeTestAgentBrowserRecovery(report, verdict);
    const hasIncompleteBrowserRecovery = !!browserRecovery?.failed || !!browserRecovery?.notRetried;
    const adversarialEvidence = summarizeTestAgentAdversarialEvidence(report, verdict);
    const hasFailedAdversarialEvidence = adversarialEvidence?.status === "failed";
    const hasIncompleteAdversarialEvidence = adversarialEvidence?.status === "missing"
      || adversarialEvidence?.status === "unlinked";
    const hasBlockedAdversarialEvidence = adversarialEvidence?.status === "blocked";
    const failureSummaries = collectGlobalTestAgentFailureSummaries(report, verdict);
    const receiptBlockers = Array.isArray(receipt?.blockers) ? receipt.blockers : [];
    const blockers = globalUniqueStrings(
      receiptBlockers,
      failureSummaries.failureLines,
      browserAuthentication?.failedLines || [],
      browserAuthentication?.incompleteLines || [],
      browserActionEffects?.failedLines || [],
      browserActionEffects?.recheckLines || [],
      browserRecovery?.recheckLines || [],
      adversarialEvidence?.failedLines || [],
      adversarialEvidence?.recheckLines || [],
      adversarialEvidence?.blockedLines || [],
      multiSessionBrowser?.failedLines || [],
      multiSessionBrowser?.incompleteLines || [],
      browserFlows?.failedLines || [],
      browserFlows?.incompleteLines || [],
      coverageGaps.failedLines,
      coverageGaps.unknownLines,
      coverageGaps.weakLines,
      spotCheckNeedsRecheck || spotCheckNeedsUser ? [postReviewSpotCheckSummary?.headline || "完成前抽查尚未通过"] : []
    );
    const verification = Array.isArray(receipt?.verification) ? receipt.verification : [];
    const {
      summarizeTestAgentBrowserProviderGaps,
      deriveIndependentReviewDecision,
    } = require("../collaboration/test-agent-independent-review-decision");
    const providerGaps = summarizeTestAgentBrowserProviderGaps(report, verdict);
    const forceRework = hasFailedCoverage
      || hasFailedBrowserFlows
      || hasFailedMultiSessionBrowser
      || hasFailedBrowserAuthentication
      || hasFailedBrowserActionEffects
      || hasFailedAdversarialEvidence
      || failureSummaries.hasRework
      || verdict?.needsRework === true
      || rawRecommendation.includes("rework")
      || rawStatus === "failed";
    const forceRecheck = !forceRework && (
      spotCheckNeedsRecheck
      || hasIncompleteBrowserActionEffects
      || hasIncompleteBrowserRecovery
      || hasIncompleteAdversarialEvidence
      || providerGaps.hasGaps
      || verdict?.needsRecheck === true
    );
    const forceEnvironment = !forceRework && !forceRecheck && (
      hasBlockedAdversarialEvidence
      || hasIncompleteBrowserAuthentication
      || verdict?.needsEnvironment === true
    );
    const forceHuman = !forceRework && !forceRecheck && !forceEnvironment && (
      hasUnknownCoverage
      || hasWeakAcceptance
      || hasIncompleteBrowserFlows
      || hasIncompleteMultiSessionBrowser
      || failureSummaries.hasNeedsUser
      || spotCheckNeedsUser
      || verdict?.needsHuman === true
      || rawRecommendation.includes("human")
      || rawStatus === "blocked"
      || blockers.length > 0
    );
    const preAccept = !forceRework
      && !forceRecheck
      && !forceEnvironment
      && !forceHuman
      && spotCheckPassed
      && (verdict?.canAccept === true || rawRecommendation === "accept" || rawStatus === "passed");
    const decision = deriveIndependentReviewDecision({
      report,
      verdict,
      receiptStatus: preAccept ? "done" : forceRework ? "failed" : undefined,
      postReviewSpotCheck,
      forceReworkSignals: forceRework,
      forceRecheckSignals: forceRecheck,
      forceEnvironmentSignals: forceEnvironment,
      forceHumanSignals: forceHuman,
    });
    const needsRework = decision.needsRework;
    const needsRecheck = decision.needsRecheck;
    const needsEnvironment = decision.needsEnvironment || decision.status === "needs_environment";
    const needsHuman = decision.needsHuman;
    const canAccept = decision.canAccept;
    const status = decision.status;
    const {
      buildTestAgentEnvironmentPrepChecklist,
      collectTestAgentFailureScreenshotRefs,
      formatFailureScreenshotTechnicalRows,
      formatTestAgentEnvironmentPrepUserLines,
    } = require("../collaboration/test-agent-environment-prep");
    const environmentPrep = needsEnvironment
      ? buildTestAgentEnvironmentPrepChecklist(report, verdict)
      : null;
    const failureScreenshotRefs = collectTestAgentFailureScreenshotRefs(report);
    const statusLabel = status === "passed"
      ? "已通过"
      : status === "needs_recheck"
        ? "需复验"
        : status === "needs_rework"
          ? "需返工"
          : needsEnvironment || status === "needs_environment"
            ? "补条件"
            : "等你确认";
    const reviewer = event.agent || receipt?.reviewer || receipt?.agent || "TestAgent";
    const detail = globalVisibleText(event.detail || receipt?.summary || event.text || "", "TestAgent 已提交独立复核结论，我会纳入最终验收。", 320);
    const prepUserLines = formatTestAgentEnvironmentPrepUserLines(environmentPrep);
    const evidence = [
      `${reviewer}：${statusLabel}`,
      ...(Array.isArray(postReviewSpotCheckSummary?.rows) ? postReviewSpotCheckSummary.rows.slice(0, 3) : []),
      ...(browserAuthentication?.evidenceLines || []).slice(0, 3),
      ...(browserActionEffects?.evidenceLines || []).slice(0, 4),
      ...(browserRecovery?.evidenceLines || []).slice(0, 3),
      ...(adversarialEvidence?.evidenceLines || []).slice(0, 4),
      ...(multiSessionBrowser?.evidenceLines || []).slice(0, 4),
      ...(browserFlows?.evidenceLines || []).slice(0, 4),
      ...(needsEnvironment ? prepUserLines.slice(0, 2) : []),
      verification.length ? `验证证据：${globalVisibleText(verification[0], "已记录验证证据。", 180)}` : "",
      ...failureSummaries.failureLines.slice(0, 3).map((item: any) => `返工重点：${globalVisibleText(item, "复核发现待处理问题。", 180)}`),
      ...failureSummaries.diagnosticLines.slice(0, 2).map((item: any) => `排查建议：${globalVisibleText(item, "按复核诊断先排查。", 180)}`),
      ...blockers.slice(0, 3).map((item: any) => `待处理：${globalVisibleText(item, "复核发现待处理缺口。", 180)}`),
      ...coverageGaps.weakLines.slice(0, 2).map((item: any) => `待确认：${globalVisibleText(item, "复核证据强度仍需确认。", 180)}`),
      ...providerGaps.lines.slice(0, 3).map((item: any) => `Provider缺口：${globalVisibleText(item, "浏览器 Provider 能力不足。", 180)}`),
      decision.flakyStabilityGroups > 0 ? `浏览器稳定性 flaky：${decision.flakyStabilityGroups} 组` : "",
    ].filter(Boolean);
    const summary = {
      schema: "ccm-main-agent-independent-review-summary-v1",
      title: "独立复核",
      status,
      status_label: statusLabel,
      headline: status === "passed"
        ? spotCheckPassed && spotCheckRequired
          ? "TestAgent 已完成独立复核，我的关键验证抽查也已通过。"
          : "TestAgent/独立复核已检查交付证据，我可以继续做最终验收。"
        : status === "needs_rework"
          ? "独立复核发现待处理缺口，我会先安排返工，再重新验收。"
          : status === "needs_recheck"
            ? spotCheckNeedsRecheck
              ? "TestAgent 已通过，但我的完成前抽查尚未一致，我会先重新复验。"
              : providerGaps.hasGaps
                ? "TestAgent 碰到浏览器 Provider 能力缺口，我会改走 Playwright 后重新复验，不会误走代码返工路线。"
                : decision.flakyStabilityGroups > 0
                  ? "TestAgent 发现浏览器稳定性 flaky，我会先重新复验，不会直接验收。"
                : "TestAgent 的复核证据还没有闭环，我会先补齐检查并重新复验，不会直接要求原实现成员返工。"
          : needsEnvironment || status === "needs_environment"
            ? `TestAgent 的复核受环境或登录条件阻塞（${environmentPrep?.userSummary || "缺登录态/运行条件"}），我会先补齐条件再继续验收。`
            : status === "needs_user"
              ? "独立复核需要人工确认，我会先暂停最终验收。"
            : detail,
      rows: evidence.length ? evidence : [detail],
      next_action: status === "passed"
        ? "继续核对交付总结、改动和验证结果。"
        : status === "needs_rework"
          ? "先处理复核指出的缺口，再重新执行验收。"
          : status === "needs_recheck"
            ? spotCheckNeedsRecheck
              ? "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。"
              : providerGaps.hasGaps
                ? "Switch browser provider to Playwright，然后重新运行 TestAgent。"
                : decision.flakyStabilityGroups > 0
                  ? `先消除 ${decision.flakyStabilityGroups} 组 flaky 稳定性结果，再重新运行 TestAgent。`
                : "补齐可观察结果或目标关联的边界检查后，重新运行 TestAgent 复核。"
          : needsEnvironment || status === "needs_environment"
            ? environmentPrep?.missingEnvNames?.length
              ? `先补齐环境变量名 ${environmentPrep.missingEnvNames.join("、")} 等条件，再继续 TestAgent 复核。`
              : "先补齐环境、登录或运行条件，再继续 TestAgent 复核。"
            : status === "needs_user"
              ? "等待你确认复核标记的问题。"
            : "继续等待完整复核证据或最终总结。",
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
      test_agent_environment_prep: environmentPrep,
      testAgentEnvironmentPrep: environmentPrep,
    };
    // Keep independent_review as string rows (same as group SSE); structured objects live under technical.
    const reviewRows = summary.rows;
    return {
      type: "test_agent_review_ready",
      source: "group-main-agent",
      run_id: options.globalRunId || event.run_id || "",
      trace_id: options.traceId || event.trace_id || "",
      status: options.status || "running",
      phase: options.phase || "execute",
      agent: reviewer,
      taskId: event.taskId || event.task_id || "",
      task_id: event.task_id || event.taskId || "",
      detail,
      independent_review_summary: summary,
      independentReviewSummary: summary,
      test_agent_review_summary: summary,
      testAgentReviewSummary: summary,
      independent_review: reviewRows,
      independentReview: reviewRows,
      test_agent_report: report,
      testAgentReport: report,
      test_agent_verdict: verdict,
      testAgentVerdict: verdict,
      post_review_spot_check_summary: postReviewSpotCheckSummary,
      postReviewSpotCheckSummary: postReviewSpotCheckSummary,
      receipt,
      technical: {
        receipt,
        test_agent_report: report,
        test_agent_verdict: verdict,
        post_review_spot_check: postReviewSpotCheck,
        group_task_id: event.task_id || event.taskId || "",
        independent_review_objects: [{
          reviewer,
          verdict: status,
          summary: detail,
          evidence: evidence.slice(0, 8),
        }],
        browser_provider_gaps: providerGaps.lines,
        failure_step_screenshots: failureScreenshotRefs,
        failure_step_screenshot_rows: formatFailureScreenshotTechnicalRows(failureScreenshotRefs),
        test_agent_environment_prep: environmentPrep,
      },
    };
  }
  
  function relayGlobalTestAgentEventFromGroup(event: any = {}, options: { globalRunId?: string; traceId?: string; status?: string; phase?: string; onEvent?: (event: any) => void } = {}) {
    const relayed = compactGlobalTestAgentExecutionPlanRelayEvent(event, options) || compactGlobalTestAgentReviewRelayEvent(event, options);
    if (!relayed) return null;
    try { options.onEvent?.(relayed); } catch {}
    return relayed;
  }

  return {
    compactGlobalTestAgentExecutionPlanRelayEvent,
    compactGlobalTestAgentReviewRelayEvent,
    relayGlobalTestAgentEventFromGroup,
  }
}

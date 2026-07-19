export function createGlobalAgentIntentSelfTest(deps: { [key: string]: any }) {
  const { GLOBAL_AGENT_HISTORY_LIMIT, GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN, buildGlobalAgentEventUi, buildGlobalAgentGroupMemoryModelContext, buildGlobalDirectDispatchHandoff, buildGlobalSingleProjectMissionPayload, compactGlobalTestAgentReviewRelayEvent, createActionBlockSafeStreamer, formatGlobalDevelopmentDispatchVisibleResult, formatGlobalTaskDispatchVisibleResult, formatMissionStatus, hasExplicitGlobalWriteAuthorization, inferLocalGlobalAction, isGlobalProgressStatusRequest, localActionToAgenticDecision, mergeGlobalAgentMessages, renderGlobalDirectGroupDispatchAcceptedSummary, renderGlobalDirectGroupWorkOrder, renderGlobalDirectProjectWorkOrder } = deps;
function runGlobalAgentIntentSelfTest() {
  const projects = ["frontend-app", "backend-api", "cc-connect-test"];
  const groups = [{ id: "dev-group", name: "开发群", members: projects.map(project => ({ project })) }];
  const cases = [
    { message: "知识库是怎么实现的？", expected: null, authorized: false },
    { message: "知识库有哪些可以优化的地方？", expected: null, authorized: false },
    { message: "请介绍一下当前知识库的工作原理", expected: null, authorized: false },
    { message: "我想了解知识库压缩是怎么做的", expected: null, authorized: false },
    { message: "如果要给 frontend-app 加支付，你建议怎么拆分？", expected: null, authorized: false },
    { message: "你觉得 backend-api 还有哪些可以优化？", expected: null, authorized: false },
    { message: "不要执行，只分析怎么修复 backend-api 的问题", expected: null, authorized: false },
    { message: "Cursor 能不能支持这个项目？", expected: null, authorized: false },
    { message: "关于项目记忆，给我讲讲实现原理", expected: null, authorized: false },
    { message: "测试任务会不会重复创建？", expected: null, authorized: false },
    { message: "帮我优化一下", expected: null, authorized: true },
    { message: "给项目加一个支付功能", expected: null, authorized: true },
    { message: "创建每天检查一次的定时任务", expected: null, authorized: true },
    { message: "请优化整个项目的知识库检索，并完成测试", expected: "orchestrate_development", expectedTargetCount: projects.length, authorized: true },
    { message: "请修改当前项目的 README 并运行测试", expected: "orchestrate_development", expectedTargetCount: 1, authorized: true },
    { message: "修复 backend-api 的知识库检索错误", expected: "orchestrate_development", authorized: true },
    { message: "请给 frontend-app 新增登录页面并运行测试", expected: "orchestrate_development", authorized: true },
    { message: "直接运行 backend-api 的测试", expected: "orchestrate_development", authorized: true },
    { message: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", expected: "send_project_cmd", authorized: true },
    { message: "给开发群派发任务，修复登录问题", expected: "send_group_cmd", authorized: true },
    { message: "创建一个每天早上八点检查 backend-api 的定时任务", expected: "manage_cron", authorized: true },
    { message: "启动 backend-api 项目", expected: "manage_project", authorized: true },
    { message: "打开系统设置页面", expected: "navigate" },
    { message: "播放周杰伦的晴天", expected: "play_music", authorized: true },
    { message: "播放音乐", expected: "play_music", authorized: true },
    { message: "随便放一首歌", expected: "play_music", authorized: false },
  ];
  const results = cases.map(item => {
    const result = inferLocalGlobalAction(item.message, projects, groups, {});
    const actual = result?.action?.type || null;
    const targetCount = Array.isArray(result?.action?.params?.targets) ? result.action.params.targets.length : 0;
    const targetCountPassed = item.expectedTargetCount === undefined || targetCount === item.expectedTargetCount;
    const actualAuthorized = hasExplicitGlobalWriteAuthorization(item.message);
    const authorizationPassed = item.authorized === undefined || actualAuthorized === item.authorized;
    return { ...item, actual, targetCount, actualAuthorized, passed: actual === item.expected && targetCountPassed && authorizationPassed };
  });
  const visibleChunks: string[] = [];
  const safeStreamer = createActionBlockSafeStreamer(text => visibleChunks.push(text));
  for (const chunk of ["这是自然回答。\n`", "``act", "ion\n{\"type\":\"navigate\"}\n`", "``"]) safeStreamer.push(chunk);
  safeStreamer.finish();
  const visibleReply = visibleChunks.join("");
  const actionBlockHidden = visibleReply === "这是自然回答。\n";
  const modelUnavailableDelegation = localActionToAgenticDecision({ reply: "准备派发", action: { type: "send_group_cmd", params: { group_id: "dev-group", message: "修复登录" } } }, { steps: [], user_message: "给开发群派发修复登录", explicit_write_authorization: true } as any);
  const fallbackDelegationCannotWrite = modelUnavailableDelegation?.state === "answer" && !modelUnavailableDelegation.tool;
  const localGroupDispatch = inferLocalGlobalAction("给开发群派发任务，修复登录问题", projects, groups, {});
  const localGroupDispatchUsesSchema = localGroupDispatch?.action?.params?.group_id === "dev-group" && !("groupId" in (localGroupDispatch?.action?.params || {}));
  const localProjectDispatch = inferLocalGlobalAction("我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", projects, groups, {});
  const localDevelopmentDispatch = inferLocalGlobalAction("请优化整个项目的知识库检索，并完成测试", projects, groups, {});
  const localDispatchRepliesFriendly = localGroupDispatch?.reply?.includes("协作群「开发群」")
    && !/主\s*Agent|项目\s*Agent/.test(localGroupDispatch.reply)
    && localProjectDispatch?.reply?.includes("项目「backend-api」的执行成员")
    && !/主\s*Agent|项目\s*Agent/.test(localProjectDispatch.reply)
    && localDevelopmentDispatch?.reply?.includes("跨项目执行计划")
    && !localDevelopmentDispatch?.reply?.includes("全局总控流程");
  const modelUnavailableCronCreate = localActionToAgenticDecision({ reply: "准备创建定时任务", action: { type: "manage_cron", params: { operation: "create", name: "检查 backend-api", schedule: "0 8 * * *", prompt: "检查 backend-api" } } }, { steps: [], user_message: "创建一个每天早上八点检查 backend-api 的定时任务", explicit_write_authorization: true } as any);
  const fallbackCronCannotWrite = modelUnavailableCronCreate?.state === "answer" && !modelUnavailableCronCreate.tool;
  const modelUnavailableAmbiguousWrite = localActionToAgenticDecision({ reply: "准备派发", action: { type: "create_task", params: { title: "优化", business_goal: "帮我优化一下" } } }, { steps: [], user_message: "帮我优化一下", explicit_write_authorization: true } as any);
  const ambiguousFallbackCannotWrite = modelUnavailableAmbiguousWrite?.state === "answer" && !modelUnavailableAmbiguousWrite.tool;
  const modelUnavailableObservationSummary = localActionToAgenticDecision(
    { reply: "查询完成", action: { type: "system_status", params: {} } },
    { steps: [{ tool: { name: "inspect_system" }, observation: { success: true, summary: "CCM_AGENT_RECEIPT done", trace_id: "trace-should-hide" } }], user_message: "查看系统状态", explicit_write_authorization: false } as any
  );
  const fallbackObservationFriendly = modelUnavailableObservationSummary?.state === "complete"
    && !/[{}"]|trace_id|CCM_AGENT_RECEIPT/i.test(modelUnavailableObservationSummary.message || "")
    && /查询完成|查询已返回|已返回结果|技术详情/.test(modelUnavailableObservationSummary.message || "")
    && !/操作已完成|完成信息/.test(modelUnavailableObservationSummary.message || "");
  const localGreeting = inferLocalGlobalAction("你好", projects, groups, {});
  const modelUnavailableGreeting = localActionToAgenticDecision(
    localGreeting,
    { steps: [], user_message: "你好", explicit_write_authorization: false } as any,
  );
  const fallbackGreetingStaysConversation = modelUnavailableGreeting?.state === "answer"
    && modelUnavailableGreeting?.intent?.category === "conversation"
    && modelUnavailableGreeting?.intent?.action_required === false
    && modelUnavailableGreeting?.message === "你好！有什么我可以帮你的吗？"
    && !modelUnavailableGreeting.tool;
  const boundedGroupMemoryModelContext = buildGlobalAgentGroupMemoryModelContext({
    schema: "ccm-global-group-memory-context-v1",
    generated_at: "2026-07-12T00:00:00.000Z",
    query: "检查群聊记忆",
    total_group_count: 1,
    selected_group_count: 1,
    memory_policy: { use: "must_consider_relevant_groups" },
    groups: [{ group_id: "group-1", group_name: "开发群", score: 10, typed_memory: { raw: "x".repeat(80_000) } }],
    rendered_text: `群聊记忆摘要\n${"摘要内容".repeat(8_000)}`,
  }, { maxChars: 12_000 });
  const groupMemoryModelContextBounded = boundedGroupMemoryModelContext.schema === "ccm-global-group-memory-model-context-v1"
    && boundedGroupMemoryModelContext.rendered_text.length <= 12_000
    && boundedGroupMemoryModelContext.context_budget.truncated === true
    && boundedGroupMemoryModelContext.context_budget.source_bytes > 80_000
    && !JSON.stringify(boundedGroupMemoryModelContext).includes('"raw"');
  const staleLocalHistory = Array.from({ length: GLOBAL_AGENT_HISTORY_LIMIT }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `旧前端历史 ${index}`,
    timestamp: `2026-07-07T07:${String(index).padStart(2, "0")}:00.000Z`,
  }));
  const mergedGlobalHistory = mergeGlobalAgentMessages(
    [
      ...staleLocalHistory,
      { role: "assistant", content: "你派发到群聊主 Agent 的任务已经通过验收。", timestamp: "2026-07-07T09:00:00.000Z" },
    ],
    staleLocalHistory
  );
  const globalHistoryMergePreservesBackendCompletion = mergedGlobalHistory.length === GLOBAL_AGENT_HISTORY_LIMIT
    && mergedGlobalHistory.some(item => item.content.includes("通过验收"));
  const directGroupDispatch = buildGlobalDirectDispatchHandoff({
    kind: "group",
    group: groups[0],
    targetProject: "coordinator",
    message: "修复登录问题并完成测试",
    originalText: "给开发群派发任务，修复登录问题并完成测试",
    traceId: "trace-direct-group",
  });
  const directGroupMessage = renderGlobalDirectGroupWorkOrder({
    group: groups[0],
    targetProject: "coordinator",
    message: "修复登录问题并完成测试",
    originalText: "给开发群派发任务，修复登录问题并完成测试",
    handoff: directGroupDispatch.handoff,
  });
  const directProjectDispatch = buildGlobalDirectDispatchHandoff({
    kind: "project",
    project: "backend-api",
    message: "运行测试并总结失败项",
    originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
    traceId: "trace-direct-project",
  });
  const directProjectMessage = renderGlobalDirectProjectWorkOrder({
    project: "backend-api",
    message: "运行测试并总结失败项",
    originalText: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码",
    handoff: directProjectDispatch.handoff,
  });
  const supervisedSingleProjectPayload = buildGlobalSingleProjectMissionPayload({
    project: "backend-api",
    message: "修复登录恢复并运行测试",
    originalText: "给 backend-api 修复登录恢复并完成独立验收",
    traceId: "trace-single-project-supervision",
    globalRunId: "global-run-single-project-supervision",
    sessionId: "session-single-project-supervision",
  });
  const feishuDevelopmentVisible = formatGlobalDevelopmentDispatchVisibleResult(
    {
      mission: { id: "mission-secret-1", title: "修复登录链路" },
      children: [{ task: { id: "task-secret-1" } }, { task: { id: "task-secret-2" } }],
      rejected: [],
    },
    { title: "修复登录链路" }
  );
  const feishuTaskVisible = formatGlobalTaskDispatchVisibleResult(
    { task: { id: "task-secret-3", title: "修复登录问题" }, id: "task-secret-3", queue: { queued: true, position: 1 } },
    { title: "修复登录问题" }
  );
  const dispatchLaunchUi = buildGlobalAgentEventUi({
    type: "dispatch_launch_summary",
    run_id: "global-run-ui-test",
    dispatch_launch_summary: {
      schema: "ccm-main-agent-dispatch-launch-summary-v1",
      title: "已派发的工作",
      headline: "全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。",
      rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "修复登录问题", status_label: "已进入任务链路" }],
      next_action: "后续进度以群聊任务卡为准。",
    },
  });
  const protocolDispatchLaunchUi = buildGlobalAgentEventUi({
    type: "dispatch_launch_summary",
    dispatch_launch_summary: {
      schema: "ccm-main-agent-dispatch-launch-summary-v1",
      title: "已派发的工作",
      headline: "CCM_AGENT_RECEIPT trace_id raw payload",
      rows: [{ agent: "dev-group", role: "群聊主 Agent", task: "CCM_AGENT_RECEIPT", status_label: "已派发" }],
      next_action: "trace_id",
    },
  });
  const unknownCoverageTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-unknown-coverage",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent command checks passed, but one acceptance criterion has no direct evidence.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验收需要真实浏览器证据", status: "unknown", evidence: [] }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-unknown/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-unknown", traceId: "trace-test-agent-unknown" });
  const unknownCoverageTestAgentUi = buildGlobalAgentEventUi(unknownCoverageTestAgentRelay || {});
  const notVerifiedCoverageTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-not-verified-coverage",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent report claims pass, but coverage includes not_verified gaps.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified",
      requiredCheckCoverage: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "not_verified", evidence: [] }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-not-verified/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-not-verified", traceId: "trace-test-agent-not-verified" });
  const notVerifiedCoverageTestAgentUi = buildGlobalAgentEventUi(notVerifiedCoverageTestAgentRelay || {});
  const passedSpotCheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-spot-check-passed",
      status: "passed",
      recommendation: "accept",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["命令验证已通过"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["验证已通过"] }],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
    technical: {
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: true,
        status: "passed",
        executed_count: 2,
        passed_count: 2,
        mismatch_count: 0,
        checks: [{
          command: "node scripts/private-global-pass.mjs",
          cwd: "C:/private/global-pass",
          review_exit_code: 0,
          observed_exit_code: 0,
          matches_review: true,
        }],
        headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
        next_action: "继续完成最终验收。",
      },
    },
  }, { globalRunId: "global-run-test-agent-spot-check-passed", traceId: "trace-test-agent-spot-check-passed" });
  const mismatchedSpotCheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-spot-check-mismatch",
      status: "passed",
      recommendation: "accept",
      requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["命令验证已通过"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["验证已通过"] }],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
    technical: {
      post_review_spot_check: {
        schema: "ccm-main-agent-post-review-spot-check-v1",
        required: true,
        pass: false,
        status: "needs_recheck",
        executed_count: 2,
        passed_count: 1,
        mismatch_count: 1,
        checks: [{
          command: "node scripts/private-global-mismatch.mjs",
          cwd: "C:/private/global-mismatch",
          review_exit_code: 0,
          observed_exit_code: 3,
          matches_review: false,
        }],
        headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
        next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
      },
    },
  }, { globalRunId: "global-run-test-agent-spot-check-mismatch", traceId: "trace-test-agent-spot-check-mismatch" });
  const summaryOnlyGapTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-summary-only-gap",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent summary says pass but required check summary has a gap.",
      evidence: [],
    },
    test_agent_verdict: {
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
  }, { globalRunId: "global-run-test-agent-summary-only-gap", traceId: "trace-test-agent-summary-only-gap" });
  const weakSummaryTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-weak-summary",
      status: "passed",
      recommendation: "accept",
      summary: "TestAgent says pass, but acceptance proof is inferred.",
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
      evidence: [],
    },
  }, { globalRunId: "global-run-test-agent-weak-summary", traceId: "trace-test-agent-weak-summary" });
  const weakSummaryTestAgentUi = buildGlobalAgentEventUi(weakSummaryTestAgentRelay || {});
  const failedBrowserFlowTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-browser-flow-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but a real browser acceptance flow failed.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
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
          criteriaCount: 2,
          criteria: ["打开设置弹窗后可以保存"],
          projects: ["web"],
          providers: ["playwright"],
          actionCount: 4,
          assertionCount: 5,
          failedStepCount: 1,
          failures: [{ project: "web", name: "设置弹窗", status: "failed", failedSteps: ["raw locator"] }],
        }],
      },
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-browser-flow", traceId: "trace-test-agent-browser-flow" });
  const failedMultiSessionTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-multi-session-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but the observer session did not receive the update.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
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
          check: "发送消息后接收方实时看到",
          status: "passed",
          sessionNames: ["sender", "receiver"],
          comparisonCount: 1,
          failedComparisonCount: 0,
          failedSessionNames: [],
          failedSteps: [],
        }, {
          check: "作者更新后观察方同步刷新",
          status: "failed",
          sessionNames: ["author", "observer"],
          comparisonCount: 1,
          failedComparisonCount: 1,
          failedSessionNames: ["observer"],
          failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
        }],
      },
      browserActionEffectSummary: {
        checks: 1,
        actions: 1,
        changed: 0,
        unchanged: 1,
        unavailable: 0,
        failed: 1,
        detailSuppressed: 0,
        crossSession: 1,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
        items: [{
          project: "web",
          name: "观察方刷新",
          provider: "playwright",
          status: "failed",
          actions: 1,
          changed: 0,
          unchanged: 1,
          unavailable: 0,
          failed: 1,
          detailSuppressed: 0,
          crossSession: 1,
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
        criteriaCovered: ["观察方断线重连后不能丢失更新"],
        probeTypes: ["session_reconnect"],
        items: [{
          project: "web",
          surface: "browser",
          name: "观察方断线重连",
          target: "http://127.0.0.1:5173/collaboration?token=hidden",
          status: "failed",
          probeType: "session_reconnect",
          provider: "playwright",
          relevance: "explicit",
          linkedCriteria: ["观察方断线重连后不能丢失更新"],
          goalLinked: true,
          matchScore: 100,
        }],
      },
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-multi-session", traceId: "trace-test-agent-multi-session" });
  const needsRecheckTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-needs-recheck",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but action effects, recovery, and adversarial evidence are incomplete.",
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
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
          events: [{ reason: "unsafe duplicate side effect", sessionId: "global-hidden-session" }],
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
      evidence: [],
    },
    test_agent_verdict: {
      status: "passed",
      recommendation: "accept",
      canAccept: true,
      needsRework: false,
      needsHuman: false,
    },
  }, { globalRunId: "global-run-test-agent-needs-recheck", traceId: "trace-test-agent-needs-recheck" });
  const needsRecheckTestAgentUi = buildGlobalAgentEventUi(needsRecheckTestAgentRelay || {});
  const failedAuthenticationTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-authentication-failed",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but authenticated browser verification failed.",
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 1,
          failedChecks: 1,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ["GLOBAL_TEST_EMAIL", "GLOBAL_TEST_PASSWORD"],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
      },
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-authentication-failed", traceId: "trace-test-agent-authentication-failed" });
  const blockedAuthenticationTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-authentication-blocked",
      status: "passed",
      recommendation: "accept",
      summary: "Legacy verdict says pass, but authenticated browser verification is blocked.",
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 1,
          passedChecks: 0,
          failedChecks: 0,
          blockedChecks: 1,
          authenticatedSessions: 0,
          credentialEnvNames: ["GLOBAL_TEST_EMAIL", "GLOBAL_TEST_PASSWORD"],
          storageStateCount: 1,
          sensitiveArtifactSuppressionCount: 1,
        },
      },
      requiredCheckCoverage: [],
      acceptanceCoverage: [],
      evidence: [],
    },
    test_agent_verdict: { status: "passed", recommendation: "accept", canAccept: true },
  }, { globalRunId: "global-run-test-agent-authentication-blocked", traceId: "trace-test-agent-authentication-blocked" });
  const blockedAuthenticationTestAgentUi = buildGlobalAgentEventUi(blockedAuthenticationTestAgentRelay || {});
  const failureSummaryTestAgentRelay = compactGlobalTestAgentReviewRelayEvent({
    type: "test_agent_review_ready",
    agent: "TestAgent",
    detail: "TestAgent 独立复核完成，报告已返回。",
    test_agent_report: {
      schema: "ccm-test-agent-report-v1",
      id: "global-test-agent-report-failure-summary",
      workOrderId: "global-test-agent-work-order",
      taskId: "global-test-agent-task",
      groupId: "global-test-agent-group",
      status: "failed",
      recommendation: "rework",
      summary: "TestAgent found a browser failure summary.",
      artifactDir: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary",
      requiredCheckCoverage: [{ check: "browser_e2e", status: "verified", evidence: ["浏览器复核已执行"] }],
      acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "verified", evidence: ["浏览器复核已执行"] }],
      failureSummary: [{
        type: "browser",
        project: "web-app",
        title: "登录恢复浏览器复核",
        status: "failed",
        reason: "会话请求没有恢复登录态；失败截图在 C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/screenshots/login.failure.png。",
        evidence: ["C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/screenshots/login.failure.png"],
        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
        diagnostics: [
          "打开失败截图核对页面是否仍停留在登录态。",
          "检查浏览器网络日志中的 /api/session 请求。",
        ],
      }],
      evidence: [],
      metadata: {
        artifactFiles: {
          reportMarkdownPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/report.md",
          manifestPath: "C:/Users/admin/.cc-connect/test-agent-artifacts/global-failure-summary/artifact-manifest.json",
        },
      },
    },
  }, { globalRunId: "global-run-test-agent-failure-summary", traceId: "trace-test-agent-failure-summary" });
  const failureSummaryTestAgentUi = buildGlobalAgentEventUi(failureSummaryTestAgentRelay || {});
  const statusSummary = formatMissionStatus({
    missions: [{
      id: "mission-status-demo",
      title: "修复登录状态恢复",
      status: "in_progress",
      child_task_ids: ["status-child-web", "status-child-api"],
      updated_at: "2020-01-01T00:00:00.000Z",
      mission_summary: { total: 2, completed: 1, failed: 0, blocked: 0 },
      workflow_timeline: [{ title: "主 Agent 检查中", detail: "web 已完成，api 正在验证" }],
    }, {
      id: "mission-status-weak-acceptance",
      title: "弱验收全局任务",
      status: "done",
      child_task_ids: ["status-child-weak-mission"],
      updated_at: "2026-07-09T10:10:00.000Z",
      mission_summary: {
        total: 1,
        completed: 1,
        passed: 1,
        failed: 0,
        blocked: 1,
        all_passed: true,
        children: [{
          task_id: "status-child-weak-mission",
          status: "done",
          gate_passed: true,
          acceptance_evidence_status: "weak",
        }],
      },
      delivery_summary: { acceptance_gate_passed: true },
      workflow_timeline: [{ title: "旧全局摘要声称完成", detail: "仍缺少真实验证或复核证据" }],
    }, {
      id: "mission-status-waiting",
      title: "等待用户确认部署窗口",
      status: "waiting_user",
      global_run_id: "global-run-waiting-secret",
      child_task_ids: [],
      mission_summary: { total: 1, completed: 0, failed: 0, blocked: 1 },
      workflow_timeline: [{ title: "等待用户处理阻塞", detail: "需要确认部署时间后继续。" }],
    }, {
      id: "mission-status-rework",
      title: "登录链路返工",
      status: "reworking",
      global_run_id: "global-run-rework-secret",
      child_task_ids: [],
      mission_summary: { total: 1, completed: 0, failed: 0, blocked: 0 },
      workflow_timeline: [{ title: "复核未通过", detail: "原执行成员正在修复后重新复核。" }],
    }],
    globalRuns: [{
      id: "global-run-waiting-secret",
      mission_id: "mission-status-waiting",
      supervisor_id: "supervisor-waiting-secret",
      status: "waiting_user",
      supervision_state: "waiting_user",
      final_reply: "全局任务等你处理阻塞点，这还不是完成结果。",
      workchain: {
        completion_summary: {
          next_action: "你确认部署时间后，我会继续推动执行成员验收。",
        },
      },
    }, {
      id: "global-run-rework-secret",
      mission_id: "mission-status-rework",
      supervisor_id: "supervisor-rework-secret",
      status: "supervising",
      supervision_state: "reworking",
      final_reply: "全局任务正在返工，修复后会重新复核。",
      workchain: {
        completion_summary: {
          next_action: "原执行成员修复后，重新运行 TestAgent/独立复核，再给你最终总结。",
        },
      },
    }, {
      id: "global-run-confirm-secret",
      status: "waiting_confirmation",
      user_message: "部署登录修复到生产环境",
      updated_at: "2026-07-09T09:00:00.000Z",
      confirmation_summary: {
        question: "请确认是否允许执行生产部署。",
      },
    }, {
      id: "global-run-test-agent-status-secret",
      status: "completed",
      user_message: "让 TestAgent 复核登录恢复交付",
      updated_at: "2026-07-09T11:00:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      independent_review_summary: {
        schema: "ccm-main-agent-independent-review-summary-v1",
        title: "独立复核",
        status: "needs_rework",
        status_label: "需返工",
        headline: "TestAgent 复核指出仍有未覆盖项，需要先返工。",
        rows: [
          "TestAgent：需返工",
          "待处理：验收条件未通过：登录恢复验证必须通过",
        ],
        next_action: "先处理复核指出的缺口，再重新运行 TestAgent/独立复核。",
      },
      final_report: {
        technical: {
          schema: "ccm-test-agent-report-v1",
          report_json: "C:/tmp/test-agent/report.json",
          artifact_manifest: "C:/tmp/test-agent/artifact-manifest.json",
        },
      },
    }, {
      id: "global-run-test-agent-plan-only-status-secret",
      status: "completed",
      user_message: "只生成 TestAgent 复核计划的任务",
      updated_at: "2026-07-09T12:30:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      test_agent_execution_plan_summary: {
        schema: "ccm-test-agent-execution-plan-summary-v1",
        title: "TestAgent 复核计划",
        status: "ready",
        status_label: "可执行",
        headline: "TestAgent 已生成复核计划，我会按这份计划启动真实验证。",
        rows: [
          "复核范围：1 个项目",
          "浏览器检查：1 项",
        ],
        next_action: "启动 TestAgent 真实复核，并把结论纳入最终验收。",
      },
      final_report: {
        technical: {
          test_agent_execution_plan: {
            artifactDir: "C:/tmp/test-agent-artifacts/plan-only",
            browser_har: "C:/tmp/test-agent-artifacts/plan-only/browser.har",
          },
        },
      },
    }, {
      id: "global-run-test-agent-failure-summary-status-secret",
      status: "completed",
      user_message: "只带 TestAgent 失败摘要的复核",
      updated_at: "2026-07-09T12:00:00.000Z",
      final_reply: "任务已完成，可以查看改动详情。",
      final_report: {
        technical: {
          schema: "ccm-test-agent-report-v1",
          test_agent_report: {
            schema: "ccm-test-agent-report-v1",
            status: "failed",
            recommendation: "rework",
            artifactDir: "C:/tmp/test-agent-artifacts/global-failure-summary-status",
            failureSummary: [{
              type: "browser",
              project: "web-app",
              title: "登录恢复浏览器复核",
              status: "failed",
              reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/global-failure-summary-status/screenshots/login.failure.png。",
              nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
              diagnostics: ["打开失败截图核对页面是否仍停留在登录态。"],
            }],
            metadata: {
              artifactFiles: {
                reportMarkdownPath: "C:/tmp/test-agent-artifacts/global-failure-summary-status/report.md",
                manifestPath: "C:/tmp/test-agent-artifacts/global-failure-summary-status/artifact-manifest.json",
              },
            },
          },
        },
      },
    }],
    tasks: [
      {
        id: "status-child-web",
        status: "done",
        target_project: "web",
        status_detail: "已提交结构化结果说明",
        delivery_summary: {
          acceptance_gate_passed: true,
          verification_executed: ["npm test passed by external runner (exit 0)"],
          external_runner_verification_count: 1,
          verification_source_gate_passed: true,
        },
      },
      { id: "status-child-api", status: "in_progress", target_project: "api", status_detail: "正在运行验证", updated_at: "2020-01-01T00:00:00.000Z" },
      {
        id: "status-child-weak-mission",
        parent_task_id: "mission-status-weak-acceptance",
        status: "done",
        target_project: "legacy-web",
        status_detail: "旧子任务摘要声称完成",
        delivery_summary: {
          headline: "旧子任务摘要声称已完成",
          acceptance_gate_passed: true,
          acceptance: ["验收结论：已通过"],
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "done",
            headline: "旧子任务摘要声称已完成",
            acceptance: ["验收结论：已通过"],
            verification_evidence: { status: "ready", items: [] },
          },
        },
      },
      {
        id: "status-direct",
        title: "直派修复首页",
        status: "in_progress",
        target_project: "frontend-app",
        updated_at: "2020-01-01T00:00:00.000Z",
        plan_revision_required: true,
        collaboration_state: {
          last_continuation: {
            kind: "revise_goal",
            at: "2026-07-07T09:01:00.000Z",
            reason: "先保留旧首页入口，只新增兼容开关。",
            replan_required: true,
            interrupt_current_run: true,
          },
          goal_revision_interruption: {
            requested: true,
            requested_at: "2026-07-07T09:01:00.000Z",
            reason: "先保留旧首页入口，只新增兼容开关。",
          },
        },
        workflow_meta: { global_direct_dispatch: { schema: "ccm-global-direct-dispatch-v1", user_goal: "修复首页", session_id: "s1" } },
        workflow_timeline: [{ title: "群聊主 Agent 已接管", detail: "等待子 Agent 返回结果" }],
        delivery_summary: {
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "active",
            headline: "首页兼容开关正在按新要求接续。",
            next_action: "等待重核计划后继续验收。",
            pickup_summary: {
              schema: "ccm-main-agent-pickup-summary-v1",
              title: "回来继续看这里",
              current_state: "目标调整已收到；原始执行记录在技术详情里。",
              review_items: ["接续：正在重核计划", "验证：等待子 Agent 返回", "隐藏：CCM_AGENT_RECEIPT trace_id=secret"],
              resume_action: "等待重核计划后继续验收。",
            },
          },
        },
      },
      {
        id: "status-direct-weak-acceptance",
        title: "弱验收直派",
        status: "done",
        target_project: "frontend-app",
        updated_at: "2026-07-09T10:00:00.000Z",
        workflow_meta: { global_direct_dispatch: { schema: "ccm-global-direct-dispatch-v1", user_goal: "弱验收直派", session_id: "s2" } },
        workflow_timeline: [{ title: "旧摘要声称完成", detail: "仍缺少真实验证或复核证据" }],
        delivery_summary: {
          headline: "旧摘要声称已完成",
          acceptance_gate_passed: true,
          acceptance: ["验收结论：已通过"],
          delivery_report: {
            schema: "ccm-main-agent-delivery-report-v1",
            status: "done",
            status_label: "已完成",
            headline: "旧摘要声称已完成",
            acceptance: ["验收结论：已通过"],
            verification_evidence: { status: "ready", items: [] },
            pickup_summary: {
              schema: "ccm-main-agent-pickup-summary-v1",
              title: "回来继续看这里",
              status: "done",
              headline: "旧摘要声称已完成",
              current_state: "旧摘要声称已完成。",
              review_items: ["验收结论：已通过"],
              resume_action: "可以继续补充新的要求。",
            },
          },
        },
      },
    ],
  });
  const statusChecks = {
    globalStatusFollowupRecognized: isGlobalProgressStatusRequest("现在进展怎么样？") && isGlobalProgressStatusRequest("How's it going?"),
    globalStatusFollowupAvoidsManagementMutation: !isGlobalProgressStatusRequest("把任务状态设置为 done"),
    globalStatusShortcutDoesNotCaptureExplicitDevelopment: !isGlobalProgressStatusRequest("我明确授权你立即修改 backend-api，创建任务并持续跟进进度直到完成"),
    globalStatusSummaryFriendly: statusSummary.includes("最近全局任务进展") && statusSummary.includes("子目标") && statusSummary.includes("web 已完成") && statusSummary.includes("api 处理中"),
    globalStatusShowsChildAgentWaitingState: statusSummary.includes("执行成员等待情况") && statusSummary.includes("已回传：web") && statusSummary.includes("处理中：api") && !statusSummary.includes("已完成：web"),
    globalStatusWeakMissionStaysReviewing: statusSummary.includes("弱验收全局任务：验收中")
      && statusSummary.includes("弱验收全局任务：验收中（0/1 已通过验收，1 验收中）")
      && statusSummary.includes("legacy-web 验收中")
      && statusSummary.includes("补齐真实验证或复核证据")
      && !statusSummary.includes("弱验收全局任务：已完成"),
    globalStatusShowsSupervisionWaitingState: statusSummary.includes("持续跟进")
      && statusSummary.includes("等你处理阻塞点")
      && statusSummary.includes("不是完成结果")
      && statusSummary.includes("你确认部署时间后")
      && statusSummary.includes("等待用户确认部署窗口：等待你补充")
      && !statusSummary.includes("等待用户确认部署窗口：需要处理"),
    globalStatusShowsSupervisionReworkState: statusSummary.includes("正在返工")
      && statusSummary.includes("重新运行 TestAgent")
      && statusSummary.includes("最终总结"),
    globalStatusShowsStandaloneRunState: statusSummary.includes("最近全局运行")
      && statusSummary.includes("部署登录修复到生产环境")
      && statusSummary.includes("部署登录修复到生产环境：等待你确认")
      && !statusSummary.includes("部署登录修复到生产环境：需要处理")
      && statusSummary.includes("等待你确认授权")
      && statusSummary.includes("请确认是否允许执行生产部署"),
    globalStatusShowsIndependentReviewRework: statusSummary.includes("让 TestAgent 复核登录恢复交付：返工中")
      && statusSummary.includes("独立复核：需返工")
      && statusSummary.includes("验收条件未通过：登录恢复验证必须通过")
      && statusSummary.includes("重新运行 TestAgent/独立复核")
      && !statusSummary.includes("任务已完成，可以查看改动详情")
      && !/ccm-test-agent-report-v1|report\.json|artifact-manifest|global-run-test-agent-status-secret/i.test(statusSummary),
    globalStatusShowsTestAgentPlanOnly: statusSummary.includes("只生成 TestAgent 复核计划的任务：验收中")
      && statusSummary.includes("TestAgent 计划：可执行")
      && statusSummary.includes("浏览器检查：1 项")
      && statusSummary.includes("启动 TestAgent 真实复核")
      && !statusSummary.includes("browser_har")
      && !/test-agent-artifacts|C:\/tmp|global-run-test-agent-plan-only-status-secret/i.test(statusSummary),
    globalStatusSynthesizesTestAgentFailureSummary: statusSummary.includes("只带 TestAgent 失败摘要的复核：返工中")
      && statusSummary.includes("返工重点")
      && statusSummary.includes("浏览器检查")
      && statusSummary.includes("排查建议")
      && statusSummary.includes("打开失败截图核对页面")
      && statusSummary.includes("重新运行 TestAgent/独立复核")
      && !/ccm-test-agent-report-v1|report\.json|report\.md|artifact-manifest|test-agent-artifacts|C:\/tmp|global-run-test-agent-failure-summary-status-secret/i.test(statusSummary),
    globalStatusIncludesDirectDispatch: statusSummary.includes("最近全局直派任务") && statusSummary.includes("修复首页"),
    globalStatusShowsDirectDispatchContinuation: statusSummary.includes("接续状态") && statusSummary.includes("保留旧首页入口") && statusSummary.includes("重核计划"),
    globalStatusShowsPickupSummary: statusSummary.includes("回来继续看这里")
      && statusSummary.includes("回看要点")
      && statusSummary.includes("等待重核计划后继续验收"),
    globalStatusWeakDirectDispatchStaysReviewing: statusSummary.includes("弱验收直派：验收中")
      && statusSummary.includes("弱验收直派：验收中（frontend-app，等待任务卡验收）")
      && !statusSummary.includes("弱验收直派：已完成")
      && !statusSummary.includes("旧摘要声称已完成。")
      && !statusSummary.includes("弱验收直派：已完成（frontend-app，已通过验收）"),
    globalStatusShowsProgressRefreshSummary: statusSummary.includes("进度刷新提醒")
      && statusSummary.includes("接续要点")
      && statusSummary.includes("没有新的可展示进展")
      && statusSummary.includes("刷新状态"),
    globalStatusHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|raw payload|WorkerContextPacket|global-run-|supervisor-/i.test(statusSummary),
  };
  const directDispatchChecks = {
    groupVisibleWorkOrderFriendly: directGroupMessage.includes("全局主 Agent 指令工作单") && directGroupMessage.includes("请按这个链路接管") && directGroupMessage.includes("最终总结"),
    groupVisibleWorkOrderNoProtocolLeak: !GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(directGroupMessage),
    groupDirectDispatchSaysAcceptedNotDone: renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" }).includes("不代表需求已经完成"),
    groupDirectDispatchHidesTaskId: (() => {
      const summary = renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" });
      return summary.includes("任务记录")
        && summary.includes("技术详情")
        && !/任务 ID|task-1/i.test(summary);
    })(),
    groupDirectDispatchUsesFriendlyReplyLabel: (() => {
      const legacyReplyLabel = "主 Agent " + "回执";
      const legacyVisibleReplyLabel = "主 Agent " + "说明";
      const summary = renderGlobalDirectGroupDispatchAcceptedSummary({ group: groups[0], groupId: "dev-group", taskId: "task-1", queueText: "已进入执行队列（位置 1）", reply: "我已接管" });
      return summary.includes("协作说明") && !summary.includes(legacyVisibleReplyLabel) && !summary.includes(legacyReplyLabel);
    })(),
    globalFeishuDevelopmentDispatchHidesIds: feishuDevelopmentVisible.includes("全局开发任务已建立")
      && feishuDevelopmentVisible.includes("持续跟进")
      && feishuDevelopmentVisible.includes("技术详情")
      && !/任务 ID|mission-secret|task-secret/i.test(feishuDevelopmentVisible),
    globalFeishuTaskDispatchHidesIds: feishuTaskVisible.includes("协作任务已派发")
      && feishuTaskVisible.includes("任务卡验收")
      && feishuTaskVisible.includes("技术详情")
      && !/任务 ID|task-secret/i.test(feishuTaskVisible),
    projectInternalWorkOrderSelfContained: directProjectMessage.includes("全局主 Agent 指令工作单") && directProjectMessage.includes("你看不到用户和主 Agent 的完整历史对话") && directProjectMessage.includes("CCM_AGENT_RECEIPT"),
    directDispatchHandoffSummary: directGroupDispatch.summary.label === "工作单已补齐" && directProjectDispatch.summary.project === "backend-api",
    verificationOnlyCanAvoidCodeChanges: directProjectDispatch.handoff.verification.required.includes("说明产出和人工核验依据"),
    singleProjectDispatchUsesPersistentMission: supervisedSingleProjectPayload.targets.length === 1
      && supervisedSingleProjectPayload.targets[0].project === "backend-api"
      && supervisedSingleProjectPayload.auto_execute === true
      && supervisedSingleProjectPayload.single_project_supervision.schema === "ccm-global-to-group-supervision-v1"
      && supervisedSingleProjectPayload.single_project_supervision.group_orchestration_required === true
      && supervisedSingleProjectPayload.single_project_supervision.global_agent_review_owner === false
      && supervisedSingleProjectPayload.single_project_supervision.test_agent_owner === "group-main-agent"
      && supervisedSingleProjectPayload.single_project_supervision.independent_review_required === true
      && supervisedSingleProjectPayload.single_project_supervision.post_review_spot_check_required === true,
    singleProjectDispatchCarriesReviewAcceptance: supervisedSingleProjectPayload.acceptance.includes("TestAgent")
      && supervisedSingleProjectPayload.acceptance.includes("群聊主 Agent")
      && supervisedSingleProjectPayload.targets[0].requires_independent_review === true,
    dispatchLaunchUiFriendly: dispatchLaunchUi?.title === "已派发的工作" && dispatchLaunchUi?.text.includes("dev-group") && dispatchLaunchUi?.checkpoint?.label === "已派发的工作",
    dispatchLaunchUiHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|raw payload/i.test(JSON.stringify(protocolDispatchLaunchUi || {})),
  };
  const testAgentRelayChecks = {
    globalTestAgentPassedSpotCheckAllowsAcceptance: passedSpotCheckTestAgentRelay?.independentReviewSummary?.status === "passed"
      && passedSpotCheckTestAgentRelay?.independentReview?.[0]?.verdict === "passed"
      && passedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("我的关键验证抽查也已通过")
      && passedSpotCheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("2 项结果一致"))
      && !/private-global-pass|review_exit_code|observed_exit_code|C:\/private/i.test(JSON.stringify(passedSpotCheckTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentSpotCheckMismatchOverridesLegacyPass: mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.status === "needs_recheck"
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.status_label === "需复验"
      && mismatchedSpotCheckTestAgentRelay?.independentReview?.[0]?.verdict === "needs_recheck"
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("我的完成前抽查尚未一致")
      && mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.next_action.includes("沿用原复核工作单重新运行 TestAgent")
      && !mismatchedSpotCheckTestAgentRelay?.independentReviewSummary?.headline.includes("原实现成员返工")
      && !/private-global-mismatch|review_exit_code|observed_exit_code|C:\/private/i.test(JSON.stringify(mismatchedSpotCheckTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentUnknownCoverageRelayNeedsUser: unknownCoverageTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && unknownCoverageTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.headline.includes("需要人工确认")
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收条件待确认"))
      && unknownCoverageTestAgentRelay?.independentReviewSummary?.next_action.includes("等待你确认")
      && !JSON.stringify(unknownCoverageTestAgentRelay?.independentReviewSummary || {}).includes("已通过"),
    globalTestAgentUnknownCoverageUiWaits: unknownCoverageTestAgentUi?.tone === "waiting"
      && unknownCoverageTestAgentUi?.checkpoint?.status === "warning"
      && unknownCoverageTestAgentUi?.text.includes("人工确认")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1/i.test(JSON.stringify(unknownCoverageTestAgentUi || {})),
    globalTestAgentNotVerifiedCoverageRelayNeedsRework: notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && notVerifiedCoverageTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.headline.includes("安排返工")
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("必检项：浏览器流程未覆盖"))
      && notVerifiedCoverageTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收条件未通过"))
      && !JSON.stringify(notVerifiedCoverageTestAgentRelay?.independentReviewSummary || {}).includes("已通过"),
    globalTestAgentNotVerifiedCoverageUiWaits: notVerifiedCoverageTestAgentUi?.tone === "waiting"
      && notVerifiedCoverageTestAgentUi?.checkpoint?.status === "warning"
      && notVerifiedCoverageTestAgentUi?.text.includes("安排返工")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1/i.test(JSON.stringify(notVerifiedCoverageTestAgentUi || {})),
    globalTestAgentSummaryOnlyGapRelayNeedsRework: summaryOnlyGapTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && summaryOnlyGapTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("必检项：浏览器流程未覆盖"))
      && summaryOnlyGapTestAgentRelay?.independentReviewSummary?.next_action.includes("先处理复核指出的缺口")
      && !/ccm-test-agent-verdict-v1|requiredCheckSummary|trace-test-agent-summary-only-gap/i.test(JSON.stringify(summaryOnlyGapTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentWeakSummaryRelayNeedsUser: weakSummaryTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && weakSummaryTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && weakSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("验收证据待确认") && item.includes("整体复核结果推断"))
      && weakSummaryTestAgentRelay?.independentReviewSummary?.next_action.includes("等待你确认")
      && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify(weakSummaryTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentWeakSummaryUiWaits: weakSummaryTestAgentUi?.tone === "waiting"
      && weakSummaryTestAgentUi?.checkpoint?.status === "warning"
      && weakSummaryTestAgentUi?.text.includes("人工确认")
      && weakSummaryTestAgentUi?.text.includes("验收证据待确认")
      && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify(weakSummaryTestAgentUi || {})),
    globalTestAgentFailedBrowserFlowRelayNeedsRework: failedBrowserFlowTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedBrowserFlowTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("真实浏览器验收") && item.includes("1 个未通过"))
      && failedBrowserFlowTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("弹窗流程") && item.includes("未通过"))
      && !/acceptance_popup_flow|raw locator|ccm-test-agent-report/i.test(JSON.stringify(failedBrowserFlowTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentFailedMultiSessionRelayNeedsRework: failedMultiSessionTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedMultiSessionTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("多人协作浏览器验收") && item.includes("1 个未通过"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("观察方") && item.includes("未通过"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("操作结果验证") && item.includes("没有产生可见效果"))
      && failedMultiSessionTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("边界与异常验证") && item.includes("未通过"))
      && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|token=hidden|session_reconnect|playwright|ccm-test-agent-report/i.test(JSON.stringify(failedMultiSessionTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentIncompleteLatestEvidenceNeedsRecheck: needsRecheckTestAgentRelay?.independentReviewSummary?.status === "needs_recheck"
      && needsRecheckTestAgentRelay?.independentReviewSummary?.status_label === "需复验"
      && needsRecheckTestAgentRelay?.independentReview?.[0]?.verdict === "needs_recheck"
      && needsRecheckTestAgentRelay?.independentReviewSummary?.headline.includes("不会直接要求原实现成员返工")
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("暂时无法确认页面效果"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("不代表实现失败"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("TestAgent 工作单"))
      && needsRecheckTestAgentRelay?.independentReviewSummary?.next_action.includes("重新运行 TestAgent")
      && needsRecheckTestAgentUi?.tone === "waiting"
      && needsRecheckTestAgentUi?.checkpoint?.status === "warning"
      && !/global-hidden-session|unsafe duplicate side effect|sessionId|actionTypes|changedSignals|playwright/i.test(JSON.stringify({
        summary: needsRecheckTestAgentRelay?.independentReviewSummary,
        ui: needsRecheckTestAgentUi,
      })),
    globalTestAgentFailedAuthenticationOverridesLegacyPass: failedAuthenticationTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failedAuthenticationTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failedAuthenticationTestAgentRelay?.independentReviewSummary?.rows.some((item: string) =>
        item.includes("登录态浏览器验收") && item.includes("1 项未通过")
      )
      && !/GLOBAL_TEST_EMAIL|GLOBAL_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(
        JSON.stringify(failedAuthenticationTestAgentRelay?.independentReviewSummary || {})
      ),
    globalTestAgentBlockedAuthenticationNeedsUser: blockedAuthenticationTestAgentRelay?.independentReviewSummary?.status === "needs_user"
      && blockedAuthenticationTestAgentRelay?.independentReview?.[0]?.verdict === "needs_user"
      && blockedAuthenticationTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("测试账号或登录条件"))
      && blockedAuthenticationTestAgentUi?.tone === "waiting"
      && blockedAuthenticationTestAgentUi?.checkpoint?.status === "warning"
      && !/GLOBAL_TEST_EMAIL|GLOBAL_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
        summary: blockedAuthenticationTestAgentRelay?.independentReviewSummary,
        ui: blockedAuthenticationTestAgentUi,
      })),
    globalTestAgentFailureSummaryRelayNeedsRework: failureSummaryTestAgentRelay?.independentReviewSummary?.status === "needs_rework"
      && failureSummaryTestAgentRelay?.independentReview?.[0]?.verdict === "needs_rework"
      && failureSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("返工重点") && item.includes("浏览器检查"))
      && failureSummaryTestAgentRelay?.independentReviewSummary?.rows.some((item: string) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1|C:\/Users\/admin/i.test(JSON.stringify(failureSummaryTestAgentRelay?.independentReviewSummary || {})),
    globalTestAgentFailureSummaryUiWaits: failureSummaryTestAgentUi?.tone === "waiting"
      && failureSummaryTestAgentUi?.checkpoint?.status === "warning"
      && failureSummaryTestAgentUi?.text.includes("返工重点")
      && failureSummaryTestAgentUi?.text.includes("排查建议")
      && !/report\.md|artifact-manifest|test-agent-artifacts|ccm-test-agent-report-v1|C:\/Users\/admin/i.test(JSON.stringify(failureSummaryTestAgentUi || {})),
  };
  return {
    passed: results.every(item => item.passed)
      && actionBlockHidden
      && fallbackDelegationCannotWrite
      && localGroupDispatchUsesSchema
      && localDispatchRepliesFriendly
      && fallbackCronCannotWrite
      && ambiguousFallbackCannotWrite
      && fallbackObservationFriendly
      && fallbackGreetingStaysConversation
      && groupMemoryModelContextBounded
      && globalHistoryMergePreservesBackendCompletion
      && Object.values(statusChecks).every(Boolean)
      && Object.values(directDispatchChecks).every(Boolean)
      && Object.values(testAgentRelayChecks).every(Boolean),
    results,
    actionBlockHidden,
    fallbackDelegationCannotWrite,
    localGroupDispatchUsesSchema,
    localDispatchRepliesFriendly,
    fallbackCronCannotWrite,
    ambiguousFallbackCannotWrite,
    fallbackObservationFriendly,
    fallbackGreetingStaysConversation,
    groupMemoryModelContextBounded,
    globalHistoryMergePreservesBackendCompletion,
    statusChecks,
    directDispatchChecks,
    testAgentRelayChecks,
    visibleReply,
  };
}

  return runGlobalAgentIntentSelfTest;
}

import type { GlobalAgentDecision, GlobalAgentLoopRuntime } from "./loop";

export function createGlobalAgentLoopSelfTest(deps: { [key: string]: any }) {
  const { GLOBAL_USER_SUMMARY_INTERNAL_PATTERN, applyGlobalAgentSupervisionSteer, attachGlobalAgentRunSupervision, buildGlobalDispatchLaunchSummary, completeGlobalAgentSupervision, continueGlobalAgentRunWithClarification, parseGlobalAgentDecision, pauseGlobalAgentRun, resumeGlobalAgentRun, runMainAgentDeliveryReportSelfTest, runMainAgentWorkchainSelfTest, startGlobalAgentRun, steerGlobalAgentRun, updateGlobalAgentSupervisionState } = deps;
async function runGlobalAgentLoopSelfTest() {
  const calls: string[] = [];
  const decisions: GlobalAgentDecision[] = [
    { state: "investigate", message: "先检查系统", tool: { name: "inspect_system", arguments: {} } },
    { state: "execute", message: "建立任务", tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
    { state: "complete", message: "任务已建立", tool: null, completion: { evidence: ["mission-1"] } },
  ];
  const runtime: GlobalAgentLoopRuntime = {
    persist: false,
    callModel: async () => decisions.shift()!,
    executeTool: async (name) => { calls.push(name); return name === "inspect_system" ? { projects: ["demo"] } : { mission_id: "mission-1" }; },
    getContext: () => ({ projects: ["demo"] }),
  };
  const multi = await startGlobalAgentRun({ message: "请给 demo 实现支付", explicitWriteAuthorization: true, maxSteps: 6 }, runtime);

  const supervisedDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "派发任务", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求异步实现" }, tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
    { state: "complete", message: "任务已派发", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "派发工具已返回" }, tool: null },
  ];
  const supervisedEvents: any[] = [];
  const supervised = await startGlobalAgentRun({ message: "异步给 demo 实现支付", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => supervisedDecisions.shift()!,
    executeTool: async (_name, _args, run) => {
      attachGlobalAgentRunSupervision(run, { mission_id: "mission-supervised", supervisor_id: "supervisor-1" });
      return { accepted: true, completed: false, mission_id: "mission-supervised", supervisor_id: "supervisor-1" };
    },
    onEvent: event => supervisedEvents.push(event),
  });
  const supervisedWaiting = updateGlobalAgentSupervisionState(supervised.id, "waiting_user");
  const supervisedReworking = updateGlobalAgentSupervisionState(supervised.id, "reworking");
  const supervisedGoalSteer = applyGlobalAgentSupervisionSteer(supervised.id, "目标调整为只保留兼容字段，不再删除旧表", {
    kind: "revise_goal",
    source: "self-test",
    requestId: "supervised-goal-revision",
    supervisorState: "monitoring",
    continuationSummary: {
      affected_task_count: 2,
      queued_task_count: 1,
      deferred_task_count: 1,
      interrupted_task_count: 1,
      failed_task_count: 0,
    },
  });
  const supervisedCompleted = completeGlobalAgentSupervision(supervised.id, { summary: "最终交付", acceptance_gate_passed: true }, "completed");

  const consultationEvents: any[] = [];
  const consultation = await startGlobalAgentRun({ message: "知识库压缩是怎么实现的" }, {
    persist: false,
    callModel: async () => ({ state: "answer", message: "这是原理说明，不执行任务", tool: null }),
    executeTool: async () => { throw new Error("不应调用工具"); },
    onEvent: event => consultationEvents.push(event),
  });
  const readOnlyStatusConsultationDecisions: GlobalAgentDecision[] = [
    {
      state: "investigate",
      message: "正在读取系统状态",
      intent: { category: "question", goal: "了解系统状态", action_required: false, confidence: .98, authorization_basis: "none", reason: "用户只要求查看当前状态" },
      tool: { name: "inspect_system", arguments: {} },
    },
    {
      state: "answer",
      message: "系统目前可用：已配置 7 个项目和 3 个协作群，定时任务当前未启用。",
      intent: { category: "question", goal: "了解系统状态", action_required: false, confidence: .98, authorization_basis: "none", reason: "已读取系统状态并直接回答" },
      tool: null,
    },
  ];
  const readOnlyStatusConsultation = await startGlobalAgentRun({ message: "系统状态怎么样" }, {
    persist: false,
    callModel: async () => readOnlyStatusConsultationDecisions.shift()!,
    executeTool: async () => ({ projects: 7, groups: 3, cron_enabled: false }),
  });
  const protocolLeak = await startGlobalAgentRun({ message: "普通问话：解释一下任务状态" }, {
    persist: false,
    callModel: async () => ({
      state: "answer",
      message: "CCM_AGENT_RECEIPT status=done trace_id=trace-secret <task-notification>raw payload</task-notification>",
      intent: { category: "question", goal: "解释任务状态", action_required: false, confidence: .96, authorization_basis: "none", reason: "普通问话" },
      tool: null,
    }),
    executeTool: async () => { throw new Error("不应调用工具"); },
  });
  const artifactLeak = await startGlobalAgentRun({ message: "普通问话：复核报告在哪里" }, {
    persist: false,
    callModel: async () => ({
      state: "answer",
      message: "TestAgent passed. Report: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/report.md; manifest: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/artifact-manifest.json; verdict: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/verdict.json",
      intent: { category: "question", goal: "查看复核报告", action_required: false, confidence: .96, authorization_basis: "none", reason: "普通问话" },
      tool: null,
    }),
    executeTool: async () => { throw new Error("不应调用工具"); },
  });

  const waitingEvents: any[] = [];
  const waiting = await startGlobalAgentRun({ message: "支付功能怎么做" }, {
    persist: false,
    callModel: async () => ({ state: "execute", message: "需要修改代码", tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付" } } }),
    executeTool: async () => ({ success: true }),
    onEvent: event => waitingEvents.push(event),
  });
  const clarificationDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "按澄清后的目标执行", plan: ["确认 demo 当前状态", "实现支付", "验证结果"], intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], impact_scope: ["支付模块"], confidence: .96, authorization_basis: "current_message", reason: "用户已补充目标和范围" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付并验证" } } },
    { state: "complete", message: "澄清后的任务已执行", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "工具已返回可核验结果" }, tool: null, completion: { evidence: ["demo:success"] } },
  ];
  const clarifiedEvents: any[] = [];
  const clarified = await continueGlobalAgentRunWithClarification(waiting.id, "请给 demo 实现支付，只改支付模块并完成验证", {
    persist: false,
    callModel: async () => clarificationDecisions.shift()!,
    executeTool: async () => ({ success: true, project: "demo", verification: "passed" }),
    getContext: () => ({ projects: ["demo"], current_head: "abc" }),
    onEvent: event => clarifiedEvents.push(event),
  }, { explicitWriteAuthorization: true });
  const analysisClarificationEvents: any[] = [];
  const analysisWaiting = await startGlobalAgentRun({ message: "帮我优化一下", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => ({ state: "needs_confirmation", message: "请说明目标和是否执行", intent: { category: "ambiguous", goal: "优化", action_required: true, confidence: .3, reason: "范围不清" }, tool: null }),
    executeTool: async () => { throw new Error("不应执行"); },
    onEvent: event => analysisClarificationEvents.push(event),
  });
  const analysisClarified = await continueGlobalAgentRunWithClarification(analysisWaiting.id, "只分析 demo 的性能方向，不执行、不修改代码", {
    persist: false,
    callModel: async () => ({ state: "answer", message: "只提供分析建议", intent: { category: "analysis", goal: "分析 demo 性能", action_required: false, target_refs: ["demo"], confidence: .96, authorization_basis: "none", reason: "用户明确禁止执行" }, tool: null }),
    executeTool: async () => { throw new Error("不应执行"); },
  }, { explicitWriteAuthorization: false });
  const replanDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "按初始方案执行", plan: ["直接修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .95, reason: "先尝试修复" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "按旧入口修复登录" } } },
    { state: "execute", message: "观察变化后重规划", plan: ["重新读取当前入口", "按新入口修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, reason: "旧入口不存在，依据工具观察调整方案" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "读取当前入口后修复登录并验证" } } },
    { state: "complete", message: "已按当前入口修复并验证", intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .97, reason: "重规划后的工具返回成功证据" }, tool: null, completion: { evidence: ["verification:passed"] } },
  ];
  let replanAttempt = 0;
  const replanned = await startGlobalAgentRun({ message: "请修复 demo 登录并验证", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => replanDecisions.shift()!,
    executeTool: async () => (++replanAttempt === 1 ? { success: false, error: "旧登录入口已不存在" } : { success: true, verification: "passed" }),
    getContext: () => ({ project: "demo", current_head: "new-head" }),
  });

  const destructiveDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "删除前确认", plan: ["确认删除对象和影响范围", "等待用户确认", "执行删除并汇报结果"], tool: { name: "manage_task", arguments: { operation: "delete", id: "t1" } } },
    { state: "complete", message: "确认后的删除已执行", tool: null, completion: { evidence: ["deleted:t1"] } },
  ];
  let destructiveExecutions = 0;
  const destructiveEvents: any[] = [];
  const destructiveRuntime: GlobalAgentLoopRuntime = {
    persist: false,
    callModel: async () => destructiveDecisions.shift()!,
    executeTool: async () => { destructiveExecutions += 1; return { success: true, deleted: "t1" }; },
    onEvent: event => destructiveEvents.push(event),
  };
  const destructive = await startGlobalAgentRun({ message: "删除任务 t1" , explicitWriteAuthorization: true }, destructiveRuntime);
  const confirmed = await resumeGlobalAgentRun(destructive.id, destructiveRuntime, { approved: true, feedback: "保留任务归档记录" });

  const invalidDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "错误工具", tool: { name: "not_registered", arguments: {} } },
    { state: "execute", message: "仍然错误", tool: { name: "not_registered", arguments: {} } },
  ];
  const invalid = await startGlobalAgentRun({ message: "测试错误收敛" }, {
    persist: false,
    callModel: async () => invalidDecisions.shift()!,
    executeTool: async () => ({ success: true }),
  });

  const duplicateDecisions: GlobalAgentDecision[] = [
    { state: "investigate", message: "查一次", tool: { name: "inspect_system", arguments: {} } },
    { state: "investigate", message: "查两次", tool: { name: "inspect_system", arguments: {} } },
    { state: "investigate", message: "查三次", tool: { name: "inspect_system", arguments: {} } },
  ];
  const duplicate = await startGlobalAgentRun({ message: "测试循环保护" }, {
    persist: false,
    callModel: async () => duplicateDecisions.shift()!,
    executeTool: async () => ({ success: true }),
  });

  let pausedRunId = "";
  let releaseFirstDecision: ((value: GlobalAgentDecision) => void) | null = null;
  const pauseDecisions: GlobalAgentDecision[] = [{ state: "complete", message: "恢复后完成", tool: null }];
  const pauseEvents: any[] = [];
  const pauseRuntime: GlobalAgentLoopRuntime = {
    persist: false,
    onEvent: event => {
      pauseEvents.push(event);
      if (event.type === "started") pausedRunId = event.run_id;
    },
    callModel: async () => {
      if (!releaseFirstDecision) return new Promise<GlobalAgentDecision>(resolve => { releaseFirstDecision = resolve; });
      return pauseDecisions.shift()!;
    },
    executeTool: async () => ({ success: true }),
  };
  const pausingPromise = startGlobalAgentRun({ message: "测试暂停恢复" }, pauseRuntime);
  while (!pausedRunId || !releaseFirstDecision) await new Promise(resolve => setTimeout(resolve, 0));
  pauseGlobalAgentRun(pausedRunId);
  releaseFirstDecision({ state: "investigate", message: "暂停前读取", tool: { name: "inspect_system", arguments: {} } });
  const paused = await pausingPromise;
  const resumeFeedback = "继续时补齐交付证据、验证结果和验收结论";
  const resumed = await resumeGlobalAgentRun(paused.id, pauseRuntime, { feedback: resumeFeedback, source: "quality_followup" });

  let steeringRunId = "";
  let releaseSteeringDecision: ((value: GlobalAgentDecision) => void) | null = null;
  let steeringModelCall = 0;
  const steeringMessages: Array<Array<{ role: string; content: string }>> = [];
  const steeringEvents: any[] = [];
  const steeringPromise = startGlobalAgentRun({
    message: "请说明 demo 的登录恢复方案",
    explicitWriteAuthorization: true,
  }, {
    persist: false,
    onEvent: event => {
      steeringEvents.push(event);
      if (event.type === "started") steeringRunId = event.run_id;
    },
    callModel: async messages => {
      steeringMessages.push(messages);
      steeringModelCall += 1;
      if (steeringModelCall === 1) {
        return new Promise<GlobalAgentDecision>(resolve => { releaseSteeringDecision = resolve; });
      }
      return {
        state: "answer",
        message: "已把失败回滚策略纳入方案。",
        intent: { category: "analysis", goal: "说明登录恢复与失败回滚方案", action_required: false, target_refs: ["demo"], confidence: .98, authorization_basis: "none", reason: "用户补充了失败回滚要求" },
        tool: null,
      };
    },
    executeTool: async () => { throw new Error("不应执行工具"); },
  });
  while (!steeringRunId || !releaseSteeringDecision) await new Promise(resolve => setTimeout(resolve, 0));
  const steeringRequestId = "selftest-steer-supplement";
  const queuedSteering = steerGlobalAgentRun(steeringRunId, "再补充失败时的回滚策略", {
    kind: "supplement",
    source: "selftest",
    requestId: steeringRequestId,
  });
  const duplicateSteering = steerGlobalAgentRun(steeringRunId, "这条重复请求不应再次入队", {
    kind: "supplement",
    source: "selftest",
    requestId: steeringRequestId,
  });
  releaseSteeringDecision({ state: "answer", message: "这是未读取补充要求的旧回答", tool: null });
  const steered = await steeringPromise;

  let revisionRunId = "";
  let releaseRevisionDecision: ((value: GlobalAgentDecision) => void) | null = null;
  let revisionModelCall = 0;
  const revisionMessages: Array<Array<{ role: string; content: string }>> = [];
  const revisionEvents: any[] = [];
  const revisionPromise = startGlobalAgentRun({
    message: "请直接修改 demo 登录模块并验证",
    explicitWriteAuthorization: true,
  }, {
    persist: false,
    onEvent: event => {
      revisionEvents.push(event);
      if (event.type === "started") revisionRunId = event.run_id;
    },
    callModel: async messages => {
      revisionMessages.push(messages);
      revisionModelCall += 1;
      if (revisionModelCall === 1) {
        return new Promise<GlobalAgentDecision>(resolve => { releaseRevisionDecision = resolve; });
      }
      return {
        state: "answer",
        message: "已按最新目标改为只分析风险，不修改代码。",
        intent: { category: "analysis", goal: "只分析 demo 登录风险", action_required: false, target_refs: ["demo"], confidence: .99, authorization_basis: "none", reason: "用户执行中调整目标并撤销修改范围" },
        tool: null,
      };
    },
    executeTool: async () => { throw new Error("目标调整后不应执行旧工具"); },
  });
  while (!revisionRunId || !releaseRevisionDecision) await new Promise(resolve => setTimeout(resolve, 0));
  steerGlobalAgentRun(revisionRunId, "目标调整为只分析登录风险，不执行、不修改代码", {
    kind: "revise_goal",
    source: "selftest",
    requestId: "selftest-steer-revision",
  });
  releaseRevisionDecision({
    state: "execute",
    message: "这是目标调整前的旧执行决定",
    intent: { category: "execution", goal: "修改 demo 登录模块", action_required: true, target_refs: ["demo"], confidence: .98, authorization_basis: "current_message", reason: "旧目标要求修改" },
    tool: { name: "send_project_cmd", arguments: { project: "demo", message: "修改登录模块" } },
  });
  const revisedDuringRun = await revisionPromise;

  const parsedFence = parseGlobalAgentDecision("```json\n{\"state\":\"answer\",\"message\":\"ok\",\"tool\":null}\n```");
  let shadowExecutions = 0;
  const shadow = await startGlobalAgentRun({ message: "请给 demo 修复登录问题", explicitWriteAuthorization: true }, {
    persist: false,
    qualityPolicyOverride: { shadowMode: true },
    callModel: async () => ({
      state: "execute",
      message: "准备修复",
      intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求修复" },
      tool: { name: "send_project_cmd", arguments: { project: "demo", message: "修复登录" } },
    }),
    executeTool: async () => { shadowExecutions += 1; return { success: true }; },
  });
  const workchainSelfTest = runMainAgentWorkchainSelfTest();
  const deliveryReportSelfTest = runMainAgentDeliveryReportSelfTest();
  const supervisedDispatchSummary = supervised.display_stream?.dispatch_launch_summary || supervised.display_stream?.dispatchLaunchSummary || null;
  const clarifiedDispatchSummary = clarified.display_stream?.dispatch_launch_summary || clarified.display_stream?.dispatchLaunchSummary || null;
  const supervisedDispatchEvent = supervisedEvents.find(event => event.type === "dispatch_launch_summary");
  const clarifiedDispatchEvent = clarifiedEvents.find(event => event.type === "dispatch_launch_summary");
  const completedTargetDispatchSummary = buildGlobalDispatchLaunchSummary({
    steps: [{
      index: 0,
      state: "completed",
      tool: {
        name: "orchestrate_development",
        arguments: {
          business_goal: "同步旧任务状态",
          targets: [{ type: "project", project: "legacy-web", status: "done" }],
        },
      },
      observation: {},
    }],
    original_user_message: "同步旧任务状态",
    user_message: "同步旧任务状态",
  } as any, "running");
  const dispatchSummaryText = JSON.stringify({ supervisedDispatchSummary, clarifiedDispatchSummary });
  const globalWaitingSummaryText = JSON.stringify({
    qualityClarification: waiting.clarification_summary,
    directClarification: analysisWaiting.clarification_summary,
    confirmation: destructive.confirmation_summary,
  });

  const checks = {
    multiStepCompletes: multi.status === "completed",
    dispatchIsNotDeliveryCompletion: supervised.status === "supervising" && supervised.final_reply.includes("不代表任务已经完成"),
    acceptedDispatchStopsSynchronousPolling: supervised.model_calls === 1 && supervised.tool_calls === 1,
    supervisingVisibleReplyHidesTechnicalIds: !/任务 ID|监工 ID|mission-supervised|supervisor-1/i.test(supervised.final_reply)
      && JSON.stringify(supervised.display_stream?.technical_details || []).includes("mission-supervised")
      && JSON.stringify(supervised.display_stream?.technical_details || []).includes("supervisor-1"),
    finalGateCompletesOriginalRun: supervisedCompleted?.status === "completed" && supervisedCompleted?.supervision_state === "completed",
    globalSupervisionWaitingRefreshesVisibleWorkchain: supervisedWaiting?.status === "supervising"
      && supervisedWaiting?.supervision_state === "waiting_user"
      && supervisedWaiting?.phase === "needs_confirmation"
      && supervisedWaiting?.final_reply.includes("等你处理")
      && supervisedWaiting?.final_reply.includes("不是完成结果")
      && supervisedWaiting?.display_stream?.workchain?.user_visible_text?.includes("等你处理")
      && JSON.stringify(supervisedWaiting?.display_stream?.technical_details || []).includes("supervisor-1")
      && !/supervisor-1|mission-supervised|trace_id|run_id/.test(supervisedWaiting?.final_reply || ""),
    globalSupervisionReworkRefreshesVisibleWorkchain: supervisedReworking?.status === "supervising"
      && supervisedReworking?.supervision_state === "reworking"
      && supervisedReworking?.phase === "execute"
      && supervisedReworking?.final_reply.includes("返工")
      && supervisedReworking?.final_reply.includes("重新复核")
      && supervisedReworking?.display_stream?.workchain?.completion_summary?.next_action?.includes("重新运行 TestAgent"),
    globalSupervisionGoalRevisionStopsOldRunAndReplans: supervisedGoalSteer.applied === true
      && supervisedGoalSteer.run.status === "supervising"
      && supervisedGoalSteer.run.phase === "plan"
      && supervisedGoalSteer.run.supervision_state === "replanning"
      && supervisedGoalSteer.run.final_reply.includes("旧执行已停止")
      && supervisedGoalSteer.run.explicit_write_authorization === false
      && supervisedGoalSteer.run.reasoning_loop.authorization_scope.length === 0
      && supervisedGoalSteer.run.reasoning_loop.replan_required === true
      && supervisedGoalSteer.run.user_steer_history?.some(item => item.request_id === "supervised-goal-revision" && item.status === "applied")
      && supervisedGoalSteer.run.todo_plan?.steps?.find((item: any) => item.id === "replan_supervised_mission")?.status === "in_progress"
      && supervisedGoalSteer.run.todo_plan?.steps?.find((item: any) => item.id === "rerun_acceptance_review")?.status === "pending"
      && supervisedGoalSteer.run.display_stream?.main_agent_decision?.todo_plan === supervisedGoalSteer.run.todo_plan
      && JSON.stringify(supervisedGoalSteer.run.display_stream?.technical_details || []).includes("停止旧执行轮"),
    modelObservesAndContinues: calls.join(",") === "inspect_system,orchestrate_development",
    consultationDoesNotDispatch: consultation.tool_calls === 0,
    ordinaryConversationUsesQuietWorkchain: consultation.workchain?.mode === "conversation"
      && consultation.display_stream?.todo?.visible === false,
    readOnlySystemStatusUsesQuietWorkchain: readOnlyStatusConsultation.tool_calls === 1
      && readOnlyStatusConsultation.workchain?.mode === "conversation"
      && readOnlyStatusConsultation.display_stream?.todo?.visible === false
      && !readOnlyStatusConsultation.final_delivery_report
      && !/处理总结|验证与验收|下一步/.test(readOnlyStatusConsultation.final_reply),
    globalVisibleReplySanitizesProtocol: !GLOBAL_USER_SUMMARY_INTERNAL_PATTERN.test(protocolLeak.final_reply)
      && protocolLeak.final_reply.length > 0,
    globalVisibleReplyStoresRawTechnicalContent: String(protocolLeak.final_report?.technical_content || "").includes("CCM_AGENT_RECEIPT")
      && JSON.stringify(protocolLeak.display_stream?.technical_details || []).includes("CCM_AGENT_RECEIPT"),
    globalProtocolLeakAnswerHasNoPlanMode: !protocolLeak.plan_mode && !protocolLeak.display_stream?.main_agent_decision,
    globalVisibleReplyHidesArtifactPaths: !/test-agent-artifacts|artifact-manifest\.json|report\.md|verdict\.json/i.test(artifactLeak.final_reply)
      && /技术详情/.test(artifactLeak.final_reply)
      && String(artifactLeak.final_report?.technical_content || "").includes("artifact-manifest.json")
      && JSON.stringify(artifactLeak.display_stream?.technical_details || []).includes("report.md"),
    globalArtifactLeakAnswerHasNoPlanMode: !artifactLeak.plan_mode && !artifactLeak.display_stream?.main_agent_decision,
    ambiguousConsultationNeedsClarification: waiting.status === "waiting_clarification" && waiting.tool_calls === 0,
    clarificationContinuesSameRun: clarified.id === waiting.id && clarified.status === "completed" && clarified.reasoning_loop.clarification_chain.length === 1,
    clarificationPreservesOriginalGoal: clarified.reasoning_loop.original_goal === "支付功能怎么做" && clarified.reasoning_loop.effective_goal.includes("demo"),
    reasoningPlanAndFactsAreAudited: clarified.reasoning_loop.plan_version >= 1 && clarified.reasoning_loop.fact_snapshots.length >= 1 && clarified.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
    clarificationCanRevokeAuthorization: analysisClarified.id === analysisWaiting.id && analysisClarified.status === "completed" && analysisClarified.explicit_write_authorization === false && analysisClarified.reasoning_loop.authorization_scope.length === 0 && analysisClarified.tool_calls === 0,
    toolFailureTriggersAuditedReplan: replanned.status === "completed" && replanned.reasoning_loop.plan_version === 2 && replanned.reasoning_loop.deviations.some(item => item.type === "tool_result_mismatch") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "failed") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
    destructiveAlwaysNeedsConfirmation: destructive.status === "waiting_confirmation",
    globalPlanModeVisible: destructive.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
      && destructive.plan_mode?.confirmation_status === "awaiting_confirmation"
      && destructive.plan_mode?.steps?.some((item: any) => item.label?.includes("等待用户确认")),
    globalPlanModeCompletesAfterConfirmation: confirmed.plan_mode?.confirmation_status === "completed"
      && confirmed.plan_mode?.steps?.every((item: any) => item.status === "completed"),
    globalConfirmedPlanHasExecutionFollowup: confirmed.plan_mode?.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
      && confirmed.plan_mode?.plan_execution_followup?.headline?.includes("最终总结前逐项核对验收标准"),
    globalConfirmedPlanCarriesAcceptFeedback: confirmed.plan_accept_feedback === "保留任务归档记录"
      && confirmed.plan_mode?.accepted_feedback === "保留任务归档记录"
      && confirmed.plan_mode?.accepted_feedback_history?.some((item: any) => item.feedback === "保留任务归档记录")
      && confirmed.plan_mode?.acceptance?.some((item: string) => item.includes("保留任务归档记录"))
      && confirmed.plan_mode?.plan_execution_followup?.headline?.includes("补充要求")
      && confirmed.reasoning_loop.assertions.some(item => item.id === "plan_accept_feedback" && item.status === "passed"),
    globalOrdinaryAnswerHasNoPlanMode: !consultation.plan_mode && !consultation.display_stream?.plan_mode,
    confirmationExecutesExactPendingToolOnce: confirmed.status === "completed" && destructiveExecutions === 1,
    invalidToolsConvergeToFailure: invalid.status === "failed" && invalid.error.includes("未注册工具"),
    duplicateLoopIsStopped: duplicate.status === "failed" && duplicate.error === "duplicate_tool_loop",
    pauseAndResumeWorks: paused.status === "paused" && resumed.status === "completed",
    globalResumeCarriesFeedback: resumed.last_resume_feedback === resumeFeedback
      && resumed.lastResumeFeedback === resumeFeedback
      && resumed.resume_feedback_history?.some((item: any) => item.feedback === resumeFeedback && item.status === "paused")
      && resumed.resumeFeedbackHistory?.some((item: any) => item.feedback === resumeFeedback)
      && resumed.history.some(item => item.role === "user" && item.content.includes(resumeFeedback))
      && resumed.reasoning_loop.fact_snapshots.some(item => item.source === "resume_feedback" && item.summary.includes(resumeFeedback))
      && resumed.reasoning_loop.assertions.some(item => item.id === "resume_feedback" && item.status === "passed")
      && pauseEvents.some(event => event.type === "resume_feedback" && event.feedback === resumeFeedback && event.source === "quality_followup"),
    globalMidTurnSteerUsesSameRun: steered.id === steeringRunId
      && steered.status === "completed"
      && steeringModelCall === 2
      && steeringMessages[1]?.some(item => item.content.includes("再补充失败时的回滚策略")),
    globalMidTurnSteerConsumesOnce: queuedSteering.duplicate === false
      && duplicateSteering.duplicate === true
      && steered.pending_user_messages?.length === 0
      && steered.user_steer_history?.filter(item => item.request_id === steeringRequestId).length === 1
      && steered.user_steer_history?.some(item => item.request_id === steeringRequestId && item.status === "applied")
      && steered.history.filter(item => item.role === "user" && item.content.includes("再补充失败时的回滚策略")).length === 1,
    globalMidTurnSteerStreamsFriendlyAppliedEvent: steeringEvents.some(event => event.type === "user_steer_applied"
      && event.steering?.kind === "supplement"
      && event.message.includes("补充要求已纳入")),
    globalMidTurnGoalRevisionForcesReplanAndRevokesAuthorization: revisedDuringRun.status === "completed"
      && revisionModelCall === 2
      && revisionMessages[1]?.some(item => item.content.includes("目标调整为只分析登录风险"))
      && revisedDuringRun.explicit_write_authorization === false
      && revisedDuringRun.reasoning_loop.authorization_scope.length === 0
      && revisedDuringRun.reasoning_loop.replan_required === true
      && revisedDuringRun.tool_calls === 0
      && revisionEvents.some(event => event.type === "user_steer_applied" && event.replan_required === true),
    fencedJsonParses: parsedFence.state === "answer",
    shadowModeHasNoSideEffect: shadow.status === "completed" && shadow.shadow_mode === true && shadow.tool_calls === 0 && shadowExecutions === 0,
    completedRunsHaveWorkchain: !!multi.display_stream?.workchain && !!supervisedCompleted?.display_stream?.workchain,
    completedRunsHaveProgressCheckpoints: !!multi.display_stream?.progress_checkpoints?.items?.length && !!supervisedCompleted?.display_stream?.progress_checkpoints?.items?.length,
    workchainSelfTestPasses: workchainSelfTest.pass === true,
    deliveryReportSelfTestPasses: deliveryReportSelfTest.pass === true,
    executionRunsHaveUnifiedDeliveryReport: supervisedCompleted?.final_delivery_report?.schema === "ccm-main-agent-delivery-report-v1",
    executionRunsHaveCompletionCard: supervisedCompleted?.final_delivery_report?.completion_card?.schema === "ccm-main-agent-completion-card-v1",
    ordinaryAnswerDoesNotShowDeliveryReport: !consultation.final_delivery_report && !consultation.display_stream?.delivery_report,
    globalDispatchLaunchSummaryVisible: supervisedDispatchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
      && supervisedDispatchSummary?.rows?.some((row: any) => row.agent === "demo")
      && supervised.display_stream?.main_agent_decision?.dispatch_launch_summary?.rows?.length >= 1,
    globalDispatchLaunchSummaryStreamsLive: supervisedDispatchEvent?.dispatch_launch_summary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
      && supervisedDispatchEvent?.progress_checkpoint?.label === "已派发的工作",
    globalDispatchLaunchSummaryDoesNotCallDoneTargetCompleted: completedTargetDispatchSummary?.rows?.[0]?.status === "reviewing"
      && completedTargetDispatchSummary?.rows?.[0]?.status_label === "已回传结果，待验收"
      && !JSON.stringify(completedTargetDispatchSummary).includes("已完成"),
    globalAutoPlanModeStreamsLive: supervisedEvents.some(event => event.type === "plan_mode_ready"
      && event.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
      && event.plan_mode?.auto_continue === true
      && event.plan_mode?.steps?.length >= 2),
    globalAutoPlanModeHasExecutionFollowup: supervisedEvents.some(event => event.type === "plan_mode_ready"
      && event.plan_mode?.auto_continue === true
      && event.plan_mode?.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
      && event.plan_mode?.plan_execution_followup?.next_action?.includes("验证证据")),
    globalOrdinaryAnswerHasNoPlanModeEvent: !consultationEvents.some(event => event.type === "plan_mode_ready" || event.plan_mode || event.planMode),
    globalProjectDispatchLaunchSummaryVisible: clarifiedDispatchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
      && clarifiedDispatchSummary?.rows?.some((row: any) => row.agent === "demo" && row.role === "项目执行成员"),
    globalProjectDispatchLaunchSummaryStreamsLive: clarifiedDispatchEvent?.dispatch_launch_summary?.rows?.some((row: any) => row.agent === "demo" && row.role === "项目执行成员"),
    globalOrdinaryAnswerHasNoDispatchLaunchSummary: !consultation.display_stream?.dispatch_launch_summary && !consultation.display_stream?.dispatchLaunchSummary,
    globalOrdinaryAnswerHasNoDispatchLaunchEvent: !consultationEvents.some(event => event.type === "dispatch_launch_summary"),
    globalDispatchLaunchSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|trace_id|session_id|raw payload/i.test(dispatchSummaryText),
    globalClarificationSummaryVisible: analysisWaiting.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"
      && analysisWaiting.clarification_summary?.display_policy?.show_todo === false
      && analysisClarificationEvents.some(event => event.type === "clarification_required" && event.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"),
    globalQualityClarificationSummaryStreamsLive: waiting.clarification_summary?.schema === "ccm-global-main-agent-clarification-summary-v1"
      && waitingEvents.some(event => event.type === "clarification_required" && event.clarification_summary?.display_policy?.technical_default_collapsed === true),
    globalConfirmationSummaryVisible: destructive.confirmation_summary?.schema === "ccm-global-main-agent-confirmation-summary-v1"
      && destructive.confirmation_summary?.display_policy?.show_todo === false
      && destructiveEvents.some(event => event.type === "confirmation_required" && event.confirmation_summary?.schema === "ccm-global-main-agent-confirmation-summary-v1"),
    globalPlanModeStreamsLive: destructiveEvents.some(event => event.type === "confirmation_required"
      && event.plan_mode?.schema === "ccm-global-main-agent-plan-mode-v1"
      && event.plan_mode?.steps?.some((item: any) => item.label?.includes("等待用户确认"))),
    globalWaitingSummariesHideProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|WorkerContextPacket|raw payload/i.test(globalWaitingSummaryText),
  };

  return {
    pass: Object.values(checks).every(Boolean),
    ...checks,
    workchain: workchainSelfTest.checks,
    deliveryReport: deliveryReportSelfTest.checks,
  };
}
  return runGlobalAgentLoopSelfTest;
}

import { execFileSync } from "child_process";
import type { CollabCtx } from "../collaboration/collaboration";
import { decideWorkflowWithModel } from "../../agents/workflow-decision";
import { serializeGlobalRequestAttachments } from "./global-agent-attachments";

// HTTP transport adapter for the global Agent feature surface.
export function createGlobalAgentApi(deps: any) {
  const { GLOBAL_AGENT_TOOL_SPECS, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, GLOBAL_MANAGEMENT_ACTIONS, GLOBAL_MANAGEMENT_REQUIRED_PARAMS, GLOBAL_PET_AGENT_NAME, acquireIdempotency, appendGlobalActionAudit, applyGlobalAgentSupervisionSteer, buildAgentQualitySnapshot, buildAgenticContext, buildGlobalAgentEventUi, buildGlobalAgentGroupMemoryModelContext, buildGlobalAgentSessionDebug, buildGlobalAgentToolDefinitions, buildGlobalControlCenterSnapshot, buildGlobalDispatchStrategy, buildGlobalGroupMemoryContext, buildGlobalSystemHealth, buildPublicGlobalStatusRun, buildTraceReplaySuite, buildUploadedFilesContext, callLlm, cancelGlobalAgentRun, checkGlobalMissionSupervisorNow, classifyGlobalAgentUserSteer, classifyGlobalControlIntent, collectRequestBuffer, compactGlobalAgentSessionWithModel, completeGlobalAgentSupervision, completeIdempotency, controlGlobalMissionSupervisor, createAgenticRuntime, createGlobalDevelopmentMission, createRequirementEpicWithChildren, createMissionSupervisorRuntime, deleteGlobalAgentHook, deleteGlobalAgentPermissionRule, ensureTraceId, extractCcConnectHookText, extractFeishuMessageText, failIdempotency, formatMissionStatus, getAgentQualityPolicy, getConfigInfo, getConfigs, getFeishuMessageId, getGlobalAgentBackgroundOutput, getGlobalAgentRun, getGlobalDevelopmentMission, getGlobalMissionSupervisor, getGlobalMissionSupervisorSchedulerStatus, getIdempotencyRecord, getMultipartBoundary, getRequestBaseUrl, globalRunVisibleReply, ingestGlobalAgentConversation, ingestRequirementSources, isGlobalProgressStatusRequest, listGlobalAgentRuns, listGlobalMissionSupervisors, listTaskAgentSessions, loadFeishuConfig, loadGlobalAgentHooks, loadGlobalAgentPermissionRules, loadGlobalAgentBridgeStore, loadGlobalAgentHistoryStore, loadGroups, loadOrchestratorConfig, loadTasks, normalizeFeishuEventPayload, parseMultipart, pauseGlobalAgentRun, processedFeishuMessageIds, processFeishuControlledMessage, publicGlobalAgentRun, publicGlobalAgentRunSummary, refreshGlobalDevelopmentMissions, relayGlobalPetEvent, replayAgentTrace, resolveFeishuDestination, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgentQualityCenterSelfTest, runAgentReasoningLoopSelfTest, runAgentRuntimeKernelSelfTest, runGlobalAgentLoopSelfTest, runGlobalAgentRuntimeSelfTest, runGlobalControlCenterSelfTest, runGlobalGroupMemoryContextSelfTest, runGlobalMissionSupervisorAsyncSelfTest, runGlobalMissionSupervisorSelfTest, runAgenticGlobalRequest, saveGlobalAgentBridgeStore, saveGlobalAgentHook, saveGlobalAgentPermissionRule, sendFeishuReportMessage, sendJson, setAgentQualityPolicy, startGlobalMissionSupervisor, steerGlobalAgentRun, syncGlobalAgentWebHistory, updateGlobalAgentSupervisionState, verifyFeishuEventToken, waitForIdempotencyResult } = deps

  const requirementTargets = () => [
    ...loadGroups().map((group: any) => ({
      type: "group",
      id: group.id,
      name: group.name || group.id,
      capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
    })),
    ...getConfigs().map((config: any) => ({ type: "project", id: config.name, name: config.name })),
  ];

  function handleGlobalAgentApi(
    pathname: string,
    req: any,
    res: any,
    parsed: any,
    ctx: CollabCtx
  ): boolean {
    if (pathname === "/api/global-agent/history" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const store = syncGlobalAgentWebHistory(payload);
          require("../../agents/global/memory").pruneDeletedGlobalWebSessionMemory((store.sessions || []).filter((session: any) => String(session.source || "web") === "web").map((session: any) => String(session.id || "")));
          sendJson(res, { success: true, sessions: store.sessions?.length || 0, current_session_id: store.current_session_id || "" });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || "全局 Agent 历史同步失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/history" && req.method === "GET") {
      const store = loadGlobalAgentHistoryStore();
      sendJson(res, { success: true, ...store });
      return true;
    }

    if (pathname === "/api/global-agent/memory/compact" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const sessionId = String(payload.session_id || payload.sessionId || "").trim();
          if (!sessionId) return sendJson(res, { success: false, error: "缺少当前全局 Agent 会话 ID" }, 400);
          const known = (loadGlobalAgentHistoryStore().sessions || []).some((session: any) => String(session.id) === sessionId);
          if (!known) return sendJson(res, { success: false, error: "全局 Agent 会话不存在" }, 404);
          const result = await compactGlobalAgentSessionWithModel(sessionId, {
            force: true,
            reason: "manual_slash_compact",
            customInstructions: String(payload.custom_instructions || payload.customInstructions || "").trim(),
          });
          sendJson(res, {
            success: true,
            session_id: sessionId,
            mode: "model_required",
            compacted: result.compacted === true,
            reason: result.reason || "manual_slash_compact",
            archive_id: result.archive?.id || "",
            before_tokens: Number(result.session?.preCompactTokenCount || result.tokenCount || 0),
            after_tokens: Number(result.session?.postCompactTokenCount || 0),
            preserved_messages: Number(result.session?.boundary?.preservedMessageCount || 0),
            summary_source: result.session?.summarySource || "model",
            token_measurement: result.session?.compaction?.tokenMeasurement || null,
            auto_compact_threshold: Number(result.session?.compaction?.postCompactGate?.threshold || 0),
            post_compact_gate: result.session?.compaction?.postCompactGate || null,
            session_memory: result.session?.compaction?.sessionMemoryState || null,
            consecutive_failures: Number(result.session?.compaction?.consecutiveFailures || 0),
            model_context_capacity: result.archive?.model?.modelContextCapacity || null,
          });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || "全局 Agent 会话压缩失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/bridge/pending" && req.method === "GET") {
      const store = loadGlobalAgentBridgeStore();
      const pending = (store.requests || []).filter((item: any) => item.status === "pending").sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))[0] || null;
      sendJson(res, { success: true, request: pending });
      return true;
    }
  
    if (pathname === "/api/global-agent/bridge/result" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const store = loadGlobalAgentBridgeStore();
          const request = (store.requests || []).find((item: any) => item.id === payload.id);
          if (!request) return sendJson(res, { success: false, error: "桥接请求不存在" }, 404);
          request.status = payload.success === false ? "failed" : "done";
          request.reply = String(payload.reply || payload.error || GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK);
          request.error = payload.error || "";
          request.updated_at = new Date().toISOString();
          saveGlobalAgentBridgeStore(store);
          sendJson(res, { success: true });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || "桥接结果保存失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/feishu/control-bot/message" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const isAcp = req.headers["x-ccm-acp"] === "1";
          const config = loadFeishuConfig();
          if (!isAcp) {
            const expected = String(config.control_bot_hook_token || "").trim();
            const actual = String(parsed.query.token || req.headers["x-ccm-token"] || "").trim();
            if (!expected || actual !== expected) {
              sendJson(res, { success: false, error: "控制机器人 Hook Token 校验失败" }, 401);
              return;
            }
          }
          const payload = body ? JSON.parse(body) : {};
          const text = extractCcConnectHookText(payload);
          if (!text) {
            sendJson(res, { success: false, error: "未从控制机器人载荷中识别到文本消息" }, 400);
            return;
          }
          const conversationId = resolveFeishuGlobalAgentSessionId(payload);
          const messageId = getFeishuMessageId(payload);
          const operationKey = messageId ? `${conversationId}:${messageId}` : "";
          const operation = operationKey ? acquireIdempotency({ scope: "feishu-control-message", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { conversation_id: conversationId, message_id: messageId } }) : null;
          if (operation && !operation.acquired) {
            const settled = operation.inProgress ? await waitForIdempotencyResult("feishu-control-message", operationKey) : operation.record;
            const replay = settled?.result || {};
            sendJson(res, { success: settled?.status === "completed", duplicate: true, message: "重复控制消息已抑制", reply: replay.reply || replay.error || "消息仍在处理中", trace_id: settled?.trace_id || operation.traceId });
            return;
          }
          const controlled = await processFeishuControlledMessage(getRequestBaseUrl(req), ctx, text, payload, { sendReport: !isAcp, traceId: operation?.traceId });
          if (operationKey) completeIdempotency("feishu-control-message", operationKey, controlled);
          sendJson(res, { success: true, message: controlled.queued ? "控制机器人消息已排队" : "控制机器人消息已处理", ...controlled, trace_id: operation?.traceId || "" });
        } catch (error: any) {
          if (!res.headersSent) sendJson(res, { success: false, error: error?.message || "控制机器人消息处理失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/feishu/bot/test" && req.method === "POST") {
      const config = loadFeishuConfig();
      const publicBaseUrl = String(config.control_bot_public_base_url || "").trim().replace(/\/$/, "");
      const verificationToken = String(config.control_bot_verification_token || "").trim();
      if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
        sendJson(res, { success: false, error: "请先填写可公网访问的 HTTPS 地址" }, 400);
        return true;
      }
      if (!verificationToken) {
        sendJson(res, { success: false, error: "请先填写 Verification Token" }, 400);
        return true;
      }
      const callbackUrl = publicBaseUrl + "/api/feishu/bot/event";
      const challenge = "ccm-" + Date.now().toString(36);
      void fetch(callbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url_verification", challenge, token: verificationToken }),
        signal: AbortSignal.timeout(10000),
      }).then(async (response) => {
        const data = await response.json() as any;
        if (!response.ok || data?.challenge !== challenge) throw new Error(data?.error || `回调响应异常 (${response.status})`);
        sendJson(res, { success: true, message: "控制机器人事件回调可用", callback_url: callbackUrl });
      }).catch((error: any) => {
        sendJson(res, { success: false, error: `无法访问事件回调：${error?.message || String(error)}` }, 400);
      });
      return true;
    }
    if (pathname === "/api/feishu/bot/event" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const config = loadFeishuConfig();
          const rawPayload = body ? JSON.parse(body) : {};
          const payload = normalizeFeishuEventPayload(rawPayload, config);
          verifyFeishuEventToken(payload, config);
  
          if (payload.type === "url_verification" || payload.challenge) {
            sendJson(res, { challenge: payload.challenge });
            return;
          }
          sendJson(res, { code: 0 });
          if (config.control_bot_enabled !== true) return;
          if (payload?.header?.event_type !== "im.message.receive_v1") return;
          if (payload?.event?.sender?.sender_type === "app") return;
  
          const messageId = getFeishuMessageId(payload);
          if (messageId && processedFeishuMessageIds.has(messageId)) return;
          if (messageId) {
            processedFeishuMessageIds.add(messageId);
            if (processedFeishuMessageIds.size > 1000) {
              const oldest = processedFeishuMessageIds.values().next().value;
              if (oldest) processedFeishuMessageIds.delete(oldest);
            }
          }
          const text = extractFeishuMessageText(payload);
          if (!text) {
            void sendFeishuReportMessage({ title: "全局 Agent", markdown: "目前控制机器人只处理文字消息，请把需求或指令以文字发送。" });
            return;
          }
          const operationKey = messageId || String(payload?.header?.event_id || "").trim();
          const operation = operationKey ? acquireIdempotency({ scope: "feishu-event", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { message_id: messageId, event_id: payload?.header?.event_id || "" } }) : null;
          if (operation && !operation.acquired) return;
          void processFeishuControlledMessage(getRequestBaseUrl(req), ctx, text, payload, { traceId: operation?.traceId })
            .then(result => {
              if (operationKey) completeIdempotency("feishu-event", operationKey, result);
              if (!result.report_sent && (result.queued || result.stopped_run_id || result.turn?.mode === "steer")) {
                return sendFeishuReportMessage({ title: "全局 Agent", markdown: result.reply });
              }
            })
            .catch(error => { if (operationKey) failIdempotency("feishu-event", operationKey, error); });
        } catch (error: any) {
          if (!res.headersSent) sendJson(res, { code: 1, error: error?.message || "飞书事件处理失败" }, 401);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/capabilities" && req.method === "GET") {
      sendJson(res, {
        success: true,
        capabilities: Object.entries(GLOBAL_MANAGEMENT_ACTIONS).map(([type, spec]: any) => ({
          type,
          label: spec.label,
          operations: spec.operations,
          destructive: spec.destructive,
          required_params: GLOBAL_MANAGEMENT_REQUIRED_PARAMS[type] || {},
        })),
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/audit" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          sendJson(res, { success: true, audit: appendGlobalActionAudit(payload) });
        } catch (error: any) {
          sendJson(res, { error: error.message || "审计记录失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/orchestrate" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const decompositionPlan = payload.decomposition_plan || payload.decompositionPlan || payload.requirement_decomposition || payload.requirementDecomposition;
          const result = decompositionPlan?.items?.length
            ? createRequirementEpicWithChildren({
                ...payload,
                decomposition_plan: decompositionPlan,
                confirmed: payload.confirmed === true,
                source: payload.source || "global-agent-chat",
                channel: payload.channel || "web-global-agent",
                conversation_id: payload.session_id || payload.sessionId || "default",
                client_message_id: payload.client_message_id || payload.clientMessageId || payload.request_id || payload.requestId || "",
              })
            : createGlobalDevelopmentMission({
                ...payload,
                source: payload.source || "global-agent-chat",
              }, ctx);
          if (result.needs_clarification || result.needs_confirmation) {
            return sendJson(res, result, 409);
          }
          const mission = result.epic || result.mission;
          const supervisor = startGlobalMissionSupervisor({
            mission_id: mission.id,
            global_run_id: payload.global_run_id || payload.globalRunId || "",
            trace_id: mission.trace_id,
            session_id: payload.session_id || payload.sessionId || "default",
            source: payload.source || "global-agent-chat",
            business_goal: mission.business_goal,
            acceptance: mission.acceptance_criteria,
            max_attempts: payload.max_attempts || payload.maxAttempts || 3,
          });
          sendJson(res, { ...result, mission, supervisor });
        } catch (error: any) {
          sendJson(res, { success: false, error: error.message || "全局任务创建失败" }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/missions" && req.method === "GET") {
      const id = String(parsed.query.id || "").trim();
      if (id) {
        const result = getGlobalDevelopmentMission(id);
        if (!result) return sendJson(res, { error: "全局任务不存在" }, 404);
        sendJson(res, { success: true, ...result, supervisor: getGlobalMissionSupervisor(id) });
        return true;
      }
      const missions = refreshGlobalDevelopmentMissions();
      sendJson(res, { success: true, missions });
      return true;
    }
  
    if (pathname === "/api/global-agent/supervisors" && req.method === "GET") {
      const id = String(parsed.query.id || parsed.query.mission_id || parsed.query.missionId || "").trim();
      if (id) {
        const supervisor = getGlobalMissionSupervisor(id);
        if (!supervisor) return sendJson(res, { success: false, error: "全局任务监工不存在" }, 404), true;
        sendJson(res, { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) });
        return true;
      }
      sendJson(res, {
        success: true,
        supervisors: listGlobalMissionSupervisors({ status: String(parsed.query.status || "") || undefined, limit: Number(parsed.query.limit || 50) }),
        scheduler: getGlobalMissionSupervisorSchedulerStatus(),
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/supervisors/self-test" && req.method === "GET") {
      void runGlobalMissionSupervisorAsyncSelfTest()
        .then(asyncResult => {
          const unit = runGlobalMissionSupervisorSelfTest();
          const pass = unit.pass && asyncResult.pass;
          sendJson(res, { success: pass, result: { pass, unit, async_e2e: asyncResult } }, pass ? 200 : 500);
        })
        .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
      return true;
    }
  
    if (pathname === "/api/global-agent/supervisors/control" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const id = String(payload.id || payload.supervisor_id || payload.mission_id || "").trim();
          if (!id) return sendJson(res, { success: false, error: "缺少监工或全局任务 ID" }, 400);
          const operation = String(payload.operation || "check_now");
          const supervisor = operation === "check_now"
            ? await checkGlobalMissionSupervisorNow(id, createMissionSupervisorRuntime(ctx))
            : await controlGlobalMissionSupervisor(id, operation, createMissionSupervisorRuntime(ctx), payload);
          let run: any = null;
          if (supervisor.global_run_id) {
            run = supervisor.status === "cancelled"
              ? completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled")
              : updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
          }
          const userSupplement = String(payload.message || payload.followup || "").trim();
          if (operation === "update_goal" && userSupplement && supervisor.session_id) {
            ingestGlobalAgentConversation({
              sessionId: supervisor.session_id,
              source: payload.source || "global_mission_user_input",
              messages: [{
                role: "user",
                content: userSupplement,
                timestamp: payload.message_timestamp || payload.messageTimestamp || new Date().toISOString(),
                mission_id: supervisor.mission_id,
                run_id: supervisor.global_run_id || "",
                metadata: {
                  continuation_kind: supervisor.last_continuation?.kind || "supplement",
                  waiting_user_resolved: supervisor.last_continuation?.resolves_waiting_user === true,
                  request_id: payload.request_id || payload.requestId || "",
                },
              }],
            });
          }
          sendJson(res, {
            success: true,
            supervisor,
            mission: getGlobalDevelopmentMission(supervisor.mission_id),
            run: run ? publicGlobalAgentRun(run) : null,
          });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/tools" && req.method === "GET") {
      sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
      return true;
    }
  
    if (pathname === "/api/global-agent/control-center" && req.method === "GET") {
      const message = String(parsed.query.message || "").trim();
      sendJson(res, { success: true, control: buildGlobalControlCenterSnapshot(message) });
      return true;
    }
  
    if (pathname === "/api/global-agent/control-center/intent-preview" && req.method === "GET") {
      const message = String(parsed.query.message || "").trim();
      void decideWorkflowWithModel({
        message,
        scope: "global",
        context: { projects: requirementTargets().map((item: any) => ({ type: item.type, id: item.id, name: item.name })) },
      }).then(workflowDecision => {
        sendJson(res, { success: true, workflow_decision: workflowDecision, intent: workflowDecision, dispatch: { mode: workflowDecision.mode, targets: workflowDecision.targetRefs } });
      }).catch((error: any) => {
        sendJson(res, { success: false, error: `统一大模型无法形成路由预览：${error?.message || error}` }, 503);
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/control-center/health" && req.method === "GET") {
      sendJson(res, { success: true, health: buildGlobalSystemHealth() });
      return true;
    }
  
    if (pathname === "/api/global-agent/group-memory" && req.method === "GET") {
      const query = String(parsed.query.query || parsed.query.q || "").trim();
      sendJson(res, {
        success: true,
        group_memory_context: buildGlobalGroupMemoryContext(query, {
          sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
          maxGroups: Number(parsed.query.max_groups || parsed.query.maxGroups || 8),
          maxTypedMemory: Number(parsed.query.max_typed_memory || parsed.query.maxTypedMemory || 4),
        }),
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/group-memory/self-test" && req.method === "GET") {
      const result = runGlobalGroupMemoryContextSelfTest();
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/control-center/self-test" && req.method === "GET") {
      const result = runGlobalControlCenterSelfTest();
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/permissions" && req.method === "GET") {
      sendJson(res, { success: true, rules: loadGlobalAgentPermissionRules() });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/permissions" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const result = payload.operation === "delete" || payload.delete === true
            ? deleteGlobalAgentPermissionRule(String(payload.id || ""))
            : saveGlobalAgentPermissionRule(payload);
          sendJson(res, { success: true, result, rules: loadGlobalAgentPermissionRules() });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/hooks" && req.method === "GET") {
      sendJson(res, { success: true, hooks: loadGlobalAgentHooks() });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/hooks" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const result = payload.operation === "delete" || payload.delete === true
            ? deleteGlobalAgentHook(String(payload.id || ""))
            : saveGlobalAgentHook(payload);
          sendJson(res, { success: true, result, hooks: loadGlobalAgentHooks() });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/background" && req.method === "GET") {
      const id = String(parsed.query.id || parsed.query.run_id || "").trim();
      if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
      const run = getGlobalAgentRun(id);
      sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/background/control" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const id = String(payload.id || payload.run_id || "").trim();
          const operation = String(payload.operation || "").toLowerCase();
          if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
          let run: any;
          if (operation === "stop" || operation === "cancel") run = cancelGlobalAgentRun(id);
          else if (operation === "pause") run = pauseGlobalAgentRun(id);
          else if (operation === "resume" || operation === "takeover") run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
            approved: payload.approved === true ? true : undefined,
            feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
            source: payload.source || payload.resume_source || payload.resumeSource || "global_background_control",
          });
          else throw new Error("operation 必须是 stop、pause、resume 或 takeover");
          sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/session-debug" && req.method === "GET") {
      const id = String(parsed.query.id || parsed.query.run_id || "").trim();
      if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
      const run = getGlobalAgentRun(id);
      if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
      sendJson(res, { success: true, debug: buildGlobalAgentSessionDebug(run) });
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime/self-test" && req.method === "GET") {
      const result = runGlobalAgentRuntimeSelfTest(GLOBAL_AGENT_TOOL_SPECS);
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/agentic/tools" && req.method === "GET") {
      sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
      return true;
    }
  
    if (pathname === "/api/global-agent/agentic/self-test" && req.method === "GET") {
      void runGlobalAgentLoopSelfTest()
        .then(result => sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500))
        .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
      return true;
    }
  
    if (pathname === "/api/global-agent/quality" && req.method === "GET") {
      sendJson(res, { success: true, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
      return true;
    }
  
    if (pathname === "/api/global-agent/quality" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const policy = setAgentQualityPolicy({
            shadowMode: payload.shadowMode ?? payload.shadow_mode,
            minWriteConfidence: payload.minWriteConfidence ?? payload.min_write_confidence,
            requireGroundedTarget: payload.requireGroundedTarget ?? payload.require_grounded_target,
            actor: payload.actor || "local-user",
            reason: payload.reason,
          });
          sendJson(res, { success: true, policy, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/quality/self-test" && req.method === "GET") {
      const result = runAgentQualityCenterSelfTest();
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/reasoning/self-test" && req.method === "GET") {
      const result = runAgentReasoningLoopSelfTest();
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/runtime-kernel/self-test" && req.method === "GET") {
      const result = runAgentRuntimeKernelSelfTest();
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
      return true;
    }
  
    if (pathname === "/api/global-agent/trace-replay" && req.method === "GET") {
      const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
      sendJson(res, {
        success: true,
        replay: traceId ? replayAgentTrace(traceId) : buildTraceReplaySuite(Number(parsed.query.limit || 20)),
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/runs" && req.method === "GET") {
      const id = String(parsed.query.id || "").trim();
      if (id) {
        const run = getGlobalAgentRun(id);
        if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
        sendJson(res, { success: true, run: publicGlobalAgentRun(run, String(parsed.query.detail || "") === "full") });
        return true;
      }
      const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
      const status = String(parsed.query.status || "").trim();
      const detail = String(parsed.query.detail || "").trim().toLowerCase();
      const project = detail === "full"
        ? (run: any) => publicGlobalAgentRun(run)
        : (run: any) => publicGlobalAgentRunSummary(run);
      sendJson(res, { success: true, runs: listGlobalAgentRuns({ sessionId: sessionId || undefined, status: status || undefined, limit: Number(parsed.query.limit || 30) }).map(project) });
      return true;
    }
  
    if (pathname === "/api/global-agent/runs/steer" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const id = String(payload.id || payload.run_id || payload.runId || "").trim();
          const message = String(payload.message || payload.text || "").trim();
          if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
          if (!message) return sendJson(res, { success: false, error: "补充要求不能为空" }, 400);
          const storedRun = getGlobalAgentRun(id);
          if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
            const requestId = String(payload.request_id || payload.requestId || "").trim();
            const existing = requestId
              ? (storedRun.user_steer_history || storedRun.userSteerHistory || []).find((item: any) => item?.request_id === requestId)
              : null;
            if (existing) {
              const existingSupervisor = getGlobalMissionSupervisor(storedRun.supervisor_id);
              return sendJson(res, {
                success: true,
                accepted: true,
                applied: existing.status === "applied",
                duplicate: true,
                steering: existing,
                run: publicGlobalAgentRun(storedRun),
                supervisor: existingSupervisor,
                mission: existingSupervisor ? getGlobalDevelopmentMission(existingSupervisor.mission_id) : null,
                message: existing.kind === "revise_goal"
                  ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
                  : "补充要求已接收，已并入当前任务继续处理。",
              });
            }
            const requestedKind = String(payload.kind || payload.steering_kind || payload.steeringKind || "auto");
            const kind = requestedKind === "auto"
              ? (await decideWorkflowWithModel({
                  message,
                  scope: "global",
                  context: { current_goal: storedRun.original_user_message || storedRun.user_message, phase: "supervising" },
                })).continuationKind
              : requestedKind === "revise_goal" ? "revise_goal" : "supplement";
            const supervisorBefore = getGlobalMissionSupervisor(storedRun.supervisor_id);
            if (!supervisorBefore) throw new Error("全局任务跟进记录不存在");
            const goalPrefix = String(supervisorBefore.business_goal || storedRun.original_user_message || storedRun.user_message || "").trim();
            const businessGoal = [
              goalPrefix,
              `${kind === "revise_goal" ? "目标调整" : "补充要求"}：${message}`,
            ].filter(Boolean).join("\n").slice(0, 50_000);
            const source = String(payload.source || "global_web_supervision_steer");
            const supervisor = await controlGlobalMissionSupervisor(
              storedRun.supervisor_id,
              "update_goal",
              createMissionSupervisorRuntime(ctx),
              {
                ...payload,
                business_goal: businessGoal,
                acceptance: supervisorBefore.acceptance,
                message,
                continuation_kind: kind,
                request_id: requestId,
                source,
                continuation: {
                  ...(payload.continuation && typeof payload.continuation === "object" ? payload.continuation : {}),
                  kind,
                  source,
                  reason: message,
                  title: kind === "revise_goal" ? "监督阶段目标调整" : "监督阶段补充要求",
                  interrupt_current_run: kind === "revise_goal",
                },
              },
            );
            const result = applyGlobalAgentSupervisionSteer(id, message, {
              kind,
              source,
              requestId,
              supervisorState: supervisor.status,
              continuationSummary: supervisor.last_continuation || null,
            });
            try {
              ingestGlobalAgentConversation({
                sessionId: result.run.session_id,
                source,
                messages: [{
                  role: "user",
                  content: message,
                  timestamp: result.steering.at,
                  trace_id: result.run.trace_id,
                  run_id: result.run.id,
                  metadata: {
                    kind: result.steering.kind,
                    steering_id: result.steering.id,
                    supervision: true,
                    applied: true,
                  },
                }],
              });
            } catch (error: any) {
              console.warn(`[全局记忆] 持续跟进补充要求写入失败：${error?.message || error}`);
            }
            return sendJson(res, {
              success: true,
              accepted: true,
              applied: true,
              duplicate: result.duplicate,
              steering: result.steering,
              continuation: result.continuation,
              supervisor,
              mission: getGlobalDevelopmentMission(supervisor.mission_id),
              run: publicGlobalAgentRun(result.run),
              message: kind === "revise_goal"
                ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
                : "补充要求已接收，已并入当前任务继续处理。",
            });
          }
          const requestedKind = String(payload.kind || payload.steering_kind || payload.steeringKind || "auto");
          const modelKind = requestedKind === "auto"
            ? (await decideWorkflowWithModel({
                message,
                scope: "global",
                context: { current_goal: storedRun?.original_user_message || storedRun?.user_message || "", phase: "running" },
              })).continuationKind
            : requestedKind === "revise_goal" ? "revise_goal" : "supplement";
          const result = steerGlobalAgentRun(id, message, {
            kind: modelKind,
            source: payload.source || "global_web_mid_turn",
            requestId: payload.request_id || payload.requestId || "",
          });
          try {
            ingestGlobalAgentConversation({
              sessionId: result.run.session_id,
              source: payload.source || "global_web_mid_turn",
              messages: [{
                role: "user",
                content: message,
                timestamp: result.steering.at,
                trace_id: result.run.trace_id,
                run_id: result.run.id,
                metadata: {
                  kind: result.steering.kind,
                  steering_id: result.steering.id,
                  mid_turn: true,
                },
              }],
            });
          } catch (error: any) {
            console.warn(`[全局记忆] 执行中补充要求写入失败：${error?.message || error}`);
          }
          sendJson(res, {
            success: true,
            accepted: true,
            duplicate: result.duplicate,
            steering: result.steering,
            run: publicGlobalAgentRun(result.run),
            message: result.steering.kind === "revise_goal"
              ? "目标调整已接收，会在当前任务中重新核对计划。"
              : "补充要求已接收，会在当前任务中继续处理。",
          });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 409);
        }
      });
      return true;
    }
  
    if (["/api/global-agent/runs/confirm", "/api/global-agent/runs/resume", "/api/global-agent/runs/pause", "/api/global-agent/runs/cancel"].includes(pathname) && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const id = String(payload.id || payload.run_id || "").trim();
          if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
          let run: any;
          const storedRun = getGlobalAgentRun(id);
          if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
            const operation = pathname.endsWith("/cancel") ? "cancel" : pathname.endsWith("/pause") ? "pause" : pathname.endsWith("/resume") ? "resume" : "";
            if (operation) {
              const supervisor = await controlGlobalMissionSupervisor(storedRun.supervisor_id, operation, createMissionSupervisorRuntime(ctx), payload);
              run = operation === "cancel"
                ? completeGlobalAgentSupervision(id, { summary: "全局任务已由用户取消。" }, "cancelled")
                : updateGlobalAgentSupervisionState(id, supervisor.status);
            }
          }
          if (!run) {
            if (pathname.endsWith("/pause")) run = pauseGlobalAgentRun(id);
            else if (pathname.endsWith("/cancel")) run = cancelGlobalAgentRun(id);
            else run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
              approved: pathname.endsWith("/confirm") ? payload.approved !== false : undefined,
              cancelled: pathname.endsWith("/confirm") && payload.approved === false,
              feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
              source: payload.source || payload.resume_source || payload.resumeSource || "global_run_control",
            });
          }
          sendJson(res, { success: true, run: publicGlobalAgentRun(run) });
        } catch (error: any) {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      });
      return true;
    }
  
    if (pathname === "/api/global-agent/run" && req.method === "POST") {
      const contentType = String(req.headers["content-type"] || "");
      const handleRun = async (payload: any, files: any[] = []) => {
        const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
        let reliabilityOperationKey = "";
        let reliabilityOperationAcquired = false;
        let streamRequestId = "";
        let streamSequence = 0;
        if (isStream) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          });
          if (typeof res.flushHeaders === "function") res.flushHeaders();
        }
        const emit = (event: any) => {
          if (!isStream || res.writableEnded) return;
          const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
          const sequence = ++streamSequence;
          const eventId = String(event?.event_id || event?.eventId || `${streamRequestId || "global-stream"}:${sequence}`);
          const payloadWithOrder = { ...event, event_id: eventId, eventId, sequence, ...(ui ? { ui } : {}) };
          res.write(`data: ${JSON.stringify(payloadWithOrder)}\n\n`);
        };
        try {
          let message = String(payload.message || "").trim();
          const sourceIngestion = await ingestRequirementSources({
            files,
            userText: message,
            extractRequirement: files.length > 0 || /https?:\/\//i.test(message),
            decomposeRequirement: false,
            availableTargets: requirementTargets(),
          });
          if (sourceIngestion.agent_context) {
            message = message ? `${message}${sourceIngestion.agent_context}` : `请处理以下资料：${sourceIngestion.agent_context}`;
          }
          const sourceFiles = serializeGlobalRequestAttachments(files);
          if (!message) throw new Error("消息不能为空");
          let history: any[] = [];
          try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
          const sessionId = String(payload.session_id || payload.sessionId || "web:default");
          ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在思考...", { tab: "global-agent" }, 12 * 60 * 1000);
          ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role: "user", text: message, final: true, source: "global" });
          const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || "").trim();
          const operationKey = requestId ? `${sessionId}:${requestId}` : "";
          streamRequestId = requestId;
          reliabilityOperationKey = operationKey;
          const operation = operationKey ? acquireIdempotency({ scope: "global-agent-request", key: operationKey, leaseMs: 13 * 60 * 1000, metadata: { session_id: sessionId, source: "web" } }) : null;
          reliabilityOperationAcquired = operation?.acquired === true;
          if (operation && !operation.acquired) {
            const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-request", operationKey, 13 * 60 * 1000) : operation.record;
            const replayRun = settled?.result?.run_id ? getGlobalAgentRun(settled.result.run_id) : null;
            const result = settled?.result?.run || (replayRun ? publicGlobalAgentRun(replayRun) : null);
            if (!result) throw new Error(settled?.error || "重复请求仍在处理中");
            if (isStream) {
              emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles, duplicate: true });
              emit({ type: "done" });
              res.end();
            } else sendJson(res, { success: true, run: result, source_files: sourceFiles, files: sourceFiles, duplicate: true });
            return;
          }
          let finalPetEventRelayed = false;
          const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
            message,
            history,
            sessionId,
            source: "web",
            traceId: operation?.traceId,
            clarificationRunId: payload.clarification_run_id || payload.clarificationRunId || "",
            sourceIngestion,
            onEvent: (event: any) => {
              emit(event);
              relayGlobalPetEvent(ctx, event);
              if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
                finalPetEventRelayed = true;
              }
            },
          });
          if (operationKey) completeIdempotency("global-agent-request", operationKey, { run_id: run.id, status: run.status });
          const result = publicGlobalAgentRun(run);
          if (!finalPetEventRelayed) {
            relayGlobalPetEvent(ctx, { type: run.status === "failed" ? "failed" : "completed", run }, { finalRun: result });
          }
          if (isStream) {
            emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles });
            emit({ type: "done" });
            res.end();
          } else sendJson(res, { success: true, run: result, source_files: sourceFiles, files: sourceFiles });
        } catch (error: any) {
          if (reliabilityOperationKey && reliabilityOperationAcquired) {
            try { failIdempotency("global-agent-request", reliabilityOperationKey, error); } catch {}
          }
          relayGlobalPetEvent(ctx, { type: "failed", error: error?.message || String(error) }, { error: error?.message || String(error) });
          if (isStream) {
            emit({ type: "error", text: error?.message || String(error) });
            emit({ type: "done" });
            res.end();
          } else sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      };
      if (contentType.includes("multipart/form-data")) {
        collectRequestBuffer(req).then(buffer => {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) throw new Error("无效的附件请求");
          const { fields, files } = parseMultipart(buffer, boundary);
          return handleRun(fields || {}, files || []);
        }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
      } else {
        let body = "";
        req.on("data", (chunk: any) => body += chunk);
        req.on("end", () => {
          try { void handleRun(body ? JSON.parse(body) : {}, []); }
          catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
        });
      }
      return true;
    }
  
    if (pathname === "/api/global-agent/chat" && req.method === "POST") {
      const contentType = req.headers["content-type"] || "";
  
      const handleAgenticChatProxy = async (payload: any, files: any[] = []) => {
        const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
        if (isStream) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          });
          if (typeof res.flushHeaders === "function") res.flushHeaders();
        }
        const emit = (event: any) => {
          if (!isStream || res.writableEnded) return;
          const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
          res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
        };
        try {
          let message = String(payload.message || "").trim();
          const sourceIngestion = await ingestRequirementSources({
            files,
            userText: message,
            extractRequirement: files.length > 0 || /https?:\/\//i.test(message),
            decomposeRequirement: false,
            availableTargets: requirementTargets(),
          });
          if (sourceIngestion.agent_context) {
            message = message ? `${message}${sourceIngestion.agent_context}` : `请处理以下资料：${sourceIngestion.agent_context}`;
          }
          if (!message) throw new Error("消息不能为空");
          let history: any[] = [];
          try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
          const sessionId = String(payload.session_id || payload.sessionId || "legacy:web");
          const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
            message,
            history,
            sessionId,
            source: "legacy-chat-proxy",
            sourceIngestion,
            onEvent: emit,
          });
          const result = publicGlobalAgentRun(run);
          const sourceFiles = serializeGlobalRequestAttachments(files);
          if (isStream) {
            emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles });
            emit({ type: "done" });
            res.end();
          } else {
            sendJson(res, { success: true, reply: globalRunVisibleReply(run, ""), run: result, source_files: sourceFiles, files: sourceFiles, agentic: true });
          }
        } catch (error: any) {
          if (isStream) {
            emit({ type: "error", text: error?.message || String(error) });
            emit({ type: "done" });
            res.end();
          } else {
            sendJson(res, { success: false, error: error?.message || String(error) }, 400);
          }
        }
      };
  
      if (contentType.includes("multipart/form-data")) {
        collectRequestBuffer(req).then(buffer => {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) throw new Error("无效的附件请求");
          const { fields, files } = parseMultipart(buffer, boundary);
          return handleAgenticChatProxy(fields || {}, files || []);
        }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
      } else {
        let body = "";
        req.on("data", (chunk: any) => body += chunk);
        req.on("end", () => {
          try { void handleAgenticChatProxy(body ? JSON.parse(body) : {}, []); }
          catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
        });
      }
      return true;
  
    }
    // 7. 新增智能代码审查接口
    if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { project } = JSON.parse(body || "{}");
          if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
          
          const configs = getConfigs();
          const config = configs.find(c => c.name === project);
          if (!config) return sendJson(res, { error: "项目不存在" }, 404);
          
          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          if (!workDir) return sendJson(res, { error: "项目工作区目录未配置" }, 400);
          
          // 执行 Git 命令获取变更状态和 diff
          let status = "";
          let diff = "";
          try {
            status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf-8", cwd: workDir });
            diff = execFileSync("git", ["diff"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
            // 如果工作区干净，尝试对比暂存区
            if (!diff.trim()) {
              diff = execFileSync("git", ["diff", "--staged"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
            }
          } catch (gitErr: any) {
            return sendJson(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
          }
          
          if (!status.trim()) {
            return sendJson(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
          }
          
          // 限制 diff payload 的最大长度以防超限
          const maxDiffLength = 12000;
          let diffPayload = diff;
          if (diffPayload.length > maxDiffLength) {
            diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
          }
          
          // 调用大模型进行代码审查
          const orchestratorConfig = loadOrchestratorConfig();
          if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
            return sendJson(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
          }
          
          const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
  请对以下项目「${project}」的本地 Git 代码变更进行智能审查。
  
  【Git 状态详情】
  ${status}
  
  【Git Diff 内容】
  \`\`\`diff
  ${diffPayload}
  \`\`\`
  
  请用中文产出结构化、专业的审查报告，格式如下：
  1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
  2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
  3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
  4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。
  
  请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;
  
          const messages = [
            { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
            { role: "user", content: reviewPrompt }
          ];
          
          const reviewResult = await callLlm(orchestratorConfig, messages);
          sendJson(res, { success: true, review: reviewResult });
        } catch (err: any) {
          sendJson(res, { error: err.message || "代码审查执行出错" }, 500);
        }
      });
      return true;
    }
  
    return false;
  }

  return { handleGlobalAgentApi }
}

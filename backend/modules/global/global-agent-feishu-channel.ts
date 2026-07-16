import * as crypto from "crypto";
import type { CollabCtx } from "../collaboration/collaboration";
import type { GlobalAgentRun } from "../../agents/global/loop";

// Feishu event decoding, message lifecycle, turn control, and restart recovery.
export function createGlobalAgentFeishuChannel(deps: any) {
  const { GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, appendGlobalActionAudit, appendGlobalAgentConversationMessage, appendTraceEvent, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, cancelGlobalAgentRun, conversationTurnControl, createAgenticRuntime, ensureTraceId, feishuRuntimeEventPresentation, findWaitingGlobalAgentRun, formatMissionStatus, getFeishuMessageId, getGlobalAgentConversationMessages, getGlobalAgentRun, getGlobalDevelopmentMission, globalRunVisibleReply, isGlobalProgressStatusRequest, listGlobalAgentRuns, notifyFeishuTaskStage, recordFeishuInbound, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgenticGlobalRequest, sendFeishuReportMessage, steerGlobalAgentRun } = deps

  function decryptFeishuEvent(encrypted: string, encryptKey: string): any {
    const key = crypto.createHash("sha256").update(encryptKey).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.alloc(16));
    decipher.setAutoPadding(true);
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  }
  
  function normalizeFeishuEventPayload(payload: any, config: any): any {
    if (!payload?.encrypt) return payload;
    const encryptKey = String(config.control_bot_encrypt_key || "").trim();
    if (!encryptKey) throw new Error("收到加密事件，但尚未配置 Encrypt Key");
    return decryptFeishuEvent(String(payload.encrypt), encryptKey);
  }
  
  function verifyFeishuEventToken(payload: any, config: any) {
    const expected = String(config.control_bot_verification_token || "").trim();
    if (!expected) throw new Error("控制机器人尚未配置 Verification Token");
    const actual = String(payload?.token || payload?.header?.token || "").trim();
    if (!actual || actual !== expected) throw new Error("飞书事件 Verification Token 校验失败");
  }
  
  function extractFeishuMessageText(payload: any): string {
    const message = payload?.event?.message || {};
    if (message.message_type !== "text") return "";
    let content: any = {};
    try { content = JSON.parse(String(message.content || "{}")); } catch {}
    return String(content.text || "")
      .replace(/@_user_\d+/g, "")
      .replace(/<at[^>]*>.*?<\/at>/gi, "")
      .trim();
  }
  
  function extractCcConnectHookText(payload: any): string {
    const candidates = [
      payload?.message?.text,
      payload?.message?.content,
      payload?.message,
      payload?.text,
      payload?.content,
      payload?.prompt,
      payload?.data?.message?.text,
      payload?.data?.message?.content,
      payload?.data?.text,
      payload?.data?.content,
      payload?.event?.message?.text,
      payload?.event?.message?.content,
    ];
    for (const item of candidates) {
      if (typeof item === "string" && item.trim()) {
        let text = item.trim();
        if (/^\{/.test(text)) {
          try {
            const parsed = JSON.parse(text);
            text = String(parsed.text || parsed.content || text).trim();
          } catch {}
        }
        return text
          .replace(/@_user_\d+/g, "")
          .replace(/<at[^>]*>.*?<\/at>/gi, "")
          .trim();
      }
    }
    return "";
  }

  async function processFeishuGlobalAgentMessage(baseUrl: string, ctx: CollabCtx, text: string, payload: any, options: { sendReport?: boolean; traceId?: string } = {}) {
    const sendReport = options.sendReport !== false;
    const traceId = ensureTraceId(options.traceId, "feishu");
    const conversationId = resolveFeishuGlobalAgentSessionId(payload);
    const destination = recordFeishuInbound({ payload, sessionId: conversationId, messageId: getFeishuMessageId(payload) });
    bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot" });
    const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
    appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
    const auditBase = {
      source: "feishu-control-bot",
      sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
      message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
      trace_id: traceId,
    };
    appendTraceEvent(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
    try {
      if (/^(帮助|help|\/help)$/i.test(text)) {
        const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个协作群或项目执行成员下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
        if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 使用帮助", markdown });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        return markdown;
      }
      if (isGlobalProgressStatusRequest(text)) {
        const markdown = formatMissionStatus();
        appendGlobalActionAudit({ ...auditBase, action: { type: "mission_status", params: { message: text } }, status: "success", result: { summary: markdown } });
        if (sendReport) await sendFeishuReportMessage({ title: "全局任务状态", markdown });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        return markdown;
      }
      const confirmationMatch = text.match(/^(确认(?:执行)?|同意|取消)(?:\s+([a-z0-9_-]+))?[。！!\s]*$/i);
      let run: GlobalAgentRun;
      if (confirmationMatch) {
        const requestedId = String(confirmationMatch[2] || "").trim();
        const waiting = requestedId ? getGlobalAgentRun(requestedId) : findWaitingGlobalAgentRun(conversationId);
        if (!waiting || waiting.status !== "waiting_confirmation") {
          const markdown = "当前没有等待你确认的全局 Agent 操作。";
          appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
          if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent", markdown });
          return markdown;
        }
        run = await resumeGlobalAgentRun(waiting.id, createAgenticRuntime(baseUrl, ctx), {
          approved: !/^取消/i.test(confirmationMatch[1]),
          cancelled: /^取消/i.test(confirmationMatch[1]),
        });
      } else {
        const onFeishuRuntimeEvent = (event: any) => {
          bindFeishuIdentifiersFromValue(conversationId, event, destination);
          const presentation = feishuRuntimeEventPresentation(event);
          if (!presentation) return;
          void notifyFeishuTaskStage({
            ...presentation,
            sessionId: conversationId,
            dedupeKey: `runtime:${traceId}:${event?.type || "event"}:${event?.tool || event?.name || ""}:${event?.task_id || event?.taskId || ""}`,
          });
        };
        run = await runAgenticGlobalRequest(baseUrl, ctx, {
          message: text,
          history: historyBeforeUser.map((item: any) => ({ role: item.role, content: item.content })),
          sessionId: conversationId,
          source: "feishu-control-bot",
          traceId,
          onEvent: onFeishuRuntimeEvent,
        });
      }
      const missionSnapshot = run.mission_id ? getGlobalDevelopmentMission(run.mission_id) : null;
      bindFeishuTaskContext({
        sessionId: conversationId,
        destination,
        runIds: [run.id],
        missionIds: [run.mission_id],
        taskIds: [run.mission_id, ...(missionSnapshot?.children || []).map((item: any) => item.id)],
        source: "feishu-control-bot",
      });
      const confirmationHint = run.status === "waiting_confirmation"
        ? `\n\n待确认操作：${run.pending_tool?.name || "写入操作"}\n运行 ID：${run.id}\n回复“确认 ${run.id}”继续，或回复“取消 ${run.id}”。`
        : "";
      const markdown = `${globalRunVisibleReply(run, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK)}${confirmationHint}`;
      appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      if (sendReport) await sendFeishuReportMessage({ title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行结果", markdown });
      return markdown;
    } catch (error: any) {
      const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
      appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 执行失败", markdown });
      return markdown;
    }
  }
  type FeishuTurnCommand = { kind: "normal" | "steer" | "queue" | "stop"; message: string };
  
  function parseFeishuConversationTurnCommand(value: any): FeishuTurnCommand {
    const text = String(value || "").trim();
    if (/^(?:停止|停止当前|取消当前|stop)$/i.test(text)) return { kind: "stop", message: "" };
    const steer = text.match(/^(?:引导|补充|调整)(?:当前)?\s*[:：]\s*([\s\S]+)$/i);
    if (steer) return { kind: "steer", message: steer[1].trim() };
    const queue = text.match(/^(?:排队|稍后|下一条)\s*[:：]\s*([\s\S]+)$/i);
    if (queue) return { kind: "queue", message: queue[1].trim() };
    return { kind: "normal", message: text };
  }
  
  const drainingFeishuConversationTurns = new Set<string>();
  let feishuConversationTurnRecoveryTimer: NodeJS.Timeout | null = null;
  
  async function drainFeishuConversationTurns(baseUrl: string, ctx: CollabCtx, conversationId: string, payload: any) {
    if (!conversationId || drainingFeishuConversationTurns.has(conversationId)) return;
    drainingFeishuConversationTurns.add(conversationId);
    try {
      while (true) {
        const turn = conversationTurnControl.claim({ scope: "feishu", conversation_id: conversationId });
        if (!turn) break;
        try {
          const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, turn.message, payload, {
            sendReport: true,
            traceId: String(turn.metadata?.trace_id || ""),
          });
          conversationTurnControl.settle({ id: turn.id, status: "completed", result: { reply } });
        } catch (error: any) {
          conversationTurnControl.settle({ id: turn.id, status: "failed", error: error?.message || String(error) });
          break;
        }
      }
    } finally {
      drainingFeishuConversationTurns.delete(conversationId);
    }
  }
  
  function startFeishuConversationTurnRecoveryForServer(baseUrl: string, ctx: CollabCtx) {
    if (feishuConversationTurnRecoveryTimer) return { started: false };
    const tick = () => {
      const queued = conversationTurnControl.list({ scope: "feishu", statuses: "queued", limit: 500 }).turns;
      const conversationIds: string[] = Array.from(new Set<string>(
        queued.map((turn: any) => String(turn.conversation_id || "")).filter(Boolean),
      ));
      for (const conversationId of conversationIds) {
        const active = listGlobalAgentRuns({ sessionId: conversationId, limit: 20 })
          .some((run: any) => ["running", "supervising", "paused"].includes(String(run?.status || "")));
        if (!active) void drainFeishuConversationTurns(baseUrl, ctx, conversationId, { ccm_conversation_id: conversationId, source: "feishu_queue_recovery" });
      }
    };
    tick();
    feishuConversationTurnRecoveryTimer = setInterval(tick, 3_000);
    feishuConversationTurnRecoveryTimer.unref?.();
    return { started: true };
  }
  
  function stopFeishuConversationTurnRecoveryForServer() {
    if (feishuConversationTurnRecoveryTimer) clearInterval(feishuConversationTurnRecoveryTimer);
    feishuConversationTurnRecoveryTimer = null;
  }
  
  async function processFeishuControlledMessage(baseUrl: string, ctx: CollabCtx, text: string, payload: any, options: any = {}) {
    const conversationId = resolveFeishuGlobalAgentSessionId(payload);
    const messageId = getFeishuMessageId(payload);
    const command = parseFeishuConversationTurnCommand(text);
    const activeRun = listGlobalAgentRuns({ sessionId: conversationId, limit: 20 })
      .find((run: any) => ["running", "supervising", "paused"].includes(String(run?.status || ""))) || null;
  
    if (command.kind === "stop") {
      if (activeRun?.id) cancelGlobalAgentRun(activeRun.id);
      void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
      return {
        reply: activeRun?.id
          ? "已停止当前工作。已经排队的后续消息会继续保留，你也可以发送新的要求。"
          : "当前没有正在执行的工作。已经排队的消息仍会保留。",
        stopped_run_id: activeRun?.id || "",
      };
    }
  
    if (activeRun && command.kind === "steer") {
      const queued = conversationTurnControl.enqueue({
        scope: "feishu",
        conversation_id: conversationId,
        mode: "steer",
        message: command.message,
        request_id: messageId || options.traceId || undefined,
        active_run_id: activeRun.id,
        metadata: { source: "feishu-control-bot", trace_id: options.traceId || "" },
      });
      try {
        steerGlobalAgentRun(activeRun.id, command.message, {
          kind: "auto",
          source: "feishu_mid_turn",
          requestId: queued.turn.request_id,
        });
        conversationTurnControl.settle({ id: queued.turn.id, status: "applied", active_run_id: activeRun.id });
        return { reply: "已把这条要求纳入当前工作，我会在安全节点重新核对计划并继续。", turn: queued.turn, run_id: activeRun.id };
      } catch (error: any) {
        conversationTurnControl.settle({ id: queued.turn.id, status: "failed", error: error?.message || String(error) });
        throw error;
      }
    }
  
    if (activeRun && (command.kind === "queue" || command.kind === "normal")) {
      const queued = conversationTurnControl.enqueue({
        scope: "feishu",
        conversation_id: conversationId,
        mode: "queue",
        message: command.message,
        request_id: messageId || options.traceId || undefined,
        active_run_id: activeRun.id,
        metadata: { source: "feishu-control-bot", trace_id: options.traceId || "" },
      });
      const position = conversationTurnControl.list({ scope: "feishu", conversation_id: conversationId, statuses: "queued,sending" })
        .turns.find((turn: any) => turn.id === queued.turn.id)?.position || 1;
      return {
        reply: `当前工作仍在进行，这条消息已排在第 ${position} 位，完成后会自动处理。发送“停止”可以结束当前工作。`,
        queued: true,
        position,
        turn: queued.turn,
      };
    }
  
    const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, command.message, payload, options);
    void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
    return { reply };
  }
  
  function runFeishuConversationTurnCommandSelfTest() {
    const checks = {
      stop: parseFeishuConversationTurnCommand("停止").kind === "stop",
      steer: parseFeishuConversationTurnCommand("引导：先补测试").message === "先补测试",
      queue: parseFeishuConversationTurnCommand("排队: 再写文档").kind === "queue",
      ordinaryDefaultsToNormal: parseFeishuConversationTurnCommand("进度怎么样").kind === "normal",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  }

  return {
    normalizeFeishuEventPayload, verifyFeishuEventToken, extractFeishuMessageText, extractCcConnectHookText,
    processFeishuGlobalAgentMessage, parseFeishuConversationTurnCommand, startFeishuConversationTurnRecoveryForServer,
    stopFeishuConversationTurnRecoveryForServer, processFeishuControlledMessage, runFeishuConversationTurnCommandSelfTest,
  }
}

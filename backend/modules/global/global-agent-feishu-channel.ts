import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { CollabCtx } from "../collaboration/collaboration";
import type { GlobalAgentRun } from "../../agents/global/loop";
import { UPLOAD_DIR } from "../../core/utils";
import { downloadFeishuMessageResource } from "../collaboration/feishu";
import { ingestRequirementSources, type RequirementIngestionResult } from "../requirements/source-ingestion";
import { decideWorkflowWithModel } from "../../agents/workflow-decision";

// Feishu event decoding, message lifecycle, turn control, and restart recovery.
export function createGlobalAgentFeishuChannel(deps: any) {
  const { GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, appendGlobalActionAudit, appendGlobalAgentConversationMessage, appendTraceEvent, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, cancelGlobalAgentRun, conversationTurnControl, createAgenticRuntime, ensureTraceId, feishuRuntimeEventPresentation, findWaitingGlobalAgentRun, formatMissionStatus, getConfigs, getFeishuMessageId, getGlobalAgentConversationMessages, getGlobalAgentRun, getGlobalDevelopmentMission, globalRunVisibleReply, isGlobalProgressStatusRequest, listGlobalAgentRuns, listTaskPermissionRequests, loadGroups, notifyFeishuTaskStage, postLocalApi, recordFeishuInbound, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgenticGlobalRequest, sendFeishuReportMessage, steerGlobalAgentRun } = deps

  async function sendFeishuConversationReply(input: { conversationId: string; title: string; markdown: string; traceId?: string; stage?: string; dedupeSuffix?: string }) {
    const bound = await notifyFeishuTaskStage({
      stage: input.stage || "global_agent_reply",
      title: input.title,
      markdown: input.markdown,
      sessionId: input.conversationId,
      dedupeKey: `global-reply:${input.traceId || input.conversationId}:${input.dedupeSuffix || crypto.createHash("sha256").update(input.markdown).digest("hex").slice(0, 16)}`,
    });
    if (bound?.success || bound?.queued) return { ...bound, channel: "bound_conversation" };
    const fallback = await sendFeishuReportMessage({ title: input.title, markdown: input.markdown });
    return { ...fallback, channel: "configured_fallback", reason: bound?.reason || "bound_delivery_unavailable" };
  }

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
    let content: any = {};
    try { content = JSON.parse(String(message.content || "{}")); } catch {}
    if (["file", "media", "image"].includes(String(message.message_type || ""))) {
      const fileName = String(content.file_name || content.name || (message.message_type === "image" ? "需求图片.png" : "需求附件")).trim();
      return `请读取附件「${fileName}」，根据我的真实目标判断是直接回答、只读分析、执行、先规划还是拆成 Epic；未经确认不要创建或派发任务。`;
    }
    if (message.message_type !== "text") return "";
    return String(content.text || "")
      .replace(/@_user_\d+/g, "")
      .replace(/<at[^>]*>.*?<\/at>/gi, "")
      .trim();
  }

  function safeFeishuFileName(value: any, fallback: string) {
    const name = path.basename(String(value || fallback)).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
    return name || fallback;
  }

  function feishuRequirementTargets() {
    return [
      ...(typeof loadGroups === "function" ? loadGroups().map((group: any) => ({
        type: "group",
        id: group.id,
        name: group.name || group.id,
        capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
      })) : []),
      ...(typeof getConfigs === "function" ? getConfigs().map((config: any) => ({ type: "project", id: config.name, name: config.name })) : []),
    ];
  }

  async function ingestFeishuRequirementAttachment(payload: any, userText: string): Promise<RequirementIngestionResult | null> {
    const message = payload?.event?.message || {};
    const messageType = String(message.message_type || "").toLowerCase();
    const targets = feishuRequirementTargets();
    if (["file", "media", "image"].includes(messageType)) {
      let content: any = {};
      try { content = JSON.parse(String(message.content || "{}")); } catch {}
      const fileKey = String(content.file_key || content.image_key || "").trim();
      const messageId = String(message.message_id || getFeishuMessageId(payload) || "").trim();
      if (!fileKey || !messageId) throw new Error("飞书附件事件缺少资源标识");
      const image = messageType === "image" && !content.file_key;
      const fallbackName = image ? `feishu-image-${fileKey.slice(-8)}.png` : `feishu-file-${fileKey.slice(-8)}`;
      const fileName = safeFeishuFileName(content.file_name || content.name, fallbackName);
      const downloaded = await downloadFeishuMessageResource({
        messageId,
        fileKey,
        type: image ? "image" : "file",
        maxBytes: 25 * 1024 * 1024,
      });
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const savedPath = path.join(UPLOAD_DIR, `feishu-${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${fileName}`);
      fs.writeFileSync(savedPath, downloaded.buffer);
      return ingestRequirementSources({
        files: [{ filename: fileName, savedPath, size: downloaded.size }],
        userText,
        extractRequirement: true,
        decomposeRequirement: false,
        availableTargets: targets,
      });
    }
    // 纯文本直接交给 Agentic Loop；由大模型选择工作流。
    return null;
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

  async function processFeishuGlobalAgentMessage(baseUrl: string, ctx: CollabCtx, text: string, payload: any, options: { sendReport?: boolean; traceId?: string; inboundRecorded?: boolean; destination?: any; conversationId?: string } = {}) {
    const sendReport = options.sendReport !== false;
    const traceId = ensureTraceId(options.traceId, "feishu");
    const conversationId = options.conversationId || resolveFeishuGlobalAgentSessionId(payload);
    const destination = options.destination || (options.inboundRecorded ? null : recordFeishuInbound({ payload, sessionId: conversationId, messageId: getFeishuMessageId(payload) }));
    bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot" });
    const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
    const sourceIngestion = await ingestFeishuRequirementAttachment(payload, text);
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
        const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个协作群或项目执行成员下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n项目 Agent 请求额外权限时，可按通知回复“批准权限 申请ID”或“拒绝权限 申请ID”。";
        if (sendReport) await sendFeishuConversationReply({ conversationId, title: "全局 Agent 使用帮助", markdown, traceId, dedupeSuffix: "help" });
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        return markdown;
      }
      const permissionMatch = text.match(/^(批准权限|同意权限|拒绝权限|取消权限)\s+(perm_[a-f0-9]{24})[。！!\s]*$/i);
      if (permissionMatch) {
        const requestId = String(permissionMatch[2] || "");
        const request = listTaskPermissionRequests({ originType: "global", originSessionId: conversationId, state: "awaiting_user" })
          .find((item: any) => item.id === requestId);
        if (!request) {
          const markdown = "这项权限申请不属于当前飞书全局会话，或者已经处理、失效。";
          appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
          if (sendReport) await sendFeishuConversationReply({ conversationId, title: "全局 Agent 权限审批", markdown, traceId, dedupeSuffix: `permission-mismatch:${requestId}` });
          return markdown;
        }
        const decision = /^(批准|同意)/.test(permissionMatch[1]) ? "approve" : "reject";
        await postLocalApi(baseUrl, "/api/tasks/permission-requests/decide", {
          request_id: requestId,
          decision,
          reason: `用户在来源飞书会话明确${decision === "approve" ? "批准" : "拒绝"}`,
          maxUses: 1,
          expiresInMinutes: 15,
        });
        const markdown = decision === "approve"
          ? `已批准 ${request.project} 的 ${request.operation} 权限一次，有效期 15 分钟；原任务会自动继续。`
          : `已拒绝 ${request.project} 的 ${request.operation} 权限申请。`;
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport) await sendFeishuConversationReply({ conversationId, title: "全局 Agent 权限审批", markdown, traceId, dedupeSuffix: `permission:${requestId}:${decision}` });
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
          if (sendReport) await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown, traceId, dedupeSuffix: "no-confirmation" });
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
          sourceIngestion,
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
      if (sendReport) await sendFeishuConversationReply({ conversationId, title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行结果", markdown, traceId, dedupeSuffix: `run:${run.id}:${run.status}` });
      return markdown;
    } catch (error: any) {
      const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
      appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      if (sendReport) await sendFeishuConversationReply({ conversationId, title: "全局 Agent 执行失败", markdown, traceId, dedupeSuffix: "failure" });
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
    const destination = recordFeishuInbound({ payload, sessionId: conversationId, messageId });
    bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot" });
    const command = parseFeishuConversationTurnCommand(text);
    const activeRun = listGlobalAgentRuns({ sessionId: conversationId, limit: 20 })
      .find((run: any) => ["running", "supervising", "paused"].includes(String(run?.status || ""))) || null;
  
    if (command.kind === "stop") {
      if (activeRun?.id) cancelGlobalAgentRun(activeRun.id);
      void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
      const result = {
        reply: activeRun?.id
          ? "已停止当前工作。已经排队的后续消息会继续保留，你也可以发送新的要求。"
          : "当前没有正在执行的工作。已经排队的消息仍会保留。",
        stopped_run_id: activeRun?.id || "",
      };
      if (options.sendReport !== false) await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `stop:${messageId || activeRun?.id || "none"}` });
      return { ...result, report_sent: options.sendReport !== false };
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
        const continuationKind = (await decideWorkflowWithModel({
          message: command.message,
          scope: "global",
          context: { current_goal: activeRun.original_user_message || activeRun.user_message || "", phase: activeRun.status },
        })).continuationKind;
        steerGlobalAgentRun(activeRun.id, command.message, {
          kind: continuationKind,
          source: "feishu_mid_turn",
          requestId: queued.turn.request_id,
        });
        conversationTurnControl.settle({ id: queued.turn.id, status: "applied", active_run_id: activeRun.id });
        const result = { reply: "已把这条要求纳入当前工作，我会在安全节点重新核对计划并继续。", turn: queued.turn, run_id: activeRun.id };
        if (options.sendReport !== false) await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `steer:${queued.turn.id}` });
        return { ...result, report_sent: options.sendReport !== false };
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
      const result = {
        reply: `当前工作仍在进行，这条消息已排在第 ${position} 位，完成后会自动处理。发送“停止”可以结束当前工作。`,
        queued: true,
        position,
        turn: queued.turn,
      };
      if (options.sendReport !== false) await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `queue:${queued.turn.id}` });
      return { ...result, report_sent: options.sendReport !== false };
    }
  
    const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, command.message, payload, { ...options, inboundRecorded: true, destination, conversationId });
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

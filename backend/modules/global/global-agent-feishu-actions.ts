// Feishu-triggered management, media, and development dispatch actions.
export function createGlobalAgentFeishuActions(deps: any) {
  const { GLOBAL_MANAGEMENT_ACTIONS, RANDOM_MUSIC_KEYWORD, buildGlobalDirectDispatchHandoff, buildGlobalSingleProjectMissionPayload, callLocalApi, formatGlobalDevelopmentDispatchVisibleResult, formatSystemStatus, getConfigs, inferGlobalDirectDispatchRequiresCodeChanges, loadGroups, postLocalApi, postLocalSseOrJsonApi, relayGlobalTestAgentEventFromGroup, renderGlobalDirectGroupDispatchAcceptedSummary, renderGlobalDirectGroupWorkOrder } = deps

  async function executePlayMusic(baseUrl: string, input: { keyword?: string; mode?: string; source?: string; originalText?: string; sessionId?: string } = {}) {
    const raw = String(input.keyword || "").trim();
    const normalizedKeyword = raw;
    if (!normalizedKeyword) {
      return {
        success: false,
        message: "缺少要播放的歌曲或歌手关键词。",
        client_effect: null,
        command: null,
      };
    }
    const mode = String(input.mode || "").trim();
    const source = String(input.source || "global-agent").trim() || "global-agent";
    const requestText = String(input.originalText || input.keyword || raw).trim();
    const result = await postLocalApi(baseUrl, "/api/music/remote-command", {
      keyword: normalizedKeyword,
      request_text: requestText,
      mode,
      source,
      session_id: String(input.sessionId || ""),
      origin: { source, scope: "global", sessionId: String(input.sessionId || "") },
    });
    const label = normalizedKeyword === RANDOM_MUSIC_KEYWORD ? "随机播放音乐" : `「${normalizedKeyword}」`;
    const command = result.command || null;
    return {
      success: result.success !== false,
      // 用户气泡只给短确认；指令 ID 仅放 client_effect 给前端领取，不展示
      message: normalizedKeyword === RANDOM_MUSIC_KEYWORD
        ? "已接收随机点歌，正在选择并准备播放。"
        : `已接收${label}，正在选择并准备播放。`,
      keyword: normalizedKeyword,
      mode,
      command,
      client_effect: {
        type: "play_music",
        params: {
          keyword: normalizedKeyword,
          request_text: requestText,
          mode,
          command_id: command?.id || "",
        },
      },
    };
  }

  async function executeStopMusic(baseUrl: string, input: { source?: string } = {}) {
    const source = String(input.source || "global-agent").trim() || "global-agent";
    const result = await postLocalApi(baseUrl, "/api/music/remote-command", {
      type: "stop",
      keyword: "__stop__",
      source,
    });
    const command = result.command || null;
    return {
      success: result.success !== false,
      message: "已停止播放。",
      command,
      client_effect: {
        type: "stop_music",
        params: {
          command_id: command?.id || "",
        },
      },
    };
  }

  async function queueMusicPlayback(baseUrl: string, keyword: string): Promise<string> {
    const played = await executePlayMusic(baseUrl, { keyword, source: "feishu-global-agent" });
    return played.message;
  }
  
  function fillCronParams(params: any, _originalText: string, _groups: any[] = [], _projects: string[] = []) {
    const modelSchedule = String(params.schedule || params.cron || "").trim();
    const modelPrompt = String(params.prompt || params.message || params.command || "").trim();
    const modelName = String(params.name || params.title || "").trim();
    const modelTargetType = String(params.target_type || params.targetType || "").trim();
    if (modelSchedule && modelPrompt && modelName && ["group", "project"].includes(modelTargetType)) {
      return { ...params, operation: params.operation || "create", name: modelName, schedule: modelSchedule, prompt: modelPrompt, target_type: modelTargetType, group_id: params.group_id || params.groupId, project: params.project || params.projectName, workflow_type: params.workflow_type || params.workflowType || "general", enabled: params.enabled !== false, semantic_params_missing: false };
    }
    return { ...params, operation: params.operation || "create", name: modelName, schedule: modelSchedule, prompt: modelPrompt, target_type: modelTargetType, group_id: params.group_id || params.groupId, project: params.project || params.projectName, semantic_params_missing: true };
  }
  
  async function executeFeishuManagementAction(baseUrl: string, action: any, originalText = ""): Promise<string> {
    let params = { ...(action.params || {}) };
    const groups = loadGroups();
    const projects = getConfigs().map(c => c.name);
    const operation = params.operation || (action.type === "system_status" ? "inspect" : "");
    if (action.type === "manage_cron" && operation === "create") {
      params = fillCronParams(params, originalText, groups, projects);
      action = params.semantic_params_missing
        ? { ...action, params, needs_user_input: true, validated: false, missing_params: ["name", "schedule", "prompt", "target_type"] }
        : { ...action, params, needs_user_input: false, validated: true, missing_params: [] };
    }
    if ((action.requires_confirmation || ["delete", "remove_member"].includes(operation)) && action.confirmed !== true) {
      return "这是一条高风险操作，控制机器人不会直接执行。请到 CCM 全局助手界面确认后操作。";
    }
    if (action.needs_user_input || action.validated === false) {
      return `还缺少参数：${(action.missing_params || []).join("、") || "必要参数"}。请补充后重新发送。`;
    }
    let result: any;
    if (action.type === "system_status") return formatSystemStatus();
    if (action.type === "manage_cron") {
      if (operation === "list") result = await callLocalApi(baseUrl, "/api/cron");
      else if (operation === "create") result = await postLocalApi(baseUrl, "/api/cron/create", fillCronParams(params, originalText, groups, projects));
      else if (operation === "update") result = await postLocalApi(baseUrl, "/api/cron/update", params);
      else if (operation === "enable" || operation === "disable") result = await postLocalApi(baseUrl, "/api/cron/update", { id: params.id, enabled: operation === "enable" });
      else if (operation === "run") result = await postLocalApi(baseUrl, "/api/cron/run", { id: params.id });
      else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/cron/delete", { id: params.id });
    } else if (action.type === "manage_task") {
      const id = params.id || params.task_id;
      if (operation === "list") result = await callLocalApi(baseUrl, "/api/tasks");
      else if (operation === "pause") result = await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "paused", status_detail: "由飞书全局 Agent 暂停" });
      else if (operation === "resume") {
        await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "pending", status_detail: "由飞书全局 Agent 恢复" });
        result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
      } else if (operation === "continue") result = await postLocalApi(baseUrl, "/api/tasks/continue", { id, message: params.message || "由飞书全局 Agent 继续推进", auto_execute: true, idempotency_key: params.idempotency_key });
      else if (operation === "retry") result = await postLocalApi(baseUrl, "/api/tasks/retry", { id, reason: params.message || "由飞书全局 Agent 发起重试", auto_execute: true, idempotency_key: params.idempotency_key });
      else if (operation === "queue") result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
      else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/tasks/delete", { id });
    } else if (action.type === "manage_project") {
      const project = params.project || params.name;
      if (operation === "list") result = await callLocalApi(baseUrl, "/api/projects");
      else if (operation === "create") result = await postLocalApi(baseUrl, "/api/projects/create", params);
      else if (operation === "update") result = await postLocalApi(baseUrl, "/api/projects/update", { ...params, name: project });
      else if (["start", "stop", "restart", "build"].includes(operation)) result = await postLocalApi(baseUrl, "/api/projects/runtime/action", { project, profile_id: params.profile_id || params.profileId, action: operation });
      else if (operation === "connect_agent") result = await postLocalApi(baseUrl, "/api/projects/agent-connection", { project, action: "connect", agent: params.agent });
      else if (operation === "disconnect_agent") result = await postLocalApi(baseUrl, "/api/projects/agent-connection", { project, action: "disconnect" });
      else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/projects/archive", { name: project });
    } else if (action.type === "manage_group") {
      if (operation === "list") result = await callLocalApi(baseUrl, "/api/groups");
      else if (operation === "create") result = await postLocalApi(baseUrl, "/api/groups/create", { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) });
      else if (operation === "rename") result = await postLocalApi(baseUrl, "/api/groups/rename", { id: params.id || params.group_id, name: params.name });
      else if (operation === "add_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, add: params.members || [{ project: params.project }] });
      else if (operation === "remove_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, remove: params.projects || [params.project] });
      else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/groups/delete", { id: params.id || params.group_id });
    } else if (action.type === "manage_tool") {
      const kind = params.kind === "skill" ? "skill" : "mcp";
      if (operation === "status") result = await callLocalApi(baseUrl, "/api/tools/status");
      else if (operation === "reload") result = await postLocalApi(baseUrl, "/api/tools/reload", {});
      else if (operation === "list") result = await callLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp");
      else if (operation === "create") {
        const payload = { ...params }; delete payload.operation; delete payload.kind;
        result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp", payload);
      }
      else if (operation === "delete") result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills/delete" : "/api/mcp/delete", { name: params.name });
    }
    if (!result) throw new Error(`暂不支持从飞书执行 ${action.type}/${operation}`);
    if (action.type === "manage_cron" && operation === "create") {
      const cronParams = fillCronParams(params, originalText, loadGroups(), getConfigs().map(c => c.name));
      return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${result.job?.schedule || cronParams.schedule}\n- 提示词：${result.job?.prompt || cronParams.prompt}`;
    }
    if (action.type === "manage_project" && operation === "delete") {
      return `${result.message || "项目已归档，可随时恢复"}${result.audit_id ? `\n- 审计编号：${result.audit_id}` : ""}`;
    }
    const count = result.jobs?.length ?? result.tasks?.length ?? result.projects?.length ?? result.groups?.length;
    return count === undefined ? `操作已返回结果：${action.type}/${operation}` : `查询已返回 ${count} 条记录。`;
  }
  
  async function executeFeishuAction(baseUrl: string, action: any, originalText = "", traceId = "", options: { globalRunId?: string; sessionId?: string; source?: string; onEvent?: (event: any) => void } = {}): Promise<string> {
    if (!action?.type) return "";
    if (GLOBAL_MANAGEMENT_ACTIONS[action.type]) return executeFeishuManagementAction(baseUrl, { ...action, params: { ...(action.params || {}), idempotency_key: traceId || action.params?.idempotency_key } }, originalText);
    const params = action.params || {};
    if (action.type === "play_music") {
      const played = await executePlayMusic(baseUrl, {
        keyword: params.keyword || params.query || params.song || originalText,
        mode: params.mode,
        source: options.source || "feishu-global-agent",
        originalText,
        sessionId: options.sessionId,
      });
      return played.message;
    }
    if (action.type === "stop_music") {
      const stopped = await executeStopMusic(baseUrl, {
        source: options.source || "feishu-global-agent",
      });
      return stopped.message;
    }
    if (action.type === "toggle_pet") {
      const operation = params.action || params.operation || "open";
      const result = await postLocalApi(baseUrl, operation === "close" ? "/api/pets/close" : "/api/pets/launch", {});
      return result.success === false ? `桌面宠物控制失败：${result.error || "未知错误"}` : `桌面宠物已${operation === "close" ? "关闭" : "打开"}。`;
    }
    if (action.type === "navigate") {
      return `页面跳转「${params.tab || params.page || ""}」只能在 Web 控制台内执行；飞书端已记录该意图，请在 CCM 页面切换查看。`;
    }
    if (action.type === "create_cron_task") {
      const groups = loadGroups();
      const projects = getConfigs().map(c => c.name);
      const cronParams = fillCronParams(params, originalText, groups, projects);
      const result = await postLocalApi(baseUrl, "/api/cron/create", cronParams);
      return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${cronParams.schedule}\n- 提示词：${cronParams.prompt}`;
    }
    if (action.type === "orchestrate_development") {
      const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", {
        ...params,
        title: params.title || "飞书下发的全局开发任务",
        business_goal: params.business_goal || params.goal || params.title,
        source_documents: params.documents || params.source_documents || "",
        auto_execute: true,
        source: "feishu-control-bot",
        trace_id: traceId,
        idempotency_key: traceId ? `feishu:${traceId}` : undefined,
      });
      return formatGlobalDevelopmentDispatchVisibleResult(result, params);
    }
    if (action.type === "create_task") {
      const businessGoal = params.business_goal || params.businessGoal || params.message || params.title || originalText;
      const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", {
        title: params.title || "飞书下发的开发任务",
        business_goal: businessGoal,
        acceptance: params.acceptance || "群聊主 Agent 负责计划、项目子 Agent 派发与验收、TestAgent 独立复核、返工复验和最终总结",
        targets: [{
          type: "group",
          group_id: params.group_id || params.groupId,
          task: businessGoal,
          reason: "飞书全局 Agent 将复杂任务交给群聊主 Agent 完整执行。",
          requires_code_changes: params.requires_code_changes !== false,
          requires_verification: true,
          requires_independent_review: true,
        }],
        requires_code_changes: params.requires_code_changes !== false,
        requires_verification: true,
        requires_independent_review: true,
        auto_execute: true,
        source: options.source || "feishu-control-bot-create-task",
        trace_id: traceId,
        idempotency_key: traceId ? `feishu:${traceId}` : undefined,
      });
      return formatGlobalDevelopmentDispatchVisibleResult(result, params);
    }
    if (action.type === "send_group_cmd") {
      const groupId = params.group_id || params.groupId;
      const targetProject = params.target_project || params.targetProject || "coordinator";
      const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
      const group = loadGroups().find((item: any) => item.id === groupId) || null;
      const dispatch = buildGlobalDirectDispatchHandoff({
        kind: "group",
        group,
        targetProject,
        message: rawMessage,
        originalText,
        traceId,
        requiresCodeChanges: params.requires_code_changes === true,
      });
      const workOrderMessage = renderGlobalDirectGroupWorkOrder({
        group,
        targetProject,
        message: rawMessage,
        originalText,
        handoff: dispatch.handoff,
      });
      const result = await postLocalSseOrJsonApi(baseUrl, "/api/groups/send", {
        group_id: groupId,
        target_project: targetProject,
        message: workOrderMessage,
        message_mode: "project_task",
        force_task: true,
        auto_execute: true,
        requires_code_changes: params.requires_code_changes === true,
        global_handoff: dispatch.summary,
        global_direct_dispatch: {
          schema: "ccm-global-direct-dispatch-v1",
          source: "global-agent-direct-dispatch",
          global_run_id: options.globalRunId || "",
          session_id: options.sessionId || "",
          trace_id: traceId,
          handoff: dispatch.summary,
          original_text: originalText || rawMessage,
          user_goal: rawMessage,
        },
        trace_id: traceId,
        client_message_id: traceId ? `feishu-${traceId}` : undefined,
      }, {
        onEvent: (event: any) => relayGlobalTestAgentEventFromGroup(event, {
          globalRunId: options.globalRunId,
          traceId,
          status: "running",
          phase: "execute",
          onEvent: options.onEvent,
        }),
      });
      const taskId = result.task?.id || result.taskId || "";
      const queueText = result.queue?.queued
        ? `已进入执行队列（位置 ${result.queue.position || 1}）`
        : (result.queue?.message || "已保存到群聊任务链路");
      return renderGlobalDirectGroupDispatchAcceptedSummary({
        group,
        groupId,
        taskId,
        queueText,
        reply: result.reply,
      });
    }
    if (action.type === "send_project_cmd") {
      const project = params.project || params.projectName;
      const rawMessage = String(params.message || params.prompt || params.command || originalText || "").trim();
      const missionPayload = buildGlobalSingleProjectMissionPayload({
        project,
        message: rawMessage,
        originalText,
        traceId,
        globalRunId: options.globalRunId,
        sessionId: options.sessionId,
        source: options.source || "feishu-control-bot-single-project",
        idempotencyKey: traceId ? `feishu:${traceId}:single-project` : "",
        requiresCodeChanges: params.requires_code_changes === true,
      });
      const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", missionPayload);
      return formatGlobalDevelopmentDispatchVisibleResult(result, {
        title: missionPayload.title,
        business_goal: missionPayload.business_goal,
      });
    }
    if (action.type === "create_cron_task") {
      const result = await postLocalApi(baseUrl, "/api/cron/create", params);
      return `定时任务已创建：${result.job?.name || params.name || "未命名任务"}（${params.schedule}）`;
    }
    return `已识别动作 ${action.type}，但它不适合从飞书远程执行。`;
  }

  return { queueMusicPlayback, executePlayMusic, executeStopMusic, fillCronParams, executeFeishuManagementAction, executeFeishuAction }
}

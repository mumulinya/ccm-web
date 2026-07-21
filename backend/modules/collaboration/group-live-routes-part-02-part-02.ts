// Behavior-freeze split from group-live-routes-part-02.ts (part 2/2).
// Behavior-freeze split from group-live-routes.ts (part 2/2).
import * as crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson } from "../../core/utils";
import { getConfigs, loadTasks } from "../../core/db";
import {
  buildCoordinatorCollaborationInstructions,
  decomposeRequirementWithCodedCoordinator,
  getCoordinatorMember,
  getRoutableMembers,
  normalizeGroupOrchestrator,
  runGroupOrchestrator,
  selectGroupTargets,
} from "./group-orchestrator";
import {
  buildGroupMainAgentStatus,
  buildGroupStatusFollowupSummary,
  isGroupProgressStatusRequest,
} from "./group-routes";
import { buildDailyDevTaskDescription } from "./daily-dev-backlog";
import { addGroupLog, addTaskLog } from "./logs";
import { appendGroupMessage, getGroupMessages, loadGroups, resolveWritableGroupChatSession, saveGroupMessages } from "./storage";
import { acquireIdempotency, completeIdempotency, failIdempotency } from "../../system/reliability-ledger";
import { sanitizeMainAgentRoleLanguage } from "../../agents/user-facing-text";
import { ingestRequirementSources } from "../requirements/source-ingestion";
import { buildGroupDirectMemoryAction, commitGroupDirectMemoryAction } from "./group-memory-index";
import { buildExactGroupSessionModelContextPacket } from "./group-session-model-context";

import {
  GroupLiveRoutesDeps,
  buildGroupClarificationContinuationMessage,
  buildGroupClarificationSummary,
  buildGroupTaskIntakeSummary,
  compactGroupLiveText,
  groupLiveFlag,
  resolveExplicitGroupContinuationTask,
  resolvePendingGroupClarification,
  resolveStoredGroupClarification,
} from "./group-live-routes-part-01";

import { handleGroupLiveRoutesSendPreface } from "./group-live-routes-part-02-part-01";

export function handleGroupLiveRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: GroupLiveRoutesDeps,
): boolean {
  const pathname = parsed.pathname;
  const {
    writeSse,
    ensureTraceId,
    classifyGroupProjectTaskIntentWithAgent,
    shouldCreatePersistentGroupTask,
    shouldUseProjectAnalysisMode,
    classifyTaskContinuation,
    looksLikeTaskContinuation,
    continueTaskWithMessage,
    appendMainAgentDecisionTrace,
    applyMainAgentDecisionPetState,
    validateDailyDevGroupReady,
    compactMemoryText,
    buildGroupPlanModePreflight,
    createTask,
    updateTask,
    appendTaskTimelineEvent,
    buildWorkflowMeta,
    buildInlineTaskRuntime,
    updateGroupMemory,
    enqueueTask,
    buildCoordinatorSharedFilesContext,
    buildGroupProjectAnalysisContext,
    normalizePlanAssignments,
    getInitialWorkflowMeta,
    getCoordinatorActionMentions,
    processCrossAgents,
    runCoordinatorReviewLoop,
    getAgentQaItemsForGroup,
  } = deps;
  if (pathname === "/api/groups/send" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleGroupSend = async (payload: any, uploadedFiles: any[] = []) => {
      let reliabilityOperationKey = "";
      let group_id: any;
      let target_project: any;
      let groupSessionId = "";
      let userMessage = "";
      let group: any;
      let sourceIngestion: any;
      let uploadedFilesContext = "";
      let attachmentSummary = "";
      let incomingMessageForAgent = "";
      let userMessageForHistory = "";
      let messageForAgent = "";
      let effectiveUserMessage = "";
      let routing: any;
      let isBroadcast = false;
      let isOrchestrated = false;
      let targetMembers: any[] = [];
      let messageMode = "";
      let messageTraceId = "";
      let forceProjectTask = false;
      let taskIntent: any;
      let statusFollowupRequest = false;
      let persistentTaskRequest = false;
      let projectAnalysisRequest = false;
      let continuationKind = "";
      let continuationTask: any;
      let groupOperationKey = "";
      let userMsg: any;
      let clarificationContext: any;
      let clarificationRequestId = "";
      let pendingClarification: any;
      let clarificationMessageId = "";
      let explicitContinuationTask: any;
      let explicitContinuationKind = "";
      let client_message_id = "";
      let configs: any;
      try {
        const preface = await handleGroupLiveRoutesSendPreface(payload, uploadedFiles, ctx, deps, res);
        if (preface.done) return;
        ({
          payload,
          uploadedFiles,
          reliabilityOperationKey,
          group_id,
          target_project,
          groupSessionId,
          userMessage,
          group,
          sourceIngestion,
          uploadedFilesContext,
          attachmentSummary,
          incomingMessageForAgent,
          userMessageForHistory,
          messageForAgent,
          effectiveUserMessage,
          routing,
          isBroadcast,
          isOrchestrated,
          targetMembers,
          messageMode,
          messageTraceId,
          forceProjectTask,
          taskIntent,
          statusFollowupRequest,
          persistentTaskRequest,
          projectAnalysisRequest,
          continuationKind,
          continuationTask,
          groupOperationKey,
          userMsg,
          clarificationContext,
          clarificationRequestId,
          pendingClarification,
          clarificationMessageId,
          explicitContinuationTask,
          explicitContinuationKind,
          client_message_id,
          configs,
        } = preface as Exclude<typeof preface, { done: true }>);
        // 项目任务模式会创建持久工单。后续执行由可恢复任务队列持有，不依赖本次 SSE 连接。
        if (persistentTaskRequest) {
          addGroupLog(group_id, "info", "project_task_preflight", "正在核对项目执行成员与工作目录");
          const groupReadiness = validateDailyDevGroupReady(group);
          const coordinator = groupReadiness.coordinator || getCoordinatorMember(group);
          addGroupLog(group_id, "info", "project_task_preflight", "项目执行成员与工作目录已就绪", {
            ready_projects: groupReadiness.readyMembers.map((item: any) => item.project),
          });
          const attachmentRecords = sourceIngestion.attachments;
          const extractedRequirement = sourceIngestion.requirement;
          const firstDirectiveLine = effectiveUserMessage.split(/\r?\n/).map((line: string) => line.trim()).find(Boolean) || "";
          const attachmentTitle = attachmentRecords.map((file: any) => file.name).filter(Boolean).join("、");
          const taskTitle = compactMemoryText(extractedRequirement?.title || firstDirectiveLine || (attachmentTitle ? `处理需求文档：${attachmentTitle}` : "项目开发任务"), 80);
          const businessGoal = extractedRequirement?.business_goal || effectiveUserMessage || taskTitle;
          const sourceDocuments = [
            effectiveUserMessage ? `用户原始开发指令：\n${effectiveUserMessage}` : "",
            sourceIngestion.source_documents ? `用户提交的业务资料：${sourceIngestion.source_documents}` : "",
            extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
          ].filter(Boolean).join("\n\n");
          const acceptanceCriteria = [
            ...(extractedRequirement?.acceptance_criteria || []),
            "主 Agent 必须完成需求理解、计划、子 Agent 分派、执行跟踪、必要返工和最终验收。",
            "涉及代码的任务必须提供实际文件变更和已执行的构建或测试证据。",
            "最终报告必须说明完成内容、变更文件、验证结果、风险以及仍需用户处理的事项。",
          ].filter(Boolean).join(" ");
          const now = new Date().toISOString();
          const flagEnabled = (value: any, fallback = true) => {
            if (value === undefined || value === null || value === "") return fallback;
            return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
          };
          addGroupLog(group_id, "info", "project_task_preflight", "正在生成执行前计划");
          const planModePreflight = buildGroupPlanModePreflight({
            group,
            message: [businessGoal, ...(extractedRequirement?.scope || []).map((item: string) => `范围：${item}`)].join("\n") || taskTitle,
            ctx,
            configs,
            taskIntent,
            attachmentCount: attachmentRecords.length,
            coordinatorProject: coordinator.project,
          });
          const requirementEpicPlan = sourceIngestion.decomposition && sourceIngestion.decomposition.items.length > 1
            ? sourceIngestion.decomposition
            : null;
          if (requirementEpicPlan) {
            planModePreflight.requires_confirmation = true;
            planModePreflight.auto_continue = false;
            planModePreflight.requirement_epic = {
              schema: requirementEpicPlan.schema,
              epic_title: requirementEpicPlan.epic_title,
              item_count: requirementEpicPlan.items.length,
              items: requirementEpicPlan.items.map((item: any) => ({
                item_key: item.item_key,
                title: item.title,
                target_type: item.target_type,
                target_id: item.target_id,
                depends_on: item.depends_on,
                acceptance_criteria: item.acceptance_criteria,
              })),
              content_hash: requirementEpicPlan.content_hash,
              version: requirementEpicPlan.version,
            };
            if (requirementEpicPlan.clarification_questions.length) {
              planModePreflight.needs_clarification = true;
              planModePreflight.clarification_questions = [
                ...(Array.isArray(planModePreflight.clarification_questions) ? planModePreflight.clarification_questions : []),
                ...requirementEpicPlan.clarification_questions.map((question: string, index: number) => ({
                  id: `requirement-epic-question-${index + 1}`,
                  question,
                  reason: "该问题会影响子任务边界、目标项目或验收标准，未澄清前不能批量建单",
                  status: "open",
                })),
              ];
            }
            planModePreflight.risk = {
              ...(planModePreflight.risk || {}),
              level: planModePreflight.risk?.level || "medium",
              summary: `需求文档已拆成 ${requirementEpicPlan.items.length} 个持久子任务，请确认一次任务图后再开始开发`,
            };
          }
          addGroupLog(group_id, "info", "project_task_preflight", "执行前计划已生成", {
            requires_confirmation: planModePreflight.requires_confirmation === true,
            risk_level: planModePreflight.risk?.level || "",
          });
          const requestedAutoExecute = flagEnabled(payload.auto_execute ?? payload.autoExecute, true);
          const autoExecute = requestedAutoExecute && planModePreflight.requires_confirmation !== true;
          const inferredAgentQa = /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(effectiveUserMessage);
          const requiresAgentQa = flagEnabled(payload.requires_agent_qa ?? payload.requiresAgentQa, inferredAgentQa);
          const globalDirectDispatch = payload.global_direct_dispatch || payload.globalDirectDispatch || (payload.global_handoff || payload.globalHandoff ? {
            schema: "ccm-global-direct-dispatch-v1",
            source: payload.source || "global-agent-direct-dispatch",
            global_run_id: payload.global_run_id || payload.globalRunId || "",
            session_id: payload.global_session_id || payload.globalSessionId || "",
            trace_id: messageTraceId,
            handoff: payload.global_handoff || payload.globalHandoff || null,
            original_text: payload.original_text || payload.originalText || effectiveUserMessage,
            user_goal: effectiveUserMessage || taskTitle,
            accepted_at: now,
          } : null);
          let task = createTask({
            title: requirementEpicPlan?.epic_title || taskTitle,
            description: buildDailyDevTaskDescription({
              title: taskTitle,
              business_goal: businessGoal,
              scope: extractedRequirement?.scope?.length ? extractedRequirement.scope.join("；") : "由项目主 Agent 根据用户指令、附件和项目上下文识别影响范围。",
              documents: sourceDocuments,
              acceptance: acceptanceCriteria,
              constraints: "主 Agent 对任务全程负责；验收门禁未通过时不得向用户报告完成。",
              plan_mode: planModePreflight,
            }),
            target_project: coordinator.project,
            group_id,
            group_session_id: groupSessionId || undefined,
            assign_type: "group",
            priority: payload.priority || "normal",
            auto_execute: autoExecute,
            workflow_type: requirementEpicPlan ? "requirement_epic" : "daily_dev",
            requires_code_changes: flagEnabled(payload.requires_code_changes ?? payload.requiresCodeChanges, true),
            requires_verification: flagEnabled(payload.requires_verification ?? payload.requiresVerification, true),
            requires_independent_review: flagEnabled(payload.requires_independent_review ?? payload.requiresIndependentReview, false),
            requires_agent_qa: requiresAgentQa,
            business_goal: businessGoal,
            acceptance_criteria: acceptanceCriteria,
            source_documents: sourceDocuments,
            source_attachments: attachmentRecords,
            requirement_extraction: extractedRequirement,
            requirement_decomposition: requirementEpicPlan,
            decomposition_plan: requirementEpicPlan,
            requirement_content_hash: sourceIngestion.content_hash,
            source_ingestion: sourceIngestion.technical,
            intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
            intake_draft: planModePreflight,
            workflow_meta: {
              plan_mode: planModePreflight,
              intake: {
                source: clarificationContext ? "group-chat-clarification-resume" : "group-chat-project-task",
                message_mode: messageMode,
                client_message_id: client_message_id || null,
                accepted_at: now,
                attachment_count: attachmentRecords.length,
                source_summary: sourceIngestion.user_summary,
                source_ingestion: sourceIngestion.technical,
                requirement_extraction: extractedRequirement,
                requirement_decomposition: requirementEpicPlan,
                requirement_content_hash: sourceIngestion.content_hash,
                task_intent: taskIntent,
                ...(clarificationContext ? {
                  clarification_request_id: clarificationRequestId || clarificationContext.id || clarificationContext.request_id || "",
                  clarification_message_id: pendingClarification.message?.id || clarificationMessageId,
                  clarification_answer_message_id: userMsg.id,
                  original_trace_id: clarificationContext.trace_id || clarificationContext.traceId || "",
                } : {}),
                plan_mode: planModePreflight,
                requires_confirmation: planModePreflight.requires_confirmation === true,
                auto_continue: planModePreflight.auto_continue === true,
                requested_auto_execute: requestedAutoExecute,
              },
              project_mission: {
                owner_agent: coordinator.project,
                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
                user_directive: effectiveUserMessage || "请读取并完成附件中的开发需求",
              },
              ...(globalDirectDispatch ? { global_direct_dispatch: { ...globalDirectDispatch, accepted_at: globalDirectDispatch.accepted_at || now } } : {}),
            },
            trace_id: messageTraceId,
            idempotency_key: groupOperationKey ? `group-task-message:${groupOperationKey}` : null,
          });
          addGroupLog(group_id, "info", "project_task_preflight", "持久任务已创建", { task_id: task.id });
          task = updateTask(task.id, {
            auto_execute: autoExecute,
            intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
            intake_draft: planModePreflight,
            status_detail: planModePreflight.requires_confirmation
              ? "执行前计划已准备好，等待你确认后才会安排执行成员"
              : "执行前计划已就绪，低风险任务自动进入执行队列",
            workflow_meta: {
              ...(task.workflow_meta || {}),
              plan_mode: planModePreflight,
              intake: {
                ...((task.workflow_meta || {}).intake || {}),
                plan_mode: planModePreflight,
                requires_confirmation: planModePreflight.requires_confirmation === true,
                auto_continue: planModePreflight.auto_continue === true,
                requested_auto_execute: requestedAutoExecute,
              },
              project_mission: {
                ...((task.workflow_meta || {}).project_mission || {}),
                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
              },
              ...(globalDirectDispatch ? { global_direct_dispatch: { ...globalDirectDispatch, accepted_at: globalDirectDispatch.accepted_at || now } } : {}),
            },
          }) || task;
          const intakeTimelineEvent = appendTaskTimelineEvent(task.id, {
            type: planModePreflight.requires_confirmation ? "plan_mode_waiting_confirmation" : "plan_mode_auto_continue",
            title: planModePreflight.requires_confirmation ? "执行前计划已生成" : "执行前计划已就绪",
            detail: planModePreflight.risk?.summary || taskTitle,
            status: "active",
            phase: "intake",
            agent: coordinator.project,
            data: {
              attachment_count: attachmentRecords.length,
              source: clarificationContext ? "group-chat-clarification-resume" : "group-chat",
              plan_mode: planModePreflight,
              ...(clarificationContext ? { clarification_request_id: clarificationRequestId || clarificationContext.id || clarificationContext.request_id || "" } : {}),
            },
          }) as any;
          const intakeProgressCheckpoint = {
            schema: "ccm-main-agent-live-checkpoint-v1",
            id: intakeTimelineEvent?.id || `intake-${task.id}`,
            label: planModePreflight.requires_confirmation ? "执行前计划已生成" : "执行前计划已就绪",
            detail: compactMemoryText(planModePreflight.risk?.summary || taskTitle, 180),
            status: "active",
            phase: "intake",
            at: intakeTimelineEvent?.at || now,
            task_id: task.id,
          };

          const receiptMessageId = "m" + Date.now().toString(36) + "mission";
          const understoodGoal = compactMemoryText(effectiveUserMessage || task.title, 180).replace(/[。.!！]+$/g, "");
          const receiptContent = planModePreflight.requires_confirmation
            ? `我先按只读方式看了一轮：${understoodGoal}。这个需求${planModePreflight.risk?.summary ? `因为「${planModePreflight.risk.summary}」` : "需要先确认范围"}，我已经整理好执行前计划。你确认后，我再安排执行成员开始修改。`
            : `我明白了：${understoodGoal}。执行前只读检查已通过，风险较低，会进入队列开始修改和检查，进度会持续更新在下方任务卡中。`;
          const queueResult = task.auto_execute && task.intake_state !== "awaiting_confirmation"
            ? enqueueTask(task.id, ctx)
            : { queued: false, message: planModePreflight.requires_confirmation ? "任务已创建，等待用户确认执行前计划" : "任务已创建，等待手动启动" };
          const queueText = queueResult?.queued
            ? `任务已进入执行队列（位置 ${queueResult.position || 1}）`
            : `任务已保存；${queueResult?.message || "等待执行通道恢复"}`;
          const taskAfterQueue = loadTasks().find((item: any) => item.id === task.id) || task;
          const intakeSummary = buildGroupTaskIntakeSummary({
            task: taskAfterQueue,
            goal: effectiveUserMessage || taskAfterQueue.title,
            planModePreflight,
            queueResult,
            coordinator: coordinator.project,
          });
          const intakeTaskRuntime = buildInlineTaskRuntime(taskAfterQueue);
          const intakeTaskCard = intakeTaskRuntime?.taskCard || intakeTaskRuntime?.task_card || null;
          const receiptMessage = {
            id: receiptMessageId,
            role: "assistant",
            agent: coordinator.project,
            type: "project_task_intake",
            content: receiptContent,
            timestamp: now,
            task_id: task.id,
            trace_id: messageTraceId,
            task: {
              id: taskAfterQueue.id,
              title: taskAfterQueue.title,
              status: taskAfterQueue.status,
              status_detail: taskAfterQueue.status_detail || "",
              workflow_type: taskAfterQueue.workflow_type,
              attachment_count: attachmentRecords.length,
              intake_state: taskAfterQueue.intake_state,
            },
            queue: queueResult,
            intakeSummary,
            intake_summary: intakeSummary,
            workflow: buildWorkflowMeta("understanding", "我已接管"),
            planMode: planModePreflight,
            plan_mode: planModePreflight,
            taskCard: intakeTaskCard,
            task_card: intakeTaskCard,
            taskRuntime: intakeTaskRuntime,
            task_runtime: intakeTaskRuntime,
          };
          appendGroupMessage(group_id, receiptMessage);
          if (clarificationContext) resolveStoredGroupClarification(group_id, pendingClarification, userMsg.id, groupSessionId);
          updateGroupMemory(group_id, {
            groupSessionId,
            goal: effectiveUserMessage || userMessageForHistory,
            currentPhase: "understanding",
            decision: `已创建持久任务 ${task.id}`,
            reason: task.title,
            nextAction: planModePreflight.requires_confirmation ? "等待用户确认执行前计划" : "我会读取需求和项目上下文，生成执行计划并安排执行成员",
          });

          addTaskLog(task.id, queueResult?.queued ? "success" : "warning", queueText);
          if (groupOperationKey) completeIdempotency("group-task-message", groupOperationKey, { task: { id: task.id, title: task.title, status: task.status, workflow_type: task.workflow_type }, queue: queueResult });
          const mainAgentDecision = appendMainAgentDecisionTrace({
            groupId: group_id,
            traceId: messageTraceId,
            messageId: receiptMessageId,
            taskId: task.id,
            coordinator: coordinator.project,
            mode: "project_task",
            messageMode,
            taskIntent,
            dispatchPolicy: planModePreflight.requires_confirmation
              ? { action: "await_confirmation", reason: planModePreflight.risk?.summary || taskIntent.reason, nextStep: "等待用户确认执行前计划" }
              : { action: "delegate", reason: taskIntent.reason, nextStep: queueResult?.queued ? "等待执行成员执行并提交结果说明" : "等待执行通道恢复或手动启动" },
            assignments: [{ project: coordinator.project, task: task.title }],
            observations: {
              task_created: true,
              plan_mode: true,
              requires_confirmation: planModePreflight.requires_confirmation === true,
              auto_continue: planModePreflight.auto_continue === true,
              risk_level: planModePreflight.risk?.level || "low",
              risk_reasons: planModePreflight.risk?.reasons || [],
              read_only_exploration: true,
              impact_scope: planModePreflight.impact_scope,
              permission_boundaries: planModePreflight.permission_boundaries,
              auto_execute: task.auto_execute !== false,
              queued: queueResult?.queued === true,
              queue_position: queueResult?.position || 0,
              attachment_count: attachmentRecords.length,
            },
            reply: { kind: "task_card", messageId: receiptMessageId, text: receiptContent },
          });
          applyMainAgentDecisionPetState(ctx, mainAgentDecision);
          try {
            const storedMessages = getGroupMessages(group_id, groupSessionId);
            const storedIndex = storedMessages.findIndex((item: any) => item.id === receiptMessageId);
            if (storedIndex >= 0) {
              storedMessages[storedIndex] = { ...storedMessages[storedIndex], mainAgentDecision, main_agent_decision: mainAgentDecision };
              saveGroupMessages(group_id, storedMessages, groupSessionId);
            }
          } catch {}

          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          writeSse(res, {
            type: "task_created",
            agent: coordinator.project,
            text: receiptContent,
            messageId: receiptMessageId,
            task: {
              id: taskAfterQueue.id,
              title: taskAfterQueue.title,
              status: taskAfterQueue.status,
              status_detail: taskAfterQueue.status_detail || "",
              workflow_type: taskAfterQueue.workflow_type,
              attachment_count: attachmentRecords.length,
            },
            traceId: messageTraceId,
            queue: queueResult,
            intakeSummary,
            intake_summary: intakeSummary,
            workflow: receiptMessage.workflow,
            planMode: planModePreflight,
            plan_mode: planModePreflight,
            taskCard: receiptMessage.taskCard,
            task_card: receiptMessage.task_card,
            taskRuntime: receiptMessage.taskRuntime,
            task_runtime: receiptMessage.task_runtime,
            mainAgentDecision,
            progressCheckpoint: intakeProgressCheckpoint,
            progress_checkpoint: intakeProgressCheckpoint,
          });
          writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
          writeSse(res, { type: "status", text: queueText, agent: coordinator.project, taskId: task.id, progressCheckpoint: intakeProgressCheckpoint, progress_checkpoint: intakeProgressCheckpoint });
          writeSse(res, { type: "done", messageId: receiptMessageId, taskId: task.id });
          res.end();
          return;
        }

        if (isBroadcast && isOrchestrated) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          const coordinator = getCoordinatorMember(group);
          const conversationalOnly = taskIntent?.workflowDecision?.mode === "answer" || projectAnalysisRequest;
          writeSse(res, {
            type: "status",
            text: projectAnalysisRequest
              ? `🔎 正在只读分析项目...`
              : conversationalOnly
              ? `💬 正在回复...`
              : `🧠 正在协调群聊...`,
            agent: coordinator.project
          });
          ctx.setAgentActivity(coordinator.project, "working", projectAnalysisRequest ? "正在只读分析项目" : conversationalOnly ? "正在回复" : "正在协调群聊", { tab: "groups", groupId: group_id });
          ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: projectAnalysisRequest ? "正在查看项目上下文..." : conversationalOnly ? "正在回复..." : "正在协调群聊...", source: "group" });

          updateGroupMemory(group_id, {
            groupSessionId,
            ...(conversationalOnly ? {} : { goal: effectiveUserMessage || userMessageForHistory }),
            currentPhase: projectAnalysisRequest ? "project_analysis" : conversationalOnly ? "conversation" : "understanding",
            ...(conversationalOnly ? {} : {
              decision: "用户把消息交给我协调",
              reason: routing.targetLabel,
              nextAction: "我会先判断是否需要安排执行成员",
            }),
          });
          const context = buildExactGroupSessionModelContextPacket(group_id, { groupSessionId }).rendered;
          const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
          const projectAnalysisContext = projectAnalysisRequest ? buildGroupProjectAnalysisContext(group, messageForAgent, ctx, configs) : "";
          const coordinatorResult = await runGroupOrchestrator({
            group,
            message: projectAnalysisRequest
              ? `${messageForAgent}\n\n[模式]\n只读项目分析：请基于项目上下文回答用户问题，不要派发子 Agent，不要创建任务，不要承诺修改。`
              : messageForAgent,
            context: projectAnalysisRequest ? `${context}\n\n${projectAnalysisContext}` : context,
            source: "user",
            groupSessionId,
            sharedFilesContext: [sharedFilesContext, projectAnalysisContext].filter(Boolean).join("\n\n"),
          });

          try {
            const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
            const outputText = coordinatorResult.content;
            const rawPlanAssignments = normalizePlanAssignments((coordinatorResult as any).assignments || []);
            const planAssignments = conversationalOnly || projectAnalysisRequest ? [] : rawPlanAssignments;
            const dispatchPolicy = projectAnalysisRequest
              ? { action: "project_analysis", reason: taskIntent.reason, nextStep: "已基于只读项目上下文回答用户" }
              : conversationalOnly
              ? { action: "answer", reason: taskIntent.reason, nextStep: "已按普通对话回复用户" }
              : ((coordinatorResult as any).dispatchPolicy || null);
            const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "初始计划");
            const mainAgentDecision = appendMainAgentDecisionTrace({
              groupId: group_id,
              traceId: messageTraceId,
              messageId: responseMessageId,
              coordinator: coordinator.project,
              mode: projectAnalysisRequest ? "project_analysis" : planAssignments.length || dispatchPolicy?.action === "delegate" ? "delegation" : "conversation",
              messageMode,
              taskIntent,
              dispatchPolicy,
              assignments: planAssignments,
              observations: {
                context_packet: true,
                clarification_resumed: !!clarificationContext,
                clarification_request_id: clarificationRequestId || "",
                shared_files_context: !!sharedFilesContext,
                project_analysis_context: !!projectAnalysisContext,
                runtime: (coordinatorResult as any).runtime || "",
                execution_order: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              },
              reply: { kind: "assistant_message", messageId: responseMessageId, text: outputText },
            });
            const clarificationSummary = dispatchPolicy?.action === "ask_user"
              ? buildGroupClarificationSummary({
                group,
                userMessage: effectiveUserMessage,
                responseText: outputText,
                dispatchPolicy,
                analysis: (coordinatorResult as any).analysis || null,
                coordinator: coordinator.project,
              })
              : null;
            const clarificationContextRecord = clarificationSummary ? {
              schema: "ccm-group-clarification-context-v1",
              id: `group-clarification:${group_id}:${responseMessageId}`,
              status: "pending",
              group_id,
              response_message_id: responseMessageId,
              original_message: effectiveUserMessage,
              original_user_message: effectiveUserMessage,
              original_message_for_agent: messageForAgent,
              question: clarificationSummary.question,
              message_mode: messageMode,
              target_project: clarificationContext?.target_project || clarificationContext?.targetProject || target_project || "all",
              force_task: forceProjectTask,
              trace_id: clarificationContext?.trace_id || clarificationContext?.traceId || messageTraceId,
              parent_request_id: clarificationRequestId || "",
              created_at: new Date().toISOString(),
            } : null;
            applyMainAgentDecisionPetState(ctx, mainAgentDecision);
            writeSse(res, {
              type: "agent_done",
              agent: coordinator.project,
              text: outputText,
              messageId: responseMessageId,
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
              clarificationSummary,
              clarification_summary: clarificationSummary,
              clarificationContext: clarificationContextRecord,
              clarification_context: clarificationContextRecord,
            });
            writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant",
              agent: coordinator.project,
              content: outputText,
              timestamp: new Date().toISOString(),
              ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
              clarificationSummary,
              clarification_summary: clarificationSummary,
              clarificationContext: clarificationContextRecord,
              clarification_context: clarificationContextRecord,
            });
            if (clarificationContext) resolveStoredGroupClarification(group_id, pendingClarification, userMsg.id, groupSessionId);
            updateGroupMemory(group_id, {
              groupSessionId,
              currentPhase: workflowMeta.phase,
              ...(conversationalOnly ? {} : {
                decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "派发判断已整理"}`,
                reason: dispatchPolicy?.risk || "",
                nextAction: clarificationSummary?.next_action || dispatchPolicy?.nextStep || (planAssignments.length ? "等待执行成员提交结果说明" : "等待用户继续补充"),
              }),
            });

            addGroupLog(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
              response_length: outputText.length,
              response_preview: outputText.substring(0, 300),
              runtime: "coded-orchestrator",
            });

            let crossOutputs: string[] = [];
            const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
            if (validMentions.length > 0) {
              writeSse(res, { type: "status", text: "🧩 正在安排执行成员..." });
              const execOrder = (coordinatorResult as any).executionOrder || "parallel";
              crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set<string>(), execOrder, responseMessageId);
              await runCoordinatorReviewLoop({
                groupId: group_id,
                group,
                userMessage: messageForAgent,
                coordinatorOutput: outputText,
                crossOutputs,
                configs,
                ctx,
                streamRes: res,
                executionOrder: execOrder,
              });
            }
            writeSse(res, { type: "done", messageId: responseMessageId });
            res.end();
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            try { res.end(); } catch {}
          }
          return;
        }

      } catch (e: any) {
        if (reliabilityOperationKey) {
          try { failIdempotency("group-task-message", reliabilityOperationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      ctx.collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = ctx.getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = ctx.parseMultipart(buffer, boundary);
          handleGroupSend(fields, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        await handleGroupSend(JSON.parse(body));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/decompose" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, requirement, group_session_id, groupSessionId: groupSessionIdCamel } = JSON.parse(body);
        let groupSessionId = String(group_session_id || groupSessionIdCamel || "").trim();
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);
        try {
          groupSessionId = resolveWritableGroupChatSession(group_id, groupSessionId, { title: "需求分解" }).id;
        } catch (error: any) {
          const status = /不存在/.test(String(error?.message || "")) ? 404 : 409;
          return sendJson(res, { error: error.message }, status);
        }

        const configs = getConfigs();
        const coordinator = getCoordinatorMember(group);
        const members = getRoutableMembers(group);
        const memberList = members.map((m: any) => `${m.project}(${m.agent})`).join(", ");

        const tasks = decomposeRequirementWithCodedCoordinator(group, requirement);
        const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);

        const createdTasks = tasks.map(t => createTask({
          title: t.title,
          description: t.description || "",
          target_project: t.target_project || coordinator.project,
          group_id,
          group_session_id: groupSessionId || undefined,
          assign_type: "group",
          priority: t.priority || "normal"
        }));

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "decompose",
          role: "assistant",
          agent: coordinator.project,
          content: `📋 需求已分解，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i+1}. [${t.target_project}] ${t.title}`).join("\n")}`,
          timestamp: new Date().toISOString(),
          ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
        });

        sendJson(res, { success: true, tasks: createdTasks, raw_output: output });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }
  return false;
}

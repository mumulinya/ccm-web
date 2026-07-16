"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalAgentDirectDispatchRuntime = createGlobalAgentDirectDispatchRuntime;
// Direct group/project dispatch work orders and user-visible acceptance summaries.
function createGlobalAgentDirectDispatchRuntime(deps) {
    const { buildSelfContainedWorkerHandoff, compactPetText, getConfigInfo, getConfigs, normalizeText, renderSelfContainedWorkerHandoff, sanitizeMainAgentUserText, summarizeWorkerHandoffForUser } = deps;
    const GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_ids|native_session|task_agent_session|Runtime Kernel|Trace Replay|scratchpad|回执要求/i;
    function sanitizeGlobalDirectAgentOutput(value, fallback = "执行目标已返回结果，详细排障信息已放入技术详情。", max = 700) {
        let text = String(value || "").replace(/\r/g, "").trim();
        if (!text)
            return sanitizeMainAgentUserText(fallback, fallback, max);
        if (GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN.test(text)) {
            if (/error|失败|denied|invalid|权限|门禁/i.test(text))
                return sanitizeMainAgentUserText("执行时遇到需要排查的问题，详细原因已放入技术详情。", fallback, max);
            if (/done|完成|receipt|回执/i.test(text))
                return sanitizeMainAgentUserText("执行成员已提交结果说明，我会继续汇总验收。", fallback, max);
            return sanitizeMainAgentUserText(fallback, fallback, max);
        }
        text = text.replace(/\n{3,}/g, "\n\n").trim();
        return sanitizeMainAgentUserText(text.length > max ? `${text.slice(0, max)}...` : text, fallback, max);
    }
    function formatGlobalDevelopmentDispatchVisibleResult(result = {}, params = {}) {
        const title = sanitizeGlobalDirectAgentOutput(result?.mission?.title || params?.title || params?.business_goal || params?.goal || "全局开发任务", "全局开发任务", 120);
        const targetCount = Number(Array.isArray(result?.children) ? result.children.length
            : Array.isArray(params?.targets) ? params.targets.length
                : 0);
        const rejectedCount = Array.isArray(result?.rejected) ? result.rejected.length : 0;
        return [
            "全局开发任务已建立，并开始派发给相关执行目标。",
            `- 标题：${title}`,
            `- 执行目标：${targetCount} 个`,
            rejectedCount ? `- 需要留意：${rejectedCount} 个目标暂未派发成功，原因已放入技术详情。` : "",
            "- 状态：这只是已受理并进入持续跟进，不代表已经完成。",
            "- 详细记录：已同步到 CCM 任务列表和技术详情。",
        ].filter(Boolean).join("\n");
    }
    function formatGlobalTaskDispatchVisibleResult(result = {}, params = {}) {
        const title = sanitizeGlobalDirectAgentOutput(result?.task?.title || params?.title || params?.business_goal || params?.businessGoal || "协作任务", "协作任务", 120);
        const queueText = result?.queue?.queued
            ? `已进入执行队列（位置 ${result.queue.position || 1}）`
            : (result?.queue?.message || "已保存到任务链路");
        return [
            "协作任务已派发，并进入自动执行队列。",
            `- 标题：${title}`,
            `- 状态：${queueText}`,
            "- 说明：这只是已进入任务链路，不代表需求已经完成；最终结果以任务卡验收和总结为准。",
            "- 详细记录：已同步到 CCM 任务列表和技术详情。",
        ].filter(Boolean).join("\n");
    }
    function resolveGlobalDispatchProject(project) {
        const config = getConfigs().find((item) => item.name === project);
        const info = config ? (getConfigInfo(config.path)?.[0] || {}) : {};
        return {
            project,
            config,
            workDir: info.workDir || "",
            agentType: info.agent || "claudecode",
            platform: info.platform || "",
        };
    }
    function inferGlobalDirectDispatchRequiresCodeChanges(message) {
        const text = normalizeText(message);
        const explicitCodeChange = /(修改|修复|实现|新增|删除|重构|改代码|开发|接入|对接|bug|页面|接口|字段|schema|配置)/i.test(text);
        const readOnlyOnly = /(只读|仅分析|只分析|不要修改|不修改|不改代码|无需代码|无需修改|运行测试|执行测试|跑测试|检查|审查|review)/i.test(text);
        if (readOnlyOnly && !explicitCodeChange)
            return false;
        return true;
    }
    function buildGlobalDirectDispatchHandoff(input) {
        const targetProject = input.project || input.targetProject || "coordinator";
        const runtime = resolveGlobalDispatchProject(targetProject);
        const groupLabel = input.group ? `${input.group.name || input.group.id || "未命名群聊"}` : "";
        const userGoal = String(input.originalText || input.message || "").trim();
        const kindLabel = input.kind === "group" ? "群聊主 Agent" : "项目 Agent";
        const handoff = buildSelfContainedWorkerHandoff({
            group: input.group || null,
            project: targetProject,
            task: input.message,
            userGoal,
            source: "全局主 Agent 直接派发",
            reason: input.kind === "group"
                ? `全局主 Agent 判断该需求需要交给群聊「${groupLabel || input.group?.id || "目标群聊"}」的主 Agent 接管`
                : `全局主 Agent 判断该需求适合由项目「${targetProject}」直接执行`,
            workDir: runtime.workDir,
            agentType: runtime.agentType,
            traceId: input.traceId,
            analysis: {
                summary: userGoal,
                documentFindings: [
                    input.kind === "group" ? `目标群聊：${groupLabel || input.group?.id || "未指定"}` : `目标项目：${targetProject}`,
                    `接收方：${kindLabel}`,
                ],
                constraints: [
                    "用户可见回复保持自然友好，技术排障信息默认放入技术详情。",
                    "完成后必须说明完成内容、验证结果、风险和下一步。",
                ],
            },
            verificationHints: input.kind === "group"
                ? ["群聊任务卡持续展示计划、执行、验收和最终总结。"]
                : ["运行与本次指令匹配的最小必要验证；未运行必须说明原因。"],
            acceptance: [
                "用户能看懂主 Agent 当前计划、执行进度和最终结论。",
                "涉及代码时必须说明实际文件变更和验证结果。",
                "如被阻塞，明确还需要用户或其他 Agent 补充什么。",
            ],
            requiresCodeChanges: inferGlobalDirectDispatchRequiresCodeChanges(input.message),
        });
        return { handoff, summary: summarizeWorkerHandoffForUser(handoff), runtime };
    }
    function buildGlobalSingleProjectMissionPayload(input) {
        const project = String(input.project || "").trim();
        const message = String(input.message || input.originalText || "").trim();
        const userGoal = String(input.originalText || message).trim();
        const requiresCodeChanges = inferGlobalDirectDispatchRequiresCodeChanges(message);
        return {
            title: compactPetText(userGoal || message || `处理 ${project} 项目任务`, 100),
            business_goal: userGoal || message,
            acceptance: [
                "项目执行成员必须说明实际动作、文件变化、已执行验证和剩余风险。",
                "群聊主 Agent 必须先验收项目执行成员的结果，再把最新交付交给 TestAgent 独立复核。",
                "复核失败由群聊主 Agent 安排原项目执行成员返工并复验；全部门禁通过后由群聊主 Agent 输出最终总结。",
            ].join("；"),
            targets: [{
                    type: "project",
                    project,
                    task: message,
                    reason: "全局 Agent 指定目标项目；系统必须先解析该项目所属协作群，再交给群聊主 Agent 计划、派发和验收。",
                    requires_code_changes: requiresCodeChanges,
                    requires_verification: true,
                    requires_independent_review: true,
                }],
            requires_code_changes: requiresCodeChanges,
            requires_verification: true,
            requires_independent_review: true,
            auto_execute: true,
            source: input.source || "global-agent-single-project-dispatch",
            trace_id: input.traceId || "",
            global_run_id: input.globalRunId || "",
            session_id: input.sessionId || "default",
            idempotency_key: input.idempotencyKey || "",
            single_project_supervision: {
                schema: "ccm-global-to-group-supervision-v1",
                project,
                group_orchestration_required: true,
                global_agent_review_owner: false,
                test_agent_owner: "group-main-agent",
                independent_review_required: true,
                post_review_spot_check_required: true,
            },
        };
    }
    function renderGlobalDirectGroupWorkOrder(input) {
        const summary = summarizeWorkerHandoffForUser(input.handoff);
        const members = (input.group?.members || []).map((item) => item.project).filter(Boolean).slice(0, 8);
        return [
            "【全局主 Agent 指令工作单】",
            `目标群聊：${input.group?.name || input.group?.id || "未命名群聊"}`,
            `接收方：${input.targetProject || "群聊主 Agent"}`,
            members.length ? `可协作成员：${members.join("、")}` : "",
            `工作单状态：${summary.label}，目标、范围、验收和总结要求已整理好。`,
            "",
            "用户目标：",
            compactPetText(input.originalText || input.message, 900),
            "",
            "请按这个链路接管：",
            "1. 先理解目标和影响范围，必要时只读检查项目上下文。",
            "2. 形成用户能看懂的计划；如果风险高，先等用户确认。",
            "3. 需要写代码时再派发给合适的子 Agent，并持续跟踪执行和回执。",
            "4. 主 Agent 负责验收；验收不通过就返工，不能把未完成写成完成。",
            "5. 完成后给用户一份最终总结：完成了什么、改了哪里、怎么验证、还有什么风险。",
            "",
            "展示要求：普通回复只写用户能看懂的话；内部排障字段和详细记录放进技术详情。",
        ].filter(Boolean).join("\n");
    }
    function renderGlobalDirectProjectWorkOrder(input) {
        return [
            "【全局主 Agent 指令工作单】",
            `目标项目：${input.project}`,
            "",
            "面向用户的回复要求：",
            "- 用自然中文说明你理解的目标、实际动作、验证结果和风险。",
            "- 技术协议、执行细节和排障字段放在结构化回执或技术详情里，普通总结不要堆内部字段。",
            "- 如果不能完成，明确说明卡在哪里、需要谁补什么。",
            "",
            renderSelfContainedWorkerHandoff(input.handoff),
        ].join("\n");
    }
    function renderGlobalDirectGroupDispatchAcceptedSummary(input) {
        return [
            "协作群已收到工作单，并按任务链路接管。",
            `- 群聊：${input.group?.name || input.groupId || "目标群聊"}`,
            input.taskId ? "- 任务记录：已同步到任务列表和技术详情。" : "- 任务记录：已保存到群聊任务链路。",
            `- 状态：${input.queueText || "已保存到群聊任务链路"}`,
            "- 说明：这只是已派发并进入任务链路，不代表需求已经完成；最终结果以任务卡验收和最终总结为准。",
            "- 进度展示：计划、执行、验收和最终总结会显示在群聊任务卡中。",
            input.reply ? `\n协作说明：\n${sanitizeGlobalDirectAgentOutput(input.reply, "已接管，后续进度会在任务卡中更新。", 900)}` : "",
        ].filter(Boolean).join("\n");
    }
    return {
        GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN,
        sanitizeGlobalDirectAgentOutput,
        formatGlobalDevelopmentDispatchVisibleResult,
        formatGlobalTaskDispatchVisibleResult,
        resolveGlobalDispatchProject,
        inferGlobalDirectDispatchRequiresCodeChanges,
        buildGlobalDirectDispatchHandoff,
        buildGlobalSingleProjectMissionPayload,
        renderGlobalDirectGroupWorkOrder,
        renderGlobalDirectProjectWorkOrder,
        renderGlobalDirectGroupDispatchAcceptedSummary,
    };
}
//# sourceMappingURL=global-agent-direct-dispatch.js.map
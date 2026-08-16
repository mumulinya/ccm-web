"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
exports.tryBuildProjectNativeMainMessages = tryBuildProjectNativeMainMessages;
const native_session_transcript_1 = require("../../agents/native-session-transcript");
const native_query_messages_1 = require("../../agents/native-query-messages");
const transient_model_content_1 = require("../../system/transient-model-content");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const project_session_compaction_1 = require("./project-session-compaction");
const group_presented_plan_1 = require("../collaboration/group-presented-plan");
exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = `会话里已有需求、上一轮计划和工具结果视为已知；未变化的文件不要再全量读取。展开或重述计划不是派发授权。第一次为当前需求出实现计划时，允许最小只读核实以点名缝在哪。${group_presented_plan_1.PRESENTED_PLAN_SHAPE_GUIDANCE}用户已确认计划卡后调用 ccm_dispatch 时：${group_presented_plan_1.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE}`;
function tryBuildProjectNativeMainMessages(input) {
    const project = String(input.project || "").trim();
    const projectSessionId = String(input.projectSessionId || "").trim();
    const config = input.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!project || !(0, native_session_transcript_1.shouldMaterializeNativeSessionTranscript)(config, projectSessionId))
        return null;
    let projection = null;
    try {
        projection = (0, project_session_compaction_1.buildProjectSessionModelContextProjection)(project, projectSessionId, {
            currentRequest: input.userMessage,
            persistMicroCompactReceipt: false,
        });
    }
    catch {
        projection = null;
    }
    const visibleIds = new Set((projection?.visibleMessages || []).map((item) => item?.id).filter(Boolean));
    const conversation = (0, project_session_compaction_1.listProjectSessionHistoryMessages)(project, projectSessionId)
        .filter((item) => ["user", "assistant"].includes(String(item?.role || "")))
        .filter((item) => !visibleIds.size || visibleIds.has(item.id) || visibleIds.has(item.uuid));
    const history = (0, native_session_transcript_1.materializeNativeSessionTranscript)({
        family: (0, native_query_messages_1.nativeQueryFamily)(config),
        conversation,
        executionEvents: (0, project_session_compaction_1.listProjectSessionExecutionEvents)(project, projectSessionId),
        canonicalSummary: projection?.canonicalSummary ? projection.summary : null,
        metaBlocks: input.metaBlocks || [],
        currentUserText: String(input.userMessage || "").trim(),
    });
    if ((0, native_session_transcript_1.lastNativeUserText)(history) !== String(input.userMessage || "").trim())
        return null;
    const system = (0, native_session_transcript_1.splitNativeSystemSegments)({
        identityRules: input.identityRules,
        sessionGuidance: input.sessionGuidance,
        mcpPolicy: input.mcpPolicy,
    });
    return (0, transient_model_content_1.attachTransientModelBlocks)([...system, ...history], (0, transient_model_content_1.collectTransientModelBlocks)(input.toolResults || []));
}
//# sourceMappingURL=project-native-messages.js.map
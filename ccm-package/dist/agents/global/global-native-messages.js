"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
exports.tryBuildGlobalNativeModelMessages = tryBuildGlobalNativeModelMessages;
const native_session_transcript_1 = require("../native-session-transcript");
const native_query_messages_1 = require("../native-query-messages");
const transient_model_content_1 = require("../../system/transient-model-content");
const group_orchestrator_config_1 = require("../../modules/collaboration/group-orchestrator-config");
const memory_1 = require("./memory");
exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = "精确会话里已有目标、计划和工具观察视为已知；未变化的事实不要重复读取。prior_steps 里已经出现过的观察不要再当新证据。";
function tryBuildGlobalNativeModelMessages(input) {
    const sessionId = String(input.sessionId || "").trim();
    const config = input.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!(0, native_session_transcript_1.shouldMaterializeNativeSessionTranscript)(config, sessionId))
        return null;
    const transcript = (0, memory_1.loadGlobalAgentTranscript)(sessionId);
    const visible = Array.isArray(input.continuation?.visibleMessages)
        ? input.continuation.visibleMessages
        : Array.isArray(input.continuation?.messages)
            ? input.continuation.messages
            : transcript.messages;
    const conversation = (Array.isArray(visible) ? visible : [])
        .filter((item) => ["user", "assistant"].includes(String(item?.role || "")))
        .filter((item) => item?.hidden_execution !== true);
    const extraHistory = (Array.isArray(input.runHistory) ? input.runHistory : [])
        .filter((item) => ["user", "assistant"].includes(String(item?.role || "")));
    const history = (0, native_session_transcript_1.materializeNativeSessionTranscript)({
        family: (0, native_query_messages_1.nativeQueryFamily)(config),
        conversation: conversation.length ? conversation : extraHistory,
        executionEvents: transcript.executionMessages || [],
        canonicalSummary: input.continuation?.summary || null,
        metaBlocks: input.metaBlocks || [],
        currentUserText: String(input.currentUserText || "").trim(),
    });
    if ((0, native_session_transcript_1.lastNativeUserText)(history) !== String(input.currentUserText || "").trim())
        return null;
    const system = (0, native_session_transcript_1.splitNativeSystemSegments)({
        identityRules: input.identityRules,
        sessionGuidance: input.sessionGuidance,
        mcpPolicy: input.mcpPolicy,
    });
    return (0, transient_model_content_1.attachTransientModelBlocks)([...system, ...history], (0, transient_model_content_1.collectTransientModelBlocks)(input.observations || []));
}
//# sourceMappingURL=global-native-messages.js.map
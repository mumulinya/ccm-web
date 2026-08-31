"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCacheAlignedFinalMessagesFromSystemPrefix = buildCacheAlignedFinalMessagesFromSystemPrefix;
exports.buildCacheAlignedFinalMessages = buildCacheAlignedFinalMessages;
exports.runFinalSynthesisCacheAlignmentSelfTest = runFinalSynthesisCacheAlignmentSelfTest;
const native_session_transcript_1 = require("./native-session-transcript");
function dynamicInstruction(content) {
    return { role: "system", contextBlockType: "dynamic_context", content };
}
/** Preserve an already-built main-Agent system prefix for a final-answer-only call. */
function buildCacheAlignedFinalMessagesFromSystemPrefix(input) {
    const systemPrefix = [];
    for (const message of input.baseMessages || []) {
        if (String(message?.role || "") !== "system")
            break;
        systemPrefix.push(message);
    }
    return [
        ...systemPrefix,
        dynamicInstruction(input.instruction),
        { role: "user", content: JSON.stringify(input.payload) },
    ];
}
/** Build the same stable identity boundary used by a native main-Agent loop. */
function buildCacheAlignedFinalMessages(input) {
    return buildCacheAlignedFinalMessagesFromSystemPrefix({
        baseMessages: (0, native_session_transcript_1.splitNativeSystemSegments)({
            identityRules: input.identityRules,
            sessionGuidance: input.sessionGuidance,
            mcpPolicy: input.mcpPolicy,
        }),
        instruction: input.instruction,
        payload: input.payload,
    });
}
function runFinalSynthesisCacheAlignmentSelfTest() {
    const messages = buildCacheAlignedFinalMessages({
        identityRules: "stable-main-agent-v1",
        sessionGuidance: "session=s1",
        mcpPolicy: "dynamic catalog",
        instruction: "produce final answer",
        payload: { draft: "done" },
    });
    const checks = {
        stableIdentityRemainsFirst: messages[0]?.content === "stable-main-agent-v1",
        finalInstructionsStayDynamic: messages.slice(1, -1).every((message) => message?.contextBlockType === "dynamic_context"),
        finalPayloadRemainsUserSuffix: messages.at(-1)?.role === "user",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=final-synthesis-cache-alignment.js.map
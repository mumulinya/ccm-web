"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertDynamicSystemAfterStableCore = insertDynamicSystemAfterStableCore;
exports.composeNativeMessagesWithDynamicBoundary = composeNativeMessagesWithDynamicBoundary;
function insertDynamicSystemAfterStableCore(messagesInput, contentInput) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const content = String(contentInput || "").trim();
    if (!content)
        return messages;
    const layoutVersion = String(messages.find(message => message?.prefixLayoutVersion)?.prefixLayoutVersion || "ccm-prefix-layout-v4");
    const dynamic = {
        role: "system",
        contextBlockType: "dynamic_context",
        promptPart: "planning_control",
        prefixLayoutVersion: layoutVersion,
        content,
    };
    const existing = messages.findIndex(message => String(message?.role || "").toLowerCase() === "system"
        && String(message?.promptPart || "").toLowerCase() === "planning_control");
    if (existing >= 0) {
        if (String(messages[existing]?.content || "") === content)
            return messages;
        return messages.map((message, index) => index === existing ? dynamic : message);
    }
    // Planning is a replaceable system slot, not a new transcript event. Keep
    // it in the system head so later tool/user messages remain append-only.
    const firstConversation = messages.findIndex(message => String(message?.role || "").toLowerCase() !== "system");
    if (firstConversation < 0)
        return [...messages, dynamic];
    return [...messages.slice(0, firstConversation), dynamic, ...messages.slice(firstConversation)];
}
/**
 * Compose one fixed system head followed by an append-only transcript.
 * Dynamic controls are placed after the transcript. They are request-scoped
 * metadata, not conversation facts; keeping them out of the leading history
 * means a refreshed planning/session block cannot invalidate every committed
 * turn on the next request.
 */
function composeNativeMessagesWithDynamicBoundary(systemInput, historyInput) {
    const system = Array.isArray(systemInput) ? systemInput : [];
    const history = Array.isArray(historyInput) ? historyInput : [];
    const isDynamic = (message) => String(message?.contextBlockType || message?.context_block_type || "").toLowerCase() === "dynamic_context";
    const stable = system.filter(message => !isDynamic(message));
    const dynamic = system.filter(isDynamic);
    // Older checkpoints can contain dynamic controls in the middle of history.
    // They are adapter policy, not conversation facts; remove them and append
    // the current fixed slots after the transcript. The transcript normalizer
    // applies the same tail rule, so both passes are idempotent.
    const transcript = history.filter(message => !isDynamic(message));
    return [...stable, ...transcript, ...dynamic];
}
//# sourceMappingURL=provider-cache-message-layout.js.map
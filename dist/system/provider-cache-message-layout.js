"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertDynamicSystemAfterStableCore = insertDynamicSystemAfterStableCore;
function insertDynamicSystemAfterStableCore(messagesInput, contentInput) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const content = String(contentInput || "").trim();
    if (!content)
        return messages;
    const dynamic = { role: "system", contextBlockType: "dynamic_context", content };
    const stableAnchor = messages.findIndex(message => String(message?.role || "").toLowerCase() === "system"
        && String(message?.contextBlockType || message?.context_block_type || "").toLowerCase() !== "dynamic_context");
    if (stableAnchor < 0) {
        const trailingUser = messages.length - 1;
        return String(messages[trailingUser]?.role || "").toLowerCase() === "user"
            && messages[trailingUser]?.isMeta !== true
            ? [...messages.slice(0, trailingUser), dynamic, ...messages.slice(trailingUser)]
            : [...messages, dynamic];
    }
    // Dynamic controls are appended at the current conversation boundary.  A
    // trailing user message remains last; inserting after the stable system
    // block would reorder prior dynamic controls and invalidate the prefix.
    const trailingUser = messages.length - 1;
    if (String(messages[trailingUser]?.role || "").toLowerCase() === "user"
        && messages[trailingUser]?.isMeta !== true) {
        return [...messages.slice(0, trailingUser), dynamic, ...messages.slice(trailingUser)];
    }
    return [...messages, dynamic];
}
//# sourceMappingURL=provider-cache-message-layout.js.map
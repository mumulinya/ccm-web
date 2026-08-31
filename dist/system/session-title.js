"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSessionTitlePlaceholder = isSessionTitlePlaceholder;
exports.isSessionTitleAutoReplaceable = isSessionTitleAutoReplaceable;
exports.isMeaningfulSessionTitleInput = isMeaningfulSessionTitleInput;
exports.fallbackSessionTitle = fallbackSessionTitle;
exports.generateProvisionalSessionTitle = generateProvisionalSessionTitle;
exports.generateSessionTitleWithModel = generateSessionTitleWithModel;
const PLACEHOLDER_TITLES = new Set(["新会话", "新建飞书会话", "默认会话", "全局 Agent 会话", "飞书全局 Agent", "未命名会话"]);
function isSessionTitlePlaceholder(title, origin = "") {
    const normalizedOrigin = String(origin || "").toLowerCase();
    if (normalizedOrigin === "manual")
        return false;
    if (normalizedOrigin === "placeholder")
        return true;
    const value = String(title || "").trim();
    return !value || PLACEHOLDER_TITLES.has(value) || /^会话\s*\d+\s*[\u00b7-]/.test(value);
}
function isSessionTitleAutoReplaceable(title, origin = "") {
    const normalizedOrigin = String(origin || "").toLowerCase();
    if (normalizedOrigin === "manual" || normalizedOrigin === "model" || normalizedOrigin === "fallback")
        return false;
    if (normalizedOrigin === "placeholder" || normalizedOrigin === "provisional")
        return true;
    return isSessionTitlePlaceholder(title, origin);
}
function isMeaningfulSessionTitleInput(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return !!text && /\p{L}/u.test(text);
}
function cleanTitle(value) {
    let title = String(value || "")
        .replace(/```[a-z]*|```/gi, "")
        .split(/\r?\n/)[0]
        .replace(/^\s*(?:会话)?标题\s*[:：]\s*/i, "")
        .replace(/^["'“”「」『』【】*#\s]+|["'“”「」『』【】*#\s]+$/g, "")
        .replace(/[.!?。！？,，;；:：]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (title.length > 24)
        title = title.slice(0, 24).trim();
    return title;
}
function fallbackSessionTitle(input) {
    let text = String(input.userMessage || "").replace(/\s+/g, " ").trim();
    if (!isMeaningfulSessionTitleInput(text)) {
        const attachment = String(input.attachmentNames?.[0] || "").trim();
        if (attachment)
            text = `处理${attachment}`;
    }
    text = text
        .replace(/^(?:帮我|请|麻烦|帮忙|能不能|可以|给我)\s*/i, "")
        .split(/[。！？\n.!?]/)[0]
        .trim();
    return cleanTitle(text) || "新会话";
}
function generateProvisionalSessionTitle(input) {
    if (!isMeaningfulSessionTitleInput(input.userMessage) && !(input.attachmentNames || []).length) {
        return { title: "", source: "skipped" };
    }
    const title = fallbackSessionTitle(input);
    return title && !isSessionTitlePlaceholder(title)
        ? { title, source: "provisional" }
        : { title: "", source: "skipped" };
}
async function generateSessionTitleWithModel(input, options = {}) {
    const userMessage = String(input.userMessage || "").trim();
    if (!isMeaningfulSessionTitleInput(userMessage) && !(input.attachmentNames || []).length) {
        return { title: "", source: "skipped" };
    }
    const fallback = fallbackSessionTitle(input);
    // Automatic session naming is intentionally local. A title must never add a
    // hidden paid Provider call after the user's answer has already completed.
    // Tests and explicit callers may still inject a modelCall when they truly
    // need semantic renaming.
    if (!options.modelCall)
        return { title: fallback, source: "fallback" };
    const system = [
        "You generate a concise session title.",
        "Return one specific and distinguishable title in the user's conversation language, no longer than 18 characters for Chinese or 60 characters for other languages.",
        "Summarize the topic from the user's goal and the Agent's first reply; do not repeat pleasantries.",
        "No quotes, punctuation, Markdown, or explanation.",
    ].join("\n");
    const user = JSON.stringify({
        scope: input.scope,
        userMessage: userMessage.slice(0, 1200),
        assistantMessage: String(input.assistantMessage || "").slice(0, 1200),
        attachments: (input.attachmentNames || []).slice(0, 5),
    });
    try {
        const raw = await options.modelCall({ system, user, input });
        const title = cleanTitle(raw?.title || raw?.name || raw);
        if (!title || isSessionTitlePlaceholder(title))
            throw new Error("模型未返回有效标题");
        return { title, source: "model" };
    }
    catch (error) {
        return { title: fallback, source: "fallback", error: String(error?.message || error) };
    }
}
//# sourceMappingURL=session-title.js.map
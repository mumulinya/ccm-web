"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSessionTitlePlaceholder = isSessionTitlePlaceholder;
exports.isMeaningfulSessionTitleInput = isMeaningfulSessionTitleInput;
exports.fallbackSessionTitle = fallbackSessionTitle;
exports.generateSessionTitleWithModel = generateSessionTitleWithModel;
const group_orchestrator_config_1 = require("../modules/collaboration/group-orchestrator-config");
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const PLACEHOLDER_TITLES = new Set(["新会话", "默认会话", "全局 Agent 会话", "飞书全局 Agent", "未命名会话"]);
function isSessionTitlePlaceholder(title, origin = "") {
    if (String(origin || "").toLowerCase() === "manual")
        return false;
    const value = String(title || "").trim();
    return !value || PLACEHOLDER_TITLES.has(value) || /^会话\s*\d+\s*[\u00b7-]/.test(value);
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
async function defaultModelCall(system, user) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if ((0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)) {
        return (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, {
            system,
            messages: [{ role: "user", content: user }],
            temperature: 0.1,
            maxTokens: 64,
            defaultTimeoutMs: 20_000,
            httpErrorPrefix: "会话标题模型调用失败:",
        });
    }
    return (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.1,
        maxTokens: 64,
        defaultTimeoutMs: 20_000,
        httpErrorPrefix: "会话标题模型调用失败:",
    });
}
async function generateSessionTitleWithModel(input, options = {}) {
    const userMessage = String(input.userMessage || "").trim();
    if (!isMeaningfulSessionTitleInput(userMessage) && !(input.attachmentNames || []).length) {
        return { title: "", source: "skipped" };
    }
    const fallback = fallbackSessionTitle(input);
    const system = [
        "你是会话标题生成器。",
        "只输出一个简洁、具体、可区分的中文标题，不超过 18 个字。",
        "根据用户目标与 Agent 首轮回复概括主题，不要复述客套话。",
        "不要引号、不要标点、不要 Markdown、不要输出解释。",
    ].join("\n");
    const user = JSON.stringify({
        scope: input.scope,
        userMessage: userMessage.slice(0, 1200),
        assistantMessage: String(input.assistantMessage || "").slice(0, 1200),
        attachments: (input.attachmentNames || []).slice(0, 5),
    });
    try {
        const raw = options.modelCall
            ? await options.modelCall({ system, user, input })
            : await defaultModelCall(system, user);
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
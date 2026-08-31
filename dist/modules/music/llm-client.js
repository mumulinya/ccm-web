"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callMusicLlm = callMusicLlm;
exports.generateSongQuote = generateSongQuote;
exports.classifySongEmotion = classifySongEmotion;
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
async function callMusicLlm(config, prompt, options = {}) {
    const request = {
        system: options.system,
        messages: [{ role: "user", content: prompt }],
        maxTokens: options.maxTokens || 120,
        temperature: options.temperature ?? 0.4,
        defaultTimeoutMs: options.timeoutMs || 10_000,
        httpErrorPrefix: "音乐助手模型请求失败",
    };
    const content = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, request)
        : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, request);
    return String(content || "").trim();
}
async function generateSongQuote(config, title, artist = "未知") {
    return callMusicLlm(config, `Write one poetic listening thought for the song "${title}" by ${artist}. Return one sentence only, no quotation marks, and keep it under 20 Chinese characters when the user language is Chinese.`, { system: "You are the CCM music reflection assistant.", maxTokens: 60, temperature: 0.8 });
}
async function classifySongEmotion(config, title, artist, labels) {
    const raw = await callMusicLlm(config, `Which emotion best matches the song "${title}" by ${artist || "unknown"}? Return exactly one label from this list: ${labels.join(", ")}.`, { system: "You are the CCM music emotion classifier. Return only the requested label.", maxTokens: 20, temperature: 0.2 });
    return labels.find(label => raw.includes(label)) || "";
}
//# sourceMappingURL=llm-client.js.map
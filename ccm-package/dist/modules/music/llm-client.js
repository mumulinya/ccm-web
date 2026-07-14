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
    return callMusicLlm(config, `请根据歌曲“${title}”（歌手：${artist}）写一句有诗意的听歌感悟。只输出一句，20个汉字以内，不要引号。`, { system: "你是音乐感悟助手。", maxTokens: 60, temperature: 0.8 });
}
async function classifySongEmotion(config, title, artist, labels) {
    const raw = await callMusicLlm(config, `歌曲“${title}”（歌手：${artist || "未知"}）最符合哪个情绪？只从这些标签中输出一个：${labels.join("、")}`, { system: "你是音乐情绪分析助手，只输出指定标签。", maxTokens: 20, temperature: 0.2 });
    return labels.find(label => raw.includes(label)) || "";
}
//# sourceMappingURL=llm-client.js.map
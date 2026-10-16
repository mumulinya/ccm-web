"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaLyricProxy = void 0;
exports.foliaSegmentLyrics = foliaSegmentLyrics;
exports.foliaTheme = foliaTheme;
const llm_client_1 = require("../llm-client");
const state_1 = require("../state");
// Folia 原生歌词通道与 AI 主题沿用 CCM 网络和统一模型配置。
var lyric_proxy_1 = require("./lyric-proxy");
Object.defineProperty(exports, "foliaLyricProxy", { enumerable: true, get: function () { return lyric_proxy_1.foliaLyricProxy; } });
async function foliaSegmentLyrics(input) {
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 100 || input.lines.some((line) => typeof line !== 'string' || line.length > 2000))
        throw new Error('无效歌词分词请求');
    const prompts = require('./lyricSegmentationPrompt.cjs');
    const raw = await (0, llm_client_1.callMusicLlm)((0, state_1.loadMusicAgentConfig)(), prompts.buildSegmentationSourcePrompt(input.lines), { system: prompts.buildSegmentationSystemPrompt(), maxTokens: 8192, timeoutMs: 60_000 });
    return { lines: prompts.parseSegmentationResponse(raw, input.lines).boundaries };
}
async function foliaTheme(input) {
    const contract = require('./theme-contract.cjs');
    if (typeof input.lyricsText !== 'string' || !input.lyricsText.trim())
        throw new Error('缺少主题来源歌词');
    const raw = await (0, llm_client_1.callMusicLlm)((0, state_1.loadMusicAgentConfig)(), contract.buildThemeSourcePrompt(input.lyricsText.slice(0, 2000), !!input.isPureMusic, input.songTitle || ''), { maxTokens: 4096, timeoutMs: 60_000, system: contract.buildThemeSystemPrompt(true) });
    const theme = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
    for (const item of [theme.light, theme.dark]) {
        if (!item || !['backgroundColor', 'primaryColor', 'accentColor', 'secondaryColor'].every(key => /^#[0-9a-f]{6}$/i.test(item[key])))
            throw new Error('模型未返回有效主题');
    }
    return contract.sanitizeDualTheme(theme);
}
//# sourceMappingURL=auxiliary.js.map
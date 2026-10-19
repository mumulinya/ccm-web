"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaLyricProxy = void 0;
exports.foliaSegmentLyrics = foliaSegmentLyrics;
exports.foliaTheme = foliaTheme;
const ai_runtime_1 = require("./ai-runtime");
const context_1 = require("./context");
// Folia 原生歌词通道与 AI 主题沿用 CCM 网络和统一模型配置。
var lyric_proxy_1 = require("./lyric-proxy");
Object.defineProperty(exports, "foliaLyricProxy", { enumerable: true, get: function () { return lyric_proxy_1.foliaLyricProxy; } });
async function foliaSegmentLyrics(input, owner = (0, context_1.currentFoliaOwner)()) {
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 100 || input.lines.some((line) => typeof line !== 'string' || line.length > 2000))
        throw new Error('无效歌词分词请求');
    const prompts = require('./lyricSegmentationPrompt.cjs');
    const raw = await (0, ai_runtime_1.runFoliaAi)(owner, prompts.buildSegmentationSourcePrompt(input.lines), { system: prompts.buildSegmentationSystemPrompt(), maxTokens: 8192, timeoutMs: 60_000,
        schema: prompts.SEGMENTATION_JSON_SCHEMA, schemaName: prompts.SEGMENTATION_SCHEMA_NAME, geminiSchema: prompts.SEGMENTATION_GEMINI_SCHEMA });
    return { lines: prompts.parseSegmentationResponse(raw, input.lines).boundaries };
}
async function foliaTheme(input, owner = (0, context_1.currentFoliaOwner)()) {
    const contract = require('./theme-contract.cjs');
    if (typeof input.lyricsText !== 'string' || !input.lyricsText.trim())
        throw new Error('缺少主题来源歌词');
    const raw = await (0, ai_runtime_1.runFoliaAi)(owner, contract.buildThemeSourcePrompt(input.lyricsText.slice(0, 2000), !!input.isPureMusic, input.songTitle || ''), { maxTokens: 4096, timeoutMs: 60_000, system: contract.buildThemeSystemPrompt(true), schema: contract.THEME_JSON_SCHEMA, schemaName: 'dual_theme', geminiSchema: contract.geminiThemeSchema() });
    const theme = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
    for (const item of [theme.light, theme.dark]) {
        if (!item || !['backgroundColor', 'primaryColor', 'accentColor', 'secondaryColor'].every(key => /^#[0-9a-f]{6}$/i.test(item[key])))
            throw new Error('模型未返回有效主题');
    }
    return contract.sanitizeDualTheme(theme);
}
//# sourceMappingURL=auxiliary.js.map
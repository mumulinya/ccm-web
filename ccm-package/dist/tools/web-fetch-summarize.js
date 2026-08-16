"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWebFetchSummarizerConfigured = assertWebFetchSummarizerConfigured;
exports.summarizeWebFetchPage = summarizeWebFetchPage;
const SUMMARIZE_INPUT_CHARS = 24_000;
function assertWebFetchSummarizerConfigured(config) {
    const resolved = config || require("../modules/collaboration/group-orchestrator-config").loadOrchestratorConfig();
    if (!resolved?.enabled || !String(resolved.apiUrl || "").trim() || !String(resolved.apiKey || "").trim() || !String(resolved.model || "").trim()) {
        throw new Error("web_fetch 需要统一大模型配置才能按 prompt 摘要页面；当前未配置模型，未返回页面原文。");
    }
    return resolved;
}
async function summarizeWebFetchPage(input) {
    const prompt = String(input.prompt || "").trim();
    if (!prompt)
        throw new Error("web_fetch 需要 prompt：说明你想从该页面得到什么");
    const config = assertWebFetchSummarizerConfigured();
    const { callLlm } = require("../modules/global/global-agent-model");
    const page = String(input.markdown || "").slice(0, SUMMARIZE_INPUT_CHARS);
    const summary = await callLlm(config, [
        { role: "system", content: "根据用户 prompt 从网页内容中提取相关信息。只用页面里有的事实；没有的内容明确说页面未提供。不要编造。" },
        { role: "user", content: `URL: ${input.url}\n标题: ${input.title || ""}\n用户想了解: ${prompt}\n\n页面内容:\n${page}` },
    ], { maxTokens: 700 });
    const text = String(summary || "").trim();
    if (!text)
        throw new Error("web_fetch 摘要为空：模型未返回可用内容，未回退为页面原文。");
    return text;
}
//# sourceMappingURL=web-fetch-summarize.js.map
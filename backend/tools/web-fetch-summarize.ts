const SUMMARIZE_INPUT_CHARS = 24_000;

export function assertWebFetchSummarizerConfigured(config?: any) {
  const resolved = config || require("../modules/collaboration/group-orchestrator-config").loadOrchestratorConfig();
  if (!resolved?.enabled || !String(resolved.apiUrl || "").trim() || !String(resolved.apiKey || "").trim() || !String(resolved.model || "").trim()) {
    throw new Error("web_fetch 需要统一大模型配置才能按 prompt 摘要页面；当前未配置模型，未返回页面原文。");
  }
  return resolved;
}

export async function summarizeWebFetchPage(input: { title?: string; url: string; markdown: string; prompt: string }) {
  const prompt = String(input.prompt || "").trim();
  if (!prompt) throw new Error("web_fetch 需要 prompt：说明你想从该页面得到什么");
  const config = assertWebFetchSummarizerConfigured();
  const { callLlm } = require("../modules/global/global-agent-model");
  const page = String(input.markdown || "").slice(0, SUMMARIZE_INPUT_CHARS);
  const summary = await callLlm(config, [
    { role: "system", content: "Extract the information requested by the user from the web page. Use only facts present in the page; explicitly say when the page does not provide something. Do not invent facts." },
    { role: "user", content: `URL: ${input.url}\nTitle: ${input.title || ""}\nUser request: ${prompt}\n\nPage content:\n${page}` },
  ], { maxTokens: 700 });
  const text = String(summary || "").trim();
  if (!text) throw new Error("web_fetch 摘要为空：模型未返回可用内容，未回退为页面原文。");
  return text;
}

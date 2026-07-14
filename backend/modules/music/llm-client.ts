import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  shouldUseAnthropic,
} from "../collaboration/group-orchestrator-llm-client";

export async function callMusicLlm(
  config: any,
  prompt: string,
  options: { system?: string; maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
) {
  const request = {
    system: options.system,
    messages: [{ role: "user", content: prompt }],
    maxTokens: options.maxTokens || 120,
    temperature: options.temperature ?? 0.4,
    defaultTimeoutMs: options.timeoutMs || 10_000,
    httpErrorPrefix: "音乐助手模型请求失败",
  };
  const content = shouldUseAnthropic(config)
    ? await callAnthropicCompatibleChat(config, request)
    : await callOpenAiCompatibleChat(config, request);
  return String(content || "").trim();
}

export async function generateSongQuote(config: any, title: string, artist = "未知") {
  return callMusicLlm(
    config,
    `请根据歌曲“${title}”（歌手：${artist}）写一句有诗意的听歌感悟。只输出一句，20个汉字以内，不要引号。`,
    { system: "你是音乐感悟助手。", maxTokens: 60, temperature: 0.8 },
  );
}

export async function classifySongEmotion(config: any, title: string, artist: string, labels: string[]) {
  const raw = await callMusicLlm(
    config,
    `歌曲“${title}”（歌手：${artist || "未知"}）最符合哪个情绪？只从这些标签中输出一个：${labels.join("、")}`,
    { system: "你是音乐情绪分析助手，只输出指定标签。", maxTokens: 20, temperature: 0.2 },
  );
  return labels.find(label => raw.includes(label)) || "";
}

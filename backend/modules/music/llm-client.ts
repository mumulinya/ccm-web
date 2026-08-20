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
    `Write one poetic listening thought for the song "${title}" by ${artist}. Return one sentence only, no quotation marks, and keep it under 20 Chinese characters when the user language is Chinese.`,
    { system: "You are the CCM music reflection assistant.", maxTokens: 60, temperature: 0.8 },
  );
}

export async function classifySongEmotion(config: any, title: string, artist: string, labels: string[]) {
  const raw = await callMusicLlm(
    config,
    `Which emotion best matches the song "${title}" by ${artist || "unknown"}? Return exactly one label from this list: ${labels.join(", ")}.`,
    { system: "You are the CCM music emotion classifier. Return only the requested label.", maxTokens: 20, temperature: 0.2 },
  );
  return labels.find(label => raw.includes(label)) || "";
}

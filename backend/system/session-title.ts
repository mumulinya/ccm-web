import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  shouldUseAnthropic,
} from "../modules/collaboration/group-orchestrator-llm-client";

export type SessionTitleInput = {
  scope: "global" | "group" | "project";
  userMessage: string;
  assistantMessage?: string;
  attachmentNames?: string[];
};

export type SessionTitleResult = {
  title: string;
  source: "model" | "fallback" | "provisional" | "skipped";
  error?: string;
};

const PLACEHOLDER_TITLES = new Set(["新会话", "新建飞书会话", "默认会话", "全局 Agent 会话", "飞书全局 Agent", "未命名会话"]);

export function isSessionTitlePlaceholder(title: any, origin: any = "") {
  const normalizedOrigin = String(origin || "").toLowerCase();
  if (normalizedOrigin === "manual") return false;
  if (normalizedOrigin === "placeholder") return true;
  const value = String(title || "").trim();
  return !value || PLACEHOLDER_TITLES.has(value) || /^会话\s*\d+\s*[\u00b7-]/.test(value);
}

export function isSessionTitleAutoReplaceable(title: any, origin: any = "") {
  const normalizedOrigin = String(origin || "").toLowerCase();
  if (normalizedOrigin === "manual" || normalizedOrigin === "model" || normalizedOrigin === "fallback") return false;
  if (normalizedOrigin === "placeholder" || normalizedOrigin === "provisional") return true;
  return isSessionTitlePlaceholder(title, origin);
}

export function isMeaningfulSessionTitleInput(value: any) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return !!text && /\p{L}/u.test(text);
}

function cleanTitle(value: any) {
  let title = String(value || "")
    .replace(/```[a-z]*|```/gi, "")
    .split(/\r?\n/)[0]
    .replace(/^\s*(?:会话)?标题\s*[:：]\s*/i, "")
    .replace(/^["'“”「」『』【】*#\s]+|["'“”「」『』【】*#\s]+$/g, "")
    .replace(/[.!?。！？,，;；:：]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length > 24) title = title.slice(0, 24).trim();
  return title;
}

export function fallbackSessionTitle(input: SessionTitleInput) {
  let text = String(input.userMessage || "").replace(/\s+/g, " ").trim();
  if (!isMeaningfulSessionTitleInput(text)) {
    const attachment = String(input.attachmentNames?.[0] || "").trim();
    if (attachment) text = `处理${attachment}`;
  }
  text = text
    .replace(/^(?:帮我|请|麻烦|帮忙|能不能|可以|给我)\s*/i, "")
    .split(/[。！？\n.!?]/)[0]
    .trim();
  return cleanTitle(text) || "新会话";
}

export function generateProvisionalSessionTitle(input: SessionTitleInput): SessionTitleResult {
  if (!isMeaningfulSessionTitleInput(input.userMessage) && !(input.attachmentNames || []).length) {
    return { title: "", source: "skipped" };
  }
  const title = fallbackSessionTitle(input);
  return title && !isSessionTitlePlaceholder(title)
    ? { title, source: "provisional" }
    : { title: "", source: "skipped" };
}

async function defaultModelCall(system: string, user: string) {
  const config = loadOrchestratorConfig();
  if (shouldUseAnthropic(config)) {
    return callAnthropicCompatibleChat(config, {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.1,
      maxTokens: 64,
      defaultTimeoutMs: 20_000,
      retryProfile: "background_auxiliary",
      httpErrorPrefix: "会话标题模型调用失败:",
    });
  }
  return callOpenAiCompatibleChat(config, {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.1,
    maxTokens: 64,
    defaultTimeoutMs: 20_000,
    retryProfile: "background_auxiliary",
    httpErrorPrefix: "会话标题模型调用失败:",
  });
}

export async function generateSessionTitleWithModel(
  input: SessionTitleInput,
  options: { modelCall?: (request: { system: string; user: string; input: SessionTitleInput }) => Promise<any> } = {},
): Promise<SessionTitleResult> {
  const userMessage = String(input.userMessage || "").trim();
  if (!isMeaningfulSessionTitleInput(userMessage) && !(input.attachmentNames || []).length) {
    return { title: "", source: "skipped" };
  }
  const fallback = fallbackSessionTitle(input);
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
    const raw = options.modelCall
      ? await options.modelCall({ system, user, input })
      : await defaultModelCall(system, user);
    const title = cleanTitle(raw?.title || raw?.name || raw);
    if (!title || isSessionTitlePlaceholder(title)) throw new Error("模型未返回有效标题");
    return { title, source: "model" };
  } catch (error: any) {
    return { title: fallback, source: "fallback", error: String(error?.message || error) };
  }
}

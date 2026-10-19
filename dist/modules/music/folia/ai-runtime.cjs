var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// integrations/folia/shared/lyricSegmentationPrompt.cjs
var require_lyricSegmentationPrompt = __commonJS({
  "integrations/folia/shared/lyricSegmentationPrompt.cjs"(exports2, module2) {
    "use strict";
    var SEGMENTATION_DELIMITER = "/";
    var SEGMENTATION_SCHEMA_NAME = "lyric_word_segmentation";
    var SEGMENTATION_JSON_SCHEMA = {
      type: "object",
      additionalProperties: false,
      properties: {
        lines: {
          type: "array",
          items: { type: "array", items: { type: "string" } }
        }
      },
      required: ["lines"]
    };
    var SEGMENTATION_GEMINI_SCHEMA = {
      type: "OBJECT",
      properties: {
        lines: {
          type: "ARRAY",
          description: "One entry per input line, in order; each is that line split into words.",
          items: {
            type: "ARRAY",
            description: "The segments of one lyric line, which concatenate back to it exactly.",
            items: { type: "STRING" }
          }
        }
      },
      required: ["lines"]
    };
    var SEGMENTATION_MAX_OUTPUT_TOKENS = 8192;
    var SEGMENTATION_GEMINI_GENERATION_CONFIG = {
      responseMimeType: "application/json",
      responseSchema: SEGMENTATION_GEMINI_SCHEMA,
      maxOutputTokens: SEGMENTATION_MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingBudget: 0 }
    };
    var REASONING_SUPPRESSION_ATTEMPTS = [
      // OpenAI's own spelling, accepted by DeepSeek and a growing number of compatible servers.
      { params: { reasoning_effort: "none" } },
      // vLLM / SGLang pass this through to the chat template; it is how Qwen3 turns thinking off.
      { params: { chat_template_kwargs: { enable_thinking: false } } },
      // Nothing to disable, or nothing we know how to disable.
      { params: {} }
    ];
    var SEGMENTATION_SYSTEM_PROMPT = [
      "You segment song lyrics into words for a typography engine.",
      "",
      "You receive numbered lyric lines. For each line, split it into the units a human reader would",
      "treat as single words, and return them in order.",
      "",
      "Hard rules, in priority order:",
      "1. Lossless. Concatenating one line\u2019s segments must reproduce that line character for character,",
      "   including every space, punctuation mark and symbol. Never add, drop, reorder or normalise a",
      "   character. Never translate, romanise, or correct spelling.",
      "2. Same count. Return exactly one segment array per input line, in the same order.",
      "3. Split at meaning, not at characters. For Chinese, Japanese and Korean, group characters into",
      "   real words and set phrases (\u4E0D\u77E5\u9053 / \u5B64\u72EC\u7684 / \u30AD\u30E9\u30AD\u30E9), not one character per segment.",
      "   Keep verb\u2013complement and noun\u2013suffix pairs together when they read as one word.",
      "4. One word per segment. A segment carries a single content word plus the grammatical tail glued",
      "   to it. If a segment still holds a second noun, verb or adjective, split it again. Spaces are",
      "   not the only split points: a Japanese or Chinese line usually has none and still needs one",
      "   segment per word. Returning a whole clause, or a whole line, as one segment is a failure.",
      "5. Japanese specifically: split before every content word, and keep each content word together",
      "   with the okurigana, auxiliaries and particles that follow it (\u898B\u3048\u306A\u3044 / \u3088\u3046\u306B / \u96C6\u3081\u305F\u3044 /",
      "   \u3051\u3069). Sentence-final particles (\u3088 / \u306D / \u3055) attach to what precedes them.",
      "6. Keep space-delimited words whole for Latin scripts, and keep contractions such as it\u2019s or",
      "   don\u2019t in one segment.",
      "7. Attach trailing punctuation to the segment it follows (\u4E16\u754C\u3002 not \u4E16\u754C + \u3002). A bracket or quote",
      "   stays in one segment with the text it wraps ((\u62FC\u56FE\u5973\u5B69) not ( + \u62FC\u56FE\u5973\u5B69 + )). A space belongs",
      "   to the segment that precedes it.",
      '8. The "N. " prefix on each input line is numbering added by this request. It is NOT part of the',
      "   lyric. Never include it in a segment.",
      "",
      "Examples. Given:",
      "  1. \u628A\u56DE\u5FC6\u62FC\u597D\u7ED9\u4F60",
      "  2. It\u2019s unbelievable, isn\u2019t it?",
      "  3. \u3044\u3063\u3071\u3044\u3042\u308B\u3093\u3060\u3088\u6B32\u3057\u3044\u3082\u306E",
      "  4. \u898B\u3048\u306A\u3044\u3088\u3046\u306B\u3055 \u96A0\u3057\u3066\u3082",
      "answer exactly:",
      '  {"lines": [["\u628A", "\u56DE\u5FC6", "\u62FC\u597D", "\u7ED9", "\u4F60"], ["It\u2019s ", "unbelievable, ", "isn\u2019t ", "it?"], ["\u3044\u3063\u3071\u3044", "\u3042\u308B\u3093\u3060\u3088", "\u6B32\u3057\u3044", "\u3082\u306E"], ["\u898B\u3048\u306A\u3044", "\u3088\u3046\u306B", "\u3055 ", "\u96A0\u3057\u3066\u3082"]]}',
      "",
      'Respond with JSON only: {"lines": [["seg", "seg"], ["seg"]]}. No prose, no code fence.'
    ].join("\n");
    var buildSegmentationSystemPrompt = () => SEGMENTATION_SYSTEM_PROMPT;
    var buildSegmentationSourcePrompt = (lines) => {
      const numbered = lines.map((text, index) => `${index + 1}. ${text}`).join("\n");
      return `Segment these ${lines.length} lyric lines.

${numbered}`;
    };
    var buildSegmentationManualPrompt = (lines) => [
      SEGMENTATION_SYSTEM_PROMPT,
      "",
      `If you cannot produce JSON, answer with ${lines.length} plain lines instead, separating words`,
      `with "${SEGMENTATION_DELIMITER}" and nothing else.`,
      "",
      buildSegmentationSourcePrompt(lines)
    ].join("\n");
    var stripCodeFence = (text) => {
      const trimmed = String(text == null ? "" : text).trim();
      if (!trimmed.startsWith("```")) {
        return trimmed;
      }
      return trimmed.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```$/, "");
    };
    var WHITESPACE = /\s/;
    var MAX_DIAGNOSTIC_CHARS = 160;
    var clip = (text) => text.length > MAX_DIAGNOSTIC_CHARS ? `${text.slice(0, MAX_DIAGNOSTIC_CHARS)}\u2026` : text;
    var firstDifference = (expected, got) => {
      const limit = Math.min(expected.length, got.length);
      for (let index = 0; index < limit; index += 1) {
        if (expected[index] !== got[index]) {
          return index;
        }
      }
      return expected.length === got.length ? -1 : limit;
    };
    var realignSegmentsToText = (boundaries, text) => {
      if (boundaries.join("") === text) {
        return boundaries;
      }
      const slices = [];
      let cursor = 0;
      for (const boundary of boundaries) {
        const wanted = boundary.replace(/\s+/gu, "");
        if (!wanted) {
          continue;
        }
        const start = cursor;
        let matched = 0;
        while (cursor < text.length && matched < wanted.length) {
          const char = text[cursor];
          if (WHITESPACE.test(char)) {
            cursor += 1;
            continue;
          }
          if (char !== wanted[matched]) {
            return null;
          }
          matched += 1;
          cursor += 1;
        }
        if (matched < wanted.length) {
          return null;
        }
        slices.push(text.slice(start, cursor));
      }
      if (slices.length === 0) {
        return null;
      }
      const tail = text.slice(cursor);
      if (tail.trim()) {
        return null;
      }
      slices[slices.length - 1] += tail;
      return slices;
    };
    var parseSegmentationResponse = (raw, lines) => {
      const text = stripCodeFence(raw);
      if (!text) {
        throw new Error("Empty segmentation response");
      }
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Segmentation response was not valid JSON: ${clip(text)}`);
      }
      const rows = Array.isArray(parsed) ? parsed : parsed && parsed.lines;
      if (!Array.isArray(rows)) {
        throw new Error('Segmentation response had no "lines" array');
      }
      if (rows.length !== lines.length) {
        throw new Error(`Segmentation response had ${rows.length} lines, expected ${lines.length}`);
      }
      const boundaries = [];
      const rejections = [];
      rows.forEach((row, index) => {
        if (!Array.isArray(row)) {
          boundaries.push(null);
          rejections.push(`line ${index + 1} was not an array`);
          return;
        }
        const realigned = realignSegmentsToText(row.map((segment) => String(segment)), lines[index]);
        if (realigned) {
          boundaries.push(realigned);
          return;
        }
        const got = row.join("");
        const at = firstDifference(lines[index], got);
        boundaries.push(null);
        rejections.push(
          `line ${index + 1} does not reproduce the original text (first difference at character ${at + 1}); expected ${JSON.stringify(clip(lines[index]))} got ${JSON.stringify(clip(got))}`
        );
      });
      if (rejections.length === rows.length) {
        throw new Error(`Segmentation reproduced none of the lines. First problem: ${rejections[0]}`);
      }
      return { boundaries, rejections };
    };
    module2.exports = {
      REASONING_SUPPRESSION_ATTEMPTS,
      SEGMENTATION_DELIMITER,
      SEGMENTATION_GEMINI_GENERATION_CONFIG,
      SEGMENTATION_GEMINI_SCHEMA,
      SEGMENTATION_MAX_OUTPUT_TOKENS,
      realignSegmentsToText,
      SEGMENTATION_JSON_SCHEMA,
      SEGMENTATION_SCHEMA_NAME,
      buildSegmentationManualPrompt,
      buildSegmentationSourcePrompt,
      buildSegmentationSystemPrompt,
      parseSegmentationResponse
    };
  }
});

// integrations/folia/shared/openAICompatibleRequest.mjs
var openAICompatibleRequest_exports = {};
__export(openAICompatibleRequest_exports, {
  detectOpenAICompatibleProvider: () => detectOpenAICompatibleProvider,
  rejectsOpenAICompatibleParameter: () => rejectsOpenAICompatibleParameter,
  resetOpenAICompatibleCapabilities: () => resetOpenAICompatibleCapabilities,
  sendOpenAICompatibleRequest: () => sendOpenAICompatibleRequest
});
var capabilityCache, getCapabilities, resetOpenAICompatibleCapabilities, detectOpenAICompatibleProvider, parseErrorPayload, rejectionPattern, rejectsOpenAICompatibleParameter, sendOpenAICompatibleRequest;
var init_openAICompatibleRequest = __esm({
  "integrations/folia/shared/openAICompatibleRequest.mjs"() {
    "use strict";
    capabilityCache = /* @__PURE__ */ new Map();
    getCapabilities = (apiUrl, model) => {
      const key = JSON.stringify([apiUrl, model]);
      let capabilities = capabilityCache.get(key);
      if (!capabilities) {
        capabilities = {};
        capabilityCache.set(key, capabilities);
      }
      return capabilities;
    };
    resetOpenAICompatibleCapabilities = () => capabilityCache.clear();
    detectOpenAICompatibleProvider = (apiUrl) => {
      try {
        const hostname = new URL(apiUrl).hostname.toLowerCase();
        if (hostname === "api.deepseek.com" || hostname.endsWith(".deepseek.com")) return "deepseek";
        if (hostname === "api.openai.com" || hostname.endsWith(".openai.com")) return "openai";
      } catch {
      }
      return "generic";
    };
    parseErrorPayload = (text) => {
      try {
        return JSON.parse(text.replace(/^OpenAI compatible API error \(\d+\):\s*/, ""));
      } catch {
        return null;
      }
    };
    rejectionPattern = (parameter) => {
      const escaped = parameter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        `(?:unsupported|invalid|unknown|unrecognized|not allowed)\\s+(?:(?:parameter|argument|field)\\s*)?[:=]?\\s*["']?${escaped}\\b|\\b${escaped}\\b\\s+(?:is\\s+)?(?:unsupported|not supported|not allowed|unrecognized)|extra_forbidden[^\\r\\n]*\\bloc(?:ation)?\\s*[:=]\\s*["']?${escaped}\\b|\\bloc(?:ation)?\\s*[:=]\\s*["']?${escaped}\\b[^\\r\\n]*extra_forbidden`,
        "i"
      );
    };
    rejectsOpenAICompatibleParameter = (status, text, parameter) => {
      if (status !== 400 && status !== 422 || /rate.?limit|concurrency|quota/i.test(text)) return false;
      const payload = parseErrorPayload(text);
      if (payload && typeof payload === "object") {
        const error = payload.error && typeof payload.error === "object" ? payload.error : null;
        const exactParameter = error?.param ?? payload.param;
        if (exactParameter === parameter) {
          const detail = `${error?.code ?? payload.code ?? ""} ${error?.message ?? payload.message ?? ""}`;
          return /unsupported|invalid|unknown|unrecognized|not allowed|extra_forbidden/i.test(detail);
        }
        if (Array.isArray(payload.detail)) {
          return payload.detail.some((issue) => Array.isArray(issue?.loc) && issue.loc.includes(parameter) && (issue.type === "extra_forbidden" || /extra inputs are not permitted/i.test(issue.msg || "")));
        }
        const message = error?.message ?? payload.message;
        return typeof message === "string" && rejectionPattern(parameter).test(message);
      }
      return rejectionPattern(parameter).test(text);
    };
    sendOpenAICompatibleRequest = async ({
      apiUrl,
      provider,
      body,
      init,
      fetchImpl = fetch
    }) => {
      const requestBody = { ...body };
      const capabilities = getCapabilities(apiUrl, requestBody.model);
      if (provider !== "openai" && capabilities.responseFormat === false) delete requestBody.response_format;
      if (capabilities.thinking === false) delete requestBody.thinking;
      if (capabilities.tokenField === "max_completion_tokens" && requestBody.max_tokens !== void 0) {
        requestBody.max_completion_tokens = requestBody.max_tokens;
        delete requestBody.max_tokens;
      }
      for (; ; ) {
        const response = await fetchImpl(apiUrl, { ...init, body: JSON.stringify(requestBody) });
        if (response.ok) {
          if (provider !== "openai") {
            if (requestBody.max_completion_tokens !== void 0) capabilities.tokenField = "max_completion_tokens";
            else if (requestBody.max_tokens !== void 0) capabilities.tokenField = "max_tokens";
          }
          return response;
        }
        if (provider === "openai" || response.status !== 400 && response.status !== 422) return response;
        const text = await response.clone().text();
        if (requestBody.response_format && (rejectsOpenAICompatibleParameter(response.status, text, "response_format") || rejectsOpenAICompatibleParameter(response.status, text, "json_schema"))) {
          delete requestBody.response_format;
          capabilities.responseFormat = false;
          console.info("[ai] endpoint rejected response_format; retrying without it");
          continue;
        }
        if (requestBody.thinking && rejectsOpenAICompatibleParameter(response.status, text, "thinking")) {
          delete requestBody.thinking;
          capabilities.thinking = false;
          console.info("[ai] endpoint rejected thinking; retrying without it");
          continue;
        }
        if (requestBody.max_tokens !== void 0 && rejectsOpenAICompatibleParameter(response.status, text, "max_tokens")) {
          requestBody.max_completion_tokens = requestBody.max_tokens;
          delete requestBody.max_tokens;
          console.info("[ai] endpoint rejected max_tokens; retrying with max_completion_tokens");
          continue;
        }
        return response;
      }
    };
  }
});

// integrations/folia/electron/aiTextClient.cjs
var require_aiTextClient = __commonJS({
  "integrations/folia/electron/aiTextClient.cjs"(exports2, module2) {
    "use strict";
    var { REASONING_SUPPRESSION_ATTEMPTS } = require_lyricSegmentationPrompt();
    var DEFAULT_OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    var DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
    var DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";
    var DEFAULT_OPENAI_TEMPERATURE = 0.7;
    var GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";
    var DEFAULT_AI_TIMEOUT_MS = 12e4;
    var timeoutSignal = (timeoutMs) => {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(timeoutMs);
      }
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeoutMs).unref?.();
      return controller.signal;
    };
    var describeFetchFailure = (error, timeoutMs, label) => {
      const name = error && error.name;
      if (name === "TimeoutError" || name === "AbortError") {
        return new Error(`${label} timed out after ${Math.round(timeoutMs / 1e3)}s`);
      }
      return error instanceof Error ? error : new Error(String(error));
    };
    function normalizeOpenAIChatCompletionsUrl(rawUrl) {
      const trimmedUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
      if (!trimmedUrl) {
        return DEFAULT_OPENAI_CHAT_COMPLETIONS_URL;
      }
      try {
        const parsed = new URL(trimmedUrl);
        const normalizedPath = parsed.pathname.replace(/\/+$/, "");
        if (!normalizedPath || normalizedPath === "/") {
          parsed.pathname = "/v1/chat/completions";
          return parsed.toString();
        }
        if (/\/v\d+$/.test(normalizedPath)) {
          parsed.pathname = `${normalizedPath}/chat/completions`;
          return parsed.toString();
        }
        parsed.pathname = normalizedPath;
        return parsed.toString();
      } catch {
        return trimmedUrl.replace(/\/+$/, "");
      }
    }
    function resolveOpenAICompatibleModel(apiUrl, configuredModel) {
      const trimmedModel = typeof configuredModel === "string" ? configuredModel.trim() : "";
      if (trimmedModel) {
        return trimmedModel;
      }
      try {
        const hostname = new URL(apiUrl).hostname.toLowerCase();
        if (hostname === "api.deepseek.com" || hostname.endsWith(".deepseek.com")) {
          return DEEPSEEK_DEFAULT_MODEL;
        }
      } catch {
      }
      return DEFAULT_OPENAI_MODEL;
    }
    function detectOpenAICompatibleProvider2(apiUrl) {
      try {
        const hostname = new URL(apiUrl).hostname.toLowerCase();
        if (hostname === "api.deepseek.com" || hostname.endsWith(".deepseek.com")) {
          return "deepseek";
        }
        if (hostname === "api.openai.com" || hostname.endsWith(".openai.com")) {
          return "openai";
        }
      } catch {
      }
      return "generic";
    }
    function providerSupportsStructuredOutputs(provider) {
      return provider === "openai";
    }
    var reasoningAttemptCache = /* @__PURE__ */ new Map();
    var exhaustedByReasoning = (choice, usage) => {
      const reasoningTokens = usage && usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens;
      const hasReasoning = Boolean(
        reasoningTokens || choice && choice.message && choice.message.reasoning_content
      );
      return hasReasoning && choice && choice.finish_reason === "length";
    };
    function resolveOpenAICompatibleTemperature(value) {
      const temperature = typeof value === "number" ? value : Number.parseFloat(String(value ?? "").trim());
      return Number.isFinite(temperature) && temperature >= 0 && temperature <= 2 ? temperature : DEFAULT_OPENAI_TEMPERATURE;
    }
    function extractProviderErrorMessage(payload) {
      if (!payload || typeof payload !== "object") {
        return null;
      }
      const error = payload.error;
      if (typeof error === "string") {
        return error;
      }
      if (error && typeof error === "object" && typeof error.message === "string") {
        return error.message;
      }
      return typeof payload.message === "string" ? payload.message : null;
    }
    async function formatOpenAICompatibleError(response) {
      const rawText = await response.text();
      let detail = rawText.trim();
      try {
        const parsed = JSON.parse(rawText);
        detail = extractProviderErrorMessage(parsed) || detail;
      } catch {
      }
      return detail ? `OpenAI compatible API error (${response.status}): ${detail}` : `OpenAI compatible API error (${response.status}): ${response.statusText}`;
    }
    function describeEmptyCompletion(choice, usage, model) {
      const reasoningTokens = usage && usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens;
      const finishReason = choice && choice.finish_reason;
      const hasReasoning = Boolean(
        reasoningTokens || choice && choice.message && choice.message.reasoning_content
      );
      if (hasReasoning && finishReason === "length") {
        return `Model "${model}" used its entire output budget on reasoning${reasoningTokens ? ` (${reasoningTokens} reasoning tokens)` : ""} and returned no answer. This is a reasoning model doing a mechanical task. Point the app at a non-reasoning model, or raise the token limit if the provider ignores reasoning_effort.`;
      }
      if (finishReason === "length") {
        return `Model "${model}" hit the output token limit before finishing its answer.`;
      }
      return `Model "${model}" returned an empty response${finishReason ? ` (finish_reason: ${finishReason})` : ""}.`;
    }
    function extractResponseContentText(message) {
      if (!message) {
        return null;
      }
      if (typeof message.refusal === "string" && message.refusal.trim()) {
        throw new Error(`Model refused request: ${message.refusal}`);
      }
      if (typeof message.content === "string") {
        return message.content;
      }
      if (Array.isArray(message.content)) {
        const text = message.content.filter((part) => part && typeof part === "object").filter((part) => part.type === "text" && typeof part.text === "string").map((part) => part.text).join("");
        return text || null;
      }
      return null;
    }
    function buildOpenAICompatibleRequestBody(model, provider, systemPrompt, sourcePrompt, temperature, schema, schemaName, maxTokens, extraParams, stream) {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: sourcePrompt }
      ];
      const limit = maxTokens ? { [provider === "openai" ? "max_completion_tokens" : "max_tokens"]: maxTokens } : {};
      const reasoning = extraParams || {};
      const streaming = stream === true ? { stream: true } : {};
      if (schema && schemaName && providerSupportsStructuredOutputs(provider)) {
        return {
          model,
          messages,
          temperature,
          ...limit,
          ...reasoning,
          ...streaming,
          response_format: {
            type: "json_schema",
            json_schema: { name: schemaName, strict: true, schema }
          }
        };
      }
      return {
        model,
        messages,
        temperature,
        ...limit,
        ...reasoning,
        ...streaming,
        response_format: { type: "json_object" }
      };
    }
    function createOpenAIStreamAccumulator() {
      let buffer = "";
      let content = "";
      let refusal = "";
      let reasoning = "";
      let finishReason = null;
      let usage;
      let model;
      let sawData = false;
      let done = false;
      let foreign = "";
      const handleData = (payloadText) => {
        sawData = true;
        if (done) {
          return;
        }
        if (payloadText === "[DONE]") {
          done = true;
          return;
        }
        let payload;
        try {
          payload = JSON.parse(payloadText);
        } catch {
          return;
        }
        if (!payload || typeof payload !== "object") {
          return;
        }
        if (payload.error) {
          throw new Error(`OpenAI compatible API error (stream): ${extractProviderErrorMessage(payload) || JSON.stringify(payload.error)}`);
        }
        if (payload.usage && typeof payload.usage === "object") {
          usage = payload.usage;
        }
        if (typeof payload.model === "string" && payload.model) {
          model = payload.model;
        }
        const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
        if (!choice) {
          return;
        }
        const delta = choice.delta;
        if (delta && typeof delta === "object") {
          if (typeof delta.content === "string") {
            content += delta.content;
          }
          if (typeof delta.refusal === "string") {
            refusal += delta.refusal;
          }
          if (typeof delta.reasoning_content === "string") {
            reasoning += delta.reasoning_content;
          }
        }
        if (typeof choice.finish_reason === "string" && choice.finish_reason) {
          finishReason = choice.finish_reason;
        }
      };
      const handleLine = (line) => {
        if (!line || line.startsWith(":")) {
          return;
        }
        if (line.startsWith("data:")) {
          handleData(line.slice(5).replace(/^ /, "").trim());
          return;
        }
        if (/^(event|id|retry)(:|$)/.test(line)) {
          return;
        }
        if (!sawData) {
          foreign += `${line}
`;
        }
      };
      const drain = (final) => {
        const lines = buffer.split(/\r\n|\n|\r/);
        buffer = final ? "" : lines.pop();
        for (const line of lines) {
          handleLine(line);
        }
        if (final && buffer) {
          handleLine(buffer);
        }
      };
      return {
        push(text) {
          buffer += text;
          drain(false);
        },
        finish() {
          drain(true);
          if (!sawData && foreign.trim().startsWith("{")) {
            let parsed = null;
            try {
              parsed = JSON.parse(foreign);
            } catch {
            }
            if (parsed && parsed.error) {
              throw new Error(`OpenAI compatible API error (stream): ${extractProviderErrorMessage(parsed) || JSON.stringify(parsed.error)}`);
            }
            const choice2 = parsed && Array.isArray(parsed.choices) ? parsed.choices[0] : null;
            if (choice2) {
              return { choice: choice2, usage: parsed.usage, model: typeof parsed.model === "string" ? parsed.model : void 0, content: extractResponseContentText(choice2.message), done: true };
            }
          }
          const message = { content };
          if (refusal) {
            message.refusal = refusal;
          }
          if (reasoning) {
            message.reasoning_content = reasoning;
          }
          const choice = { finish_reason: finishReason, message };
          return { choice, usage, model, content: extractResponseContentText(message), done };
        }
      };
    }
    async function readOpenAIStreamResponse(response) {
      const accumulator = createOpenAIStreamAccumulator();
      if (!response.body || typeof response.body.getReader !== "function") {
        accumulator.push(await response.text());
        return accumulator.finish();
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        for (; ; ) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          accumulator.push(decoder.decode(value, { stream: true }));
        }
        accumulator.push(decoder.decode());
        return accumulator.finish();
      } catch (error) {
        reader.cancel().catch(() => {
        });
        throw error;
      }
    }
    async function sendOpenAICompatible({ apiUrl, apiKey, body, customFetch, timeoutMs }) {
      let response;
      try {
        const { sendOpenAICompatibleRequest: sendOpenAICompatibleRequest2 } = await Promise.resolve().then(() => (init_openAICompatibleRequest(), openAICompatibleRequest_exports));
        response = await sendOpenAICompatibleRequest2({
          apiUrl,
          provider: detectOpenAICompatibleProvider2(apiUrl),
          body,
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            signal: timeoutSignal(timeoutMs)
          },
          fetchImpl: customFetch
        });
      } catch (error) {
        throw describeFetchFailure(error, timeoutMs, `Request to ${apiUrl}`);
      }
      if (!response.ok) {
        return { ok: false, status: response.status, errorText: await formatOpenAICompatibleError(response) };
      }
      if (body && body.stream === true) {
        try {
          return { ok: true, status: response.status, ...await readOpenAIStreamResponse(response) };
        } catch (error) {
          throw describeFetchFailure(error, timeoutMs, `Reading the response from ${apiUrl}`);
        }
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw describeFetchFailure(error, timeoutMs, `Reading the response from ${apiUrl}`);
      }
      const choice = data.choices && data.choices[0];
      return {
        ok: true,
        status: response.status,
        choice,
        usage: data.usage,
        model: typeof data.model === "string" ? data.model : void 0,
        content: extractResponseContentText(choice && choice.message)
      };
    }
    async function runOpenAICompatibleCompletion({ store, systemPrompt, sourcePrompt, schema, schemaName, customFetch, timeoutMs = DEFAULT_AI_TIMEOUT_MS, maxTokens, disableReasoning }) {
      const apiKey = store.get("OPENAI_API_KEY");
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured in settings");
      }
      const apiUrl = normalizeOpenAIChatCompletionsUrl(store.get("OPENAI_API_URL"));
      const model = resolveOpenAICompatibleModel(apiUrl, store.get("OPENAI_API_MODEL"));
      const temperature = resolveOpenAICompatibleTemperature(store.get("OPENAI_API_TEMPERATURE"));
      const provider = detectOpenAICompatibleProvider2(apiUrl);
      const stream = store.get("OPENAI_API_STREAM") === true;
      const attempts = disableReasoning ? REASONING_SUPPRESSION_ATTEMPTS : [{ params: {} }];
      const cacheKey = `${apiUrl}|${model}`;
      const learned = disableReasoning ? reasoningAttemptCache.get(cacheKey) : 0;
      const firstIndex = typeof learned === "number" ? learned : 0;
      const { rejectsOpenAICompatibleParameter: rejectsOpenAICompatibleParameter2 } = await Promise.resolve().then(() => (init_openAICompatibleRequest(), openAICompatibleRequest_exports));
      let lastEmpty = null;
      for (let index = firstIndex; index < attempts.length; index += 1) {
        const { params } = attempts[index];
        const isLastAttempt = index === attempts.length - 1;
        const budget = isLastAttempt && disableReasoning && maxTokens ? maxTokens * 4 : maxTokens;
        const reasoningParams = disableReasoning && provider === "deepseek" ? { thinking: { type: "disabled" }, ...params } : params;
        const body = buildOpenAICompatibleRequestBody(
          model,
          provider,
          systemPrompt,
          sourcePrompt,
          temperature,
          schema,
          schemaName,
          budget,
          reasoningParams,
          stream
        );
        const described = Object.keys(params).length ? Object.keys(params).join("+") : "plain";
        console.log(`[ai] POST ${apiUrl} model=${model} provider=${provider} reasoning=${described}${stream ? " stream=on" : ""}`);
        const startedAt = Date.now();
        const result = await sendOpenAICompatible({ apiUrl, apiKey, body, customFetch, timeoutMs });
        if (!result.ok) {
          if (!isLastAttempt && Object.keys(params).some((key) => rejectsOpenAICompatibleParameter2(result.status, result.errorText, key))) {
            console.log(`[ai] ${described} rejected by the endpoint, trying the next option`);
            continue;
          }
          throw new Error(result.errorText);
        }
        console.log(`[ai] ${apiUrl} answered in ${Date.now() - startedAt}ms`);
        if (result.content) {
          reasoningAttemptCache.set(cacheKey, index);
          return result.content;
        }
        lastEmpty = result;
        if (!isLastAttempt && exhaustedByReasoning(result.choice, result.usage)) {
          console.log(`[ai] ${described} did not stop the model reasoning, trying the next option`);
          continue;
        }
        break;
      }
      throw new Error(describeEmptyCompletion(
        lastEmpty && lastEmpty.choice,
        lastEmpty && lastEmpty.usage,
        model
      ));
    }
    async function runGeminiCompletion({ store, systemPrompt, sourcePrompt, responseSchema, generationConfig, customFetch, timeoutMs = DEFAULT_AI_TIMEOUT_MS, maxTokens }) {
      const apiKey = store.get("GEMINI_API_KEY");
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in settings");
      }
      console.log("[ai] POST gemini-3-flash-preview");
      const startedAt = Date.now();
      let response;
      try {
        response = await customFetch(GEMINI_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: sourcePrompt }] }],
            // A caller with tuned settings (a thinking budget, a schema) passes the whole config;
            // otherwise it is assembled from the individual options.
            generationConfig: generationConfig ?? {
              responseMimeType: "application/json",
              ...responseSchema ? { responseSchema } : {},
              ...maxTokens ? { maxOutputTokens: maxTokens } : {}
            }
          }),
          signal: timeoutSignal(timeoutMs)
        });
      } catch (error) {
        throw describeFetchFailure(error, timeoutMs, "Request to Gemini");
      }
      console.log(`[ai] gemini headers ${response.status} in ${Date.now() - startedAt}ms, reading body\u2026`);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ""}`);
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw describeFetchFailure(error, timeoutMs, "Reading the response from Gemini");
      }
      console.log(`[ai] gemini body complete in ${Date.now() - startedAt}ms total`);
      const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content ? data.candidates[0].content.parts : null;
      const jsonText = Array.isArray(parts) ? (parts.find((part) => part && typeof part.text === "string") || {}).text : null;
      if (!jsonText) {
        throw new Error("Model returned an empty response");
      }
      return jsonText;
    }
    async function runAiJsonCompletion({ store, systemPrompt, sourcePrompt, schema, schemaName, geminiResponseSchema, geminiGenerationConfig, customFetch, timeoutMs, maxTokens, disableReasoning }) {
      const provider = store.get("AI_PROVIDER") || "gemini";
      return provider === "openai" ? runOpenAICompatibleCompletion({ store, systemPrompt, sourcePrompt, schema, schemaName, customFetch, timeoutMs, maxTokens, disableReasoning }) : runGeminiCompletion({ store, systemPrompt, sourcePrompt, responseSchema: geminiResponseSchema, generationConfig: geminiGenerationConfig, customFetch, timeoutMs, maxTokens });
    }
    var AI_TEST_TIMEOUT_MS = 3e4;
    var AI_TEST_MAX_TOKENS = 512;
    var AI_TEST_PROMPT = "hello";
    var AI_TEST_MAX_REPLY_CHARS = 500;
    var AI_TEST_MAX_ERROR_CHARS = 500;
    var AI_TEST_MAX_FIELD_CHARS = { apiKey: 1024, apiUrl: 2048, model: 256 };
    var truncateText = (text, limit) => text.length > limit ? `${text.slice(0, limit)}\u2026` : text;
    var redactUrl = (rawUrl) => {
      try {
        const parsed = new URL(rawUrl);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[invalid url]";
      }
    };
    function validateAiConnectionTestInput(raw) {
      if (!raw || typeof raw !== "object") {
        return { error: "Invalid request." };
      }
      const provider = raw.provider;
      if (provider !== "gemini" && provider !== "openai") {
        return { error: "Unknown AI provider." };
      }
      const readString = (name) => {
        const value = raw[name];
        if (value === void 0 || value === null) {
          return "";
        }
        if (typeof value !== "string" || value.length > AI_TEST_MAX_FIELD_CHARS[name]) {
          return null;
        }
        return value.trim();
      };
      const apiKey = readString("apiKey");
      const apiUrl = provider === "openai" ? readString("apiUrl") : "";
      const model = provider === "openai" ? readString("model") : "";
      if (apiKey === null || apiUrl === null || model === null) {
        return { error: "A setting value is too long or has the wrong type." };
      }
      if (apiUrl) {
        let parsed;
        try {
          parsed = new URL(apiUrl);
        } catch {
          return { error: "API URL is not a valid URL." };
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { error: "API URL must start with http:// or https://." };
        }
      }
      return {
        config: {
          provider,
          apiKey,
          apiUrl,
          model,
          stream: provider === "openai" && raw.stream === true
        }
      };
    }
    function buildOpenAICompatibleTestBody(model, provider, stream) {
      return {
        model,
        messages: [{ role: "user", content: AI_TEST_PROMPT }],
        [provider === "openai" ? "max_completion_tokens" : "max_tokens"]: AI_TEST_MAX_TOKENS,
        ...stream ? { stream: true } : {}
      };
    }
    async function runAiConnectionTest(rawInput, { customFetch, timeoutMs = AI_TEST_TIMEOUT_MS, now = Date.now } = {}) {
      const validated = validateAiConnectionTestInput(rawInput);
      if (validated.error) {
        return { ok: false, durationMs: 0, errorKind: "invalid", error: validated.error };
      }
      const { provider, apiKey, apiUrl: rawApiUrl, model: rawModel, stream } = validated.config;
      const startedAt = now();
      const finish = (result2) => ({ durationMs: now() - startedAt, ...result2 });
      const redact = (message) => {
        let text2 = String(message);
        if (apiKey) {
          text2 = text2.split(apiKey).join("***");
        }
        return text2.replace(/(bearer\s+)[^\s"',;]+/gi, "$1***").replace(/(x-goog-api-key["']?\s*[:=]\s*["']?)[^\s"',;]+/gi, "$1***").replace(/([?&](?:key|api[_-]?key|token|access_token)=)[^&\s"']+/gi, "$1***");
      };
      const scrub = (message) => truncateText(redact(message), AI_TEST_MAX_ERROR_CHARS);
      const failure = (error, extra = {}) => finish({
        ok: false,
        error: scrub(error instanceof Error ? error.message : error),
        ...extra
      });
      if (!apiKey) {
        return finish({
          ok: false,
          errorKind: "config",
          error: provider === "gemini" ? "GEMINI_API_KEY is not configured in settings" : "OPENAI_API_KEY is not configured in settings"
        });
      }
      if (provider === "gemini") {
        console.log("[ai-test] POST gemini-3-flash-preview");
        let response;
        try {
          response = await customFetch(GEMINI_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: AI_TEST_PROMPT }] }],
              // thinkingBudget 0 as in SEGMENTATION_GEMINI_GENERATION_CONFIG: gemini-3-flash-preview
              // thinks by default and would spend the budget before answering "hello".
              generationConfig: { maxOutputTokens: AI_TEST_MAX_TOKENS, thinkingConfig: { thinkingBudget: 0 } }
            }),
            signal: timeoutSignal(timeoutMs)
          });
        } catch (error) {
          const failed = describeFetchFailure(error, timeoutMs, "Request to Gemini");
          return failure(failed, { errorKind: /timed out/.test(failed.message) ? "timeout" : "network" });
        }
        if (!response.ok) {
          let errText = "";
          try {
            errText = await response.text();
          } catch {
          }
          return failure(`Gemini API error: ${response.status} ${response.statusText}${errText ? ` - ${errText}` : ""}`, {
            status: response.status,
            errorKind: "http"
          });
        }
        let data;
        try {
          data = await response.json();
        } catch (error) {
          const failed = describeFetchFailure(error, timeoutMs, "Reading the response from Gemini");
          return failure(failed, { status: response.status, errorKind: /timed out/.test(failed.message) ? "timeout" : "network" });
        }
        const candidate = data && data.candidates && data.candidates[0];
        const parts = candidate && candidate.content ? candidate.content.parts : null;
        const text2 = Array.isArray(parts) ? parts.filter((part) => part && typeof part.text === "string").map((part) => part.text).join("") : "";
        const modelName = data && typeof data.modelVersion === "string" ? data.modelVersion : "gemini-3-flash-preview";
        if (!text2.trim()) {
          const reason = candidate && candidate.finishReason === "MAX_TOKENS" ? "reasoning" : "empty";
          return finish({ ok: true, status: response.status, model: modelName, text: "", emptyReason: reason });
        }
        return finish({ ok: true, status: response.status, model: modelName, text: truncateText(redact(text2), AI_TEST_MAX_REPLY_CHARS) });
      }
      const apiUrl = normalizeOpenAIChatCompletionsUrl(rawApiUrl);
      const model = resolveOpenAICompatibleModel(apiUrl, rawModel);
      const compatProvider = detectOpenAICompatibleProvider2(apiUrl);
      console.log(`[ai-test] POST ${redactUrl(apiUrl)} model=${model} provider=${compatProvider}${stream ? " stream=on" : ""}`);
      let result;
      try {
        result = await sendOpenAICompatible({
          apiUrl,
          apiKey,
          body: buildOpenAICompatibleTestBody(model, compatProvider, stream),
          customFetch,
          timeoutMs
        });
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error)).split(apiUrl).join(redactUrl(apiUrl));
        return failure(message, { errorKind: /timed out/.test(message) ? "timeout" : "network" });
      }
      if (!result.ok) {
        return failure(result.errorText.split(apiUrl).join(redactUrl(apiUrl)), { status: result.status, errorKind: "http" });
      }
      const shownModel = result.model || model;
      const text = typeof result.content === "string" ? result.content : "";
      if (!text.trim()) {
        return finish({
          ok: true,
          status: result.status,
          model: shownModel,
          text: "",
          emptyReason: exhaustedByReasoning(result.choice, result.usage) ? "reasoning" : "empty"
        });
      }
      return finish({ ok: true, status: result.status, model: shownModel, text: truncateText(redact(text), AI_TEST_MAX_REPLY_CHARS) });
    }
    module2.exports = {
      DEFAULT_AI_TIMEOUT_MS,
      DEEPSEEK_DEFAULT_MODEL,
      DEFAULT_OPENAI_CHAT_COMPLETIONS_URL,
      DEFAULT_OPENAI_MODEL,
      DEFAULT_OPENAI_TEMPERATURE,
      buildOpenAICompatibleRequestBody,
      createOpenAIStreamAccumulator,
      describeEmptyCompletion,
      detectOpenAICompatibleProvider: detectOpenAICompatibleProvider2,
      extractResponseContentText,
      formatOpenAICompatibleError,
      normalizeOpenAIChatCompletionsUrl,
      providerSupportsStructuredOutputs,
      resolveOpenAICompatibleModel,
      resolveOpenAICompatibleTemperature,
      runAiConnectionTest,
      runAiJsonCompletion,
      validateAiConnectionTestInput
    };
  }
});

// integrations/folia-host/ai-runtime.cjs
module.exports = require_aiTextClient();

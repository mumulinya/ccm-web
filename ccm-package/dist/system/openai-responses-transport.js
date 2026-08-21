"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOpenAiResponsesUrl = normalizeOpenAiResponsesUrl;
exports.encodeOpenAiResponsesInput = encodeOpenAiResponsesInput;
exports.buildOpenAiResponsesTools = buildOpenAiResponsesTools;
exports.buildOpenAiResponsesBody = buildOpenAiResponsesBody;
exports.safeProviderHttpDetail = safeProviderHttpDetail;
exports.consumeOpenAiResponsesSse = consumeOpenAiResponsesSse;
function normalizeOpenAiResponsesUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/v1\/responses$/i.test(base) || /\/responses$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/responses`;
    return `${base}/v1/responses`;
}
function textContent(value) {
    if (typeof value === "string")
        return value;
    if (!Array.isArray(value))
        return value == null ? "" : JSON.stringify(value);
    return value
        .filter(item => typeof item === "string" || ["text", "input_text", "output_text"].includes(String(item?.type || "")))
        .map(item => typeof item === "string" ? item : String(item?.text || ""))
        .join("\n");
}
function responsesMessageContent(content, role) {
    if (!Array.isArray(content))
        return String(content ?? "");
    const parts = content.flatMap((item) => {
        if (typeof item === "string")
            return [{ type: role === "assistant" ? "output_text" : "input_text", text: item }];
        if (!item || typeof item !== "object")
            return [];
        if (["text", "input_text", "output_text"].includes(String(item.type || ""))) {
            return [{ type: role === "assistant" ? "output_text" : "input_text", text: String(item.text || "") }];
        }
        if (item.type === "image_url") {
            const imageUrl = typeof item.image_url === "string" ? item.image_url : item.image_url?.url;
            return imageUrl ? [{ type: "input_image", image_url: imageUrl, ...(item.image_url?.detail ? { detail: item.image_url.detail } : {}) }] : [];
        }
        if (item.type === "input_image" && item.image_url)
            return [item];
        return [];
    });
    return parts.length ? parts : textContent(content);
}
function encodeOpenAiResponsesInput(messages) {
    const input = [];
    for (const message of Array.isArray(messages) ? messages : []) {
        const role = String(message?.role || "user");
        if (role === "tool") {
            input.push({
                type: "function_call_output",
                call_id: String(message.tool_call_id || message.toolCallId || ""),
                output: textContent(message?.content),
            });
            continue;
        }
        const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
        const content = responsesMessageContent(message?.content, role);
        const hasContent = typeof content === "string" ? !!content : Array.isArray(content) && content.length > 0;
        if (hasContent || toolCalls.length === 0)
            input.push({ role, content });
        for (const toolCall of toolCalls) {
            input.push({
                type: "function_call",
                call_id: String(toolCall?.id || ""),
                name: String(toolCall?.function?.name || toolCall?.name || ""),
                arguments: typeof toolCall?.function?.arguments === "string"
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall?.function?.arguments || toolCall?.arguments || {}),
            });
        }
    }
    return input;
}
function buildOpenAiResponsesTools(tools = []) {
    return tools
        .filter(tool => tool?.name && tool.deferred !== true)
        .map(tool => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || { type: "object", properties: {} },
    }));
}
function buildOpenAiResponsesBody(input) {
    const effort = ["low", "medium", "high"].includes(String(input.reasoningEffort || "")) ? String(input.reasoningEffort) : "";
    const tools = buildOpenAiResponsesTools(input.nativeTools || []);
    return {
        model: input.model,
        input: encodeOpenAiResponsesInput(input.messages),
        ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
        ...(input.stream ? { stream: true } : {}),
        ...(effort ? { reasoning: { effort } } : {}),
        ...(!effort && Number.isFinite(input.temperature) ? { temperature: input.temperature } : {}),
        ...(input.cachePatch || {}),
        ...(tools.length ? { tools, tool_choice: "auto" } : {}),
    };
}
function safeProviderHttpDetail(value, limit = 300) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    if (/<!doctype\s+html|<html\b|<body\b/i.test(raw))
        return "上游网关返回 HTML 错误页";
    try {
        const parsed = JSON.parse(raw);
        const detail = parsed?.error?.message || parsed?.message || parsed?.error || parsed?.code;
        if (detail)
            return String(detail).replace(/[\r\n\t]+/g, " ").slice(0, limit);
    }
    catch { }
    return raw.replace(/[\r\n\t]+/g, " ").slice(0, limit);
}
async function consumeOpenAiResponsesSse(response, onEvent) {
    const body = response?.body;
    if (!body)
        return;
    let buffer = "";
    const consumeBlock = (block) => {
        const data = block.split(/\r?\n/)
            .filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trim())
            .join("\n");
        if (!data || data === "[DONE]")
            return;
        try {
            onEvent(JSON.parse(data));
        }
        catch { }
    };
    for await (const chunk of body) {
        buffer += Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : new TextDecoder().decode(chunk, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";
        for (const block of blocks)
            consumeBlock(block);
    }
    if (buffer.trim())
        consumeBlock(buffer);
}
//# sourceMappingURL=openai-responses-transport.js.map
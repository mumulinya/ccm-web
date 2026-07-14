"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ONLINE_DOCUMENT_BYTES = exports.MAX_VISION_IMAGE_BYTES = exports.MAX_REQUIREMENT_FILE_BYTES = exports.MAX_REQUIREMENT_TOTAL_CHARS = exports.MAX_REQUIREMENT_SOURCE_CHARS = exports.REQUIREMENT_EXTRACTION_SCHEMA = exports.REQUIREMENT_SOURCE_SCHEMA = void 0;
exports.extractOnlineDocumentUrls = extractOnlineDocumentUrls;
exports.ingestRequirementSources = ingestRequirementSources;
exports.requirementToIntakeDraft = requirementToIntakeDraft;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dns = __importStar(require("dns/promises"));
const net = __importStar(require("net"));
const utils_1 = require("../../core/utils");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const pdfParse = require("pdf-parse");
exports.REQUIREMENT_SOURCE_SCHEMA = "ccm-requirement-source-ingestion-v1";
exports.REQUIREMENT_EXTRACTION_SCHEMA = "ccm-business-requirement-extraction-v1";
exports.MAX_REQUIREMENT_SOURCE_CHARS = 20_000;
exports.MAX_REQUIREMENT_TOTAL_CHARS = 60_000;
exports.MAX_REQUIREMENT_FILE_BYTES = 25 * 1024 * 1024;
exports.MAX_VISION_IMAGE_BYTES = 12 * 1024 * 1024;
exports.MAX_ONLINE_DOCUMENT_BYTES = 12 * 1024 * 1024;
const htmlEntities = {
    amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
};
function compact(value, max = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function unique(items, max = 12) {
    return Array.from(new Set((items || []).map(item => compact(item, 500)).filter(Boolean))).slice(0, max);
}
function decodeHtml(text) {
    return String(text || "")
        .replace(/&#(\d+);/g, (_all, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_all, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&([a-z]+);/gi, (all, name) => htmlEntities[String(name).toLowerCase()] ?? all);
}
function htmlToText(html) {
    return decodeHtml(String(html || "")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<(script|style|noscript|svg|canvas|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)>/gi, "\n")
        .replace(/<[^>]+>/g, " "))
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n")
        .trim();
}
function fileKind(name) {
    const ext = path.extname(String(name || "")).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext))
        return "image";
    if (ext === ".pdf")
        return "pdf";
    if ([".docx", ".pptx", ".xlsx"].includes(ext))
        return ext.slice(1);
    if ([".txt", ".md", ".json", ".csv", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".jsx", ".ts", ".tsx", ".vue", ".log", ".py", ".java", ".go", ".rs", ".sql"].includes(ext))
        return "text";
    return ext.slice(1) || "file";
}
function mimeForImage(name) {
    const ext = path.extname(name).toLowerCase();
    return {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    }[ext] || "application/octet-stream";
}
function sourceId(prefix, value) {
    let hash = 2166136261;
    for (const char of String(value || ""))
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return `${prefix}-${(hash >>> 0).toString(36)}`;
}
async function analyzeImageWithConfiguredModel(filePath, name, configOverride) {
    const config = configOverride || (0, group_orchestrator_1.loadOrchestratorConfig)();
    if (!config.enabled || !config.apiKey || !config.apiUrl || !config.model) {
        throw new Error("图片识别需要先在设置中配置并启用群聊主 Agent 模型");
    }
    const stat = fs.statSync(filePath);
    if (stat.size > exports.MAX_VISION_IMAGE_BYTES)
        throw new Error("图片超过 12 MB，无法发送给视觉模型");
    const mediaType = mimeForImage(name);
    if (mediaType === "application/octet-stream")
        throw new Error("视觉模型暂不支持这个图片格式");
    const data = fs.readFileSync(filePath).toString("base64");
    const prompt = "请读取这张业务需求相关图片。只返回 JSON：{summary:string, visible_text:string, requirements:string[], acceptance:string[], risks:string[], uncertain:string[]}。准确转写可见文字，描述界面、表格、流程或标注中的业务含义；看不清的内容放进 uncertain，禁止猜测。";
    let result;
    if ((0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)) {
        const endpoint = (0, group_orchestrator_llm_client_1.normalizeAnthropicMessagesUrl)(config.apiUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Number(config.timeoutMs) || 120_000));
        try {
            const response = await (0, group_orchestrator_llm_client_1.fetchWithNodeHttpFallback)(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": config.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 2200,
                    temperature: 0,
                    messages: [{ role: "user", content: [
                                { type: "image", source: { type: "base64", media_type: mediaType, data } },
                                { type: "text", text: prompt },
                            ] }],
                }),
                signal: controller.signal,
            });
            const text = await response.text();
            if (!response.ok)
                throw new Error(`视觉模型 HTTP ${response.status}: ${compact(text, 240)}`);
            const payload = JSON.parse(text);
            const content = (payload?.content || []).map((part) => part?.type === "text" ? part.text : "").join("");
            result = parseJsonObject(content);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    else {
        const endpoint = (0, group_orchestrator_llm_client_1.normalizeChatCompletionsUrl)(config.apiUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Number(config.timeoutMs) || 120_000));
        try {
            const response = await (0, group_orchestrator_llm_client_1.fetchWithNodeHttpFallback)(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
                body: JSON.stringify({
                    model: config.model,
                    temperature: 0,
                    messages: [{ role: "user", content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
                            ] }],
                }),
                signal: controller.signal,
            });
            const text = await response.text();
            if (!response.ok)
                throw new Error(`视觉模型 HTTP ${response.status}: ${compact(text, 240)}`);
            result = parseJsonObject(JSON.parse(text)?.choices?.[0]?.message?.content || "");
        }
        finally {
            clearTimeout(timeout);
        }
    }
    if (!result)
        throw new Error("视觉模型没有返回可解析的识别结果");
    return [
        result.summary ? `图片摘要：${result.summary}` : "",
        result.visible_text ? `可见文字：\n${result.visible_text}` : "",
        Array.isArray(result.requirements) && result.requirements.length ? `需求：\n${result.requirements.map((item) => `- ${item}`).join("\n")}` : "",
        Array.isArray(result.acceptance) && result.acceptance.length ? `验收线索：\n${result.acceptance.map((item) => `- ${item}`).join("\n")}` : "",
        Array.isArray(result.risks) && result.risks.length ? `风险：\n${result.risks.map((item) => `- ${item}`).join("\n")}` : "",
        Array.isArray(result.uncertain) && result.uncertain.length ? `未确认内容：\n${result.uncertain.map((item) => `- ${item}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");
}
function parseJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced)
        try {
            return JSON.parse(fenced[1]);
        }
        catch { }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    return null;
}
async function parseUploadedFile(file, options = {}) {
    const name = String(file.filename || file.name || "附件").trim();
    const filePath = String(file.savedPath || file.path || "").trim();
    const kind = fileKind(name);
    const base = {
        id: sourceId("file", `${name}:${filePath}`),
        source_type: "file",
        name,
        kind,
        path: filePath,
        size: Number(file.size || 0),
    };
    if (!filePath || !fs.existsSync(filePath)) {
        return { ...base, status: "failed", parser: "filesystem", readable: false, content: "", summary: "附件保存失败", error: "附件文件不存在" };
    }
    const stat = fs.statSync(filePath);
    base.size = stat.size;
    if (stat.size > exports.MAX_REQUIREMENT_FILE_BYTES) {
        return { ...base, status: "failed", parser: "size_gate", readable: false, content: "", summary: "附件过大，未读取", error: "单个附件不能超过 25 MB" };
    }
    try {
        let content = "";
        let parser = "";
        if (kind === "pdf") {
            const parsed = await pdfParse(fs.readFileSync(filePath));
            content = String(parsed?.text || "").trim();
            parser = "pdf-parse";
        }
        else if (kind === "image") {
            content = await analyzeImageWithConfiguredModel(filePath, name, options.visionConfig);
            parser = "configured-vision-model";
        }
        else {
            const described = (0, utils_1.describeFileFromPath)(filePath, name, exports.MAX_REQUIREMENT_SOURCE_CHARS);
            content = String(described?.content || "").trim();
            parser = ["docx", "pptx", "xlsx"].includes(kind) ? "ooxml-text-extractor" : "utf8-text";
        }
        if (!content) {
            return { ...base, status: "unsupported", parser: parser || "none", readable: false, content: "", summary: `${name} 没有提取到可读内容`, error: kind === "image" ? "图片未能识别" : "文件格式不支持或正文为空" };
        }
        const truncated = content.length > exports.MAX_REQUIREMENT_SOURCE_CHARS;
        const safeContent = (0, utils_1.truncateInlineContent)(content, exports.MAX_REQUIREMENT_SOURCE_CHARS);
        return {
            ...base,
            status: truncated ? "partial" : "parsed",
            parser,
            readable: true,
            content: safeContent,
            summary: kind === "image" ? compact(content, 180) : `已读取 ${name}，提取 ${Math.min(content.length, exports.MAX_REQUIREMENT_SOURCE_CHARS)} 个字符`,
            truncated,
            mime_type: kind === "image" ? mimeForImage(name) : undefined,
        };
    }
    catch (error) {
        return {
            ...base,
            status: "failed",
            parser: kind === "image" ? "configured-vision-model" : kind === "pdf" ? "pdf-parse" : "document-parser",
            readable: false,
            content: "",
            summary: `${name} 未能读取`,
            error: compact(error?.message || error || "解析失败", 300),
        };
    }
}
function isPrivateIpv4(ip) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(value => !Number.isFinite(value)))
        return true;
    return parts[0] === 10
        || parts[0] === 127
        || parts[0] === 0
        || parts[0] === 169 && parts[1] === 254
        || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
        || parts[0] === 192 && parts[1] === 168
        || parts[0] >= 224;
}
function isPrivateIp(ip) {
    if (net.isIPv4(ip))
        return isPrivateIpv4(ip);
    const value = ip.toLowerCase();
    return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}
async function assertPublicUrl(value) {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:")
        throw new Error("只支持 http/https 在线文档");
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local"))
        throw new Error("不允许读取本机或局域网地址");
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length || addresses.some(item => isPrivateIp(item.address)))
        throw new Error("不允许读取本机或局域网地址");
    return url;
}
async function fetchPublicDocument(urlValue) {
    let current = urlValue;
    for (let redirect = 0; redirect < 5; redirect++) {
        const checked = await assertPublicUrl(current);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        try {
            const response = await (0, group_orchestrator_llm_client_1.fetchWithNodeHttpFallback)(checked, {
                method: "GET",
                redirect: "manual",
                headers: { "User-Agent": "CCM-Requirement-Ingestion/1.0", "Accept": "text/html,text/plain,application/pdf,application/json;q=0.9,*/*;q=0.5" },
                signal: controller.signal,
            });
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.get("location");
                if (!location)
                    throw new Error("在线文档重定向缺少目标地址");
                current = new URL(location, checked).toString();
                continue;
            }
            const length = Number(response.headers.get("content-length") || 0);
            if (length > exports.MAX_ONLINE_DOCUMENT_BYTES)
                throw new Error("在线文档超过 12 MB");
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length > exports.MAX_ONLINE_DOCUMENT_BYTES)
                throw new Error("在线文档超过 12 MB");
            return { response, buffer, finalUrl: checked.toString() };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    throw new Error("在线文档重定向次数过多");
}
function looksLikeAuthorizationPage(text, url) {
    const sample = String(text || "").slice(0, 12_000);
    return /登录后查看|扫码登录|请先登录|无权访问|申请权限|访问权限|文档已加密|login required|access denied|permission required/i.test(sample)
        || /docs\.qq\.com/i.test(url) && /(?:登录|login).{0,40}(?:腾讯文档|Tencent Docs)/i.test(sample) && sample.length < 3000;
}
async function parseOnlineDocument(urlValue, fetcher = fetchPublicDocument) {
    const name = (() => { try {
        return new URL(urlValue).hostname;
    }
    catch {
        return "在线文档";
    } })();
    const base = { id: sourceId("url", urlValue), source_type: "online_document", name, kind: /docs\.qq\.com/i.test(urlValue) ? "tencent_document" : "online_document", url: urlValue };
    try {
        const { response, buffer, finalUrl } = await fetcher(urlValue);
        if (response.status === 401 || response.status === 403) {
            return { ...base, status: "needs_authorization", parser: "public-url-fetch", readable: false, content: "", summary: "在线文档需要授权后才能读取", error: `HTTP ${response.status}` };
        }
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const contentType = String(response.headers.get("content-type") || "").toLowerCase();
        let content = "";
        let parser = "public-url-text";
        if (contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(finalUrl)) {
            content = String((await pdfParse(buffer))?.text || "").trim();
            parser = "public-url-pdf-parse";
        }
        else if (contentType.includes("text/html") || /^\s*</.test(buffer.toString("utf-8", 0, Math.min(buffer.length, 200)))) {
            const html = buffer.toString("utf-8");
            content = htmlToText(html);
            parser = /docs\.qq\.com/i.test(finalUrl) ? "tencent-docs-public-page" : "public-url-html";
            if (looksLikeAuthorizationPage(content, finalUrl)) {
                return { ...base, url: finalUrl, status: "needs_authorization", parser, readable: false, content: "", summary: "腾讯文档需要公开分享或授权后才能读取", error: "页面要求登录或访问授权" };
            }
        }
        else if (contentType.includes("text/") || contentType.includes("json") || contentType.includes("xml")) {
            content = buffer.toString("utf-8").trim();
        }
        else {
            return { ...base, url: finalUrl, status: "unsupported", parser: "public-url-fetch", readable: false, content: "", summary: "在线文档格式暂不支持", error: contentType || "未知内容类型" };
        }
        if (!content || content.length < 20) {
            return { ...base, url: finalUrl, status: "failed", parser, readable: false, content: "", summary: "在线文档没有提取到正文", error: "页面可能需要登录、动态加载或导出权限" };
        }
        const truncated = content.length > exports.MAX_REQUIREMENT_SOURCE_CHARS;
        return {
            ...base,
            url: finalUrl,
            status: truncated ? "partial" : "parsed",
            parser,
            readable: true,
            content: (0, utils_1.truncateInlineContent)(content, exports.MAX_REQUIREMENT_SOURCE_CHARS),
            summary: `已读取在线文档，提取 ${Math.min(content.length, exports.MAX_REQUIREMENT_SOURCE_CHARS)} 个字符`,
            size: buffer.length,
            mime_type: contentType,
            truncated,
        };
    }
    catch (error) {
        return { ...base, status: "failed", parser: "public-url-fetch", readable: false, content: "", summary: "在线文档读取失败", error: compact(error?.message || error, 300) };
    }
}
function extractOnlineDocumentUrls(text) {
    const matches = String(text || "").match(/https?:\/\/[^\s<>"'，。；！？）\]]+/gi) || [];
    return unique(matches.map(value => value.replace(/[),.;]+$/, "")), 3);
}
function renderSourcesForAgent(sources) {
    if (!sources.length)
        return "";
    const rows = sources.map(source => {
        const meta = [`状态=${source.status}`, `解析器=${source.parser}`];
        if (source.path)
            meta.push(`本地路径=${source.path}`);
        if (source.url)
            meta.push(`来源链接=${source.url}`);
        if (source.readable && source.content)
            return `--- ${source.name}（${meta.join("；")}） ---\n${source.content}`;
        return `--- ${source.name}（${meta.join("；")}） ---\n[未读取正文] ${source.error || source.summary}。不得根据文件名或链接猜测内容。`;
    });
    return `\n\n[业务需求资料]\n${rows.join("\n\n")}`;
}
function fallbackRequirement(userText, sources) {
    const readableText = sources.filter(item => item.readable).map(item => item.content).join("\n");
    const combined = `${userText}\n${readableText}`.trim();
    const firstLine = combined.split(/\r?\n/).map(line => line.replace(/^[-#*\d.、\s]+/, "").trim()).find(Boolean) || "处理提交的业务需求";
    const areas = [
        /页面|前端|UI|交互|组件|样式/i.test(combined) ? "前端页面与交互" : "",
        /接口|后端|服务|数据库|API/i.test(combined) ? "后端接口与数据" : "",
        /测试|验收|回归|TestAgent/i.test(combined) ? "测试与验收" : "",
        /流程|审批|业务|运营/i.test(combined) ? "业务流程" : "",
    ].filter(Boolean);
    const acceptanceLines = combined.split(/\r?\n/)
        .map(line => line.replace(/^[-*\d.、\s]+/, "").trim())
        .filter(line => /验收|必须|应该|需要确保|完成后|通过/.test(line) && line.length >= 6 && line.length <= 220);
    const failedSources = sources.filter(item => !item.readable);
    return {
        schema: exports.REQUIREMENT_EXTRACTION_SCHEMA,
        title: compact(firstLine, 48),
        business_goal: compact(userText || firstLine, 800),
        scope: unique(areas.length ? areas : ["根据已读取资料确定影响范围"], 8),
        acceptance_criteria: unique(acceptanceLines.length ? acceptanceLines : ["按已读取的需求资料完成主要业务流程", "通过相关项目现有构建或测试", "交付总结列出变更、验证结果与剩余风险"], 8),
        dependencies: [],
        risks: unique([
            failedSources.length ? `${failedSources.length} 个资料未成功读取，需要补充授权或可读版本` : "",
            sources.some(item => item.truncated) ? "部分资料内容过长已截断，执行时需要按原始路径继续核对" : "",
        ], 8),
        clarification_questions: failedSources.map(item => `${item.name} 未能读取，是否可以提供公开链接、授权或导出文件？`).slice(0, 5),
        source_evidence: sources.filter(item => item.readable).map(item => item.name).slice(0, 12),
        extraction_method: "deterministic_fallback",
    };
}
async function extractRequirementWithModel(userText, sources, configOverride) {
    const config = configOverride || (0, group_orchestrator_1.loadOrchestratorConfig)();
    if (!config.enabled || !config.apiKey || !config.apiUrl || !config.model)
        throw new Error("主 Agent 模型未配置");
    const readable = sources.filter(item => item.readable && item.content).map(item => `【${item.name}】\n${item.content}`).join("\n\n").slice(0, exports.MAX_REQUIREMENT_TOTAL_CHARS);
    const failed = sources.filter(item => !item.readable).map(item => `${item.name}: ${item.error || item.summary}`).join("\n");
    const prompt = `请从用户文字和已读取资料中提取可执行的业务需求。只返回 JSON，不要输出 Markdown。\n字段：title(string，48字内)、business_goal(string)、scope(string[])、acceptance_criteria(string[])、dependencies(string[])、risks(string[])、clarification_questions(string[])、source_evidence(string[])。\n规则：不得根据未读取资料猜测；目标、范围和验收标准必须让项目 Agent 可执行；资料冲突或缺失时放入 clarification_questions。\n\n用户文字：\n${userText || "（用户仅提交了资料）"}\n\n已读取资料：\n${readable || "（无）"}\n\n未读取资料：\n${failed || "（无）"}`;
    const options = {
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        maxTokens: 2200,
        defaultTimeoutMs: Math.max(10_000, Number(config.timeoutMs) || 120_000),
        httpErrorPrefix: "需求提取模型",
        invalidJsonMessage: "需求提取模型未返回有效 JSON",
    };
    const value = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, options)
        : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, options);
    return {
        schema: exports.REQUIREMENT_EXTRACTION_SCHEMA,
        title: compact(value.title || userText || "处理提交的业务需求", 48),
        business_goal: compact(value.business_goal || value.businessGoal || userText, 1200),
        scope: unique(value.scope || [], 12),
        acceptance_criteria: unique(value.acceptance_criteria || value.acceptanceCriteria || [], 12),
        dependencies: unique(value.dependencies || [], 12),
        risks: unique(value.risks || [], 12),
        clarification_questions: unique(value.clarification_questions || value.clarificationQuestions || [], 8),
        source_evidence: unique(value.source_evidence || value.sourceEvidence || sources.filter(item => item.readable).map(item => item.name), 12),
        extraction_method: "model",
    };
}
async function ingestRequirementSources(input = {}) {
    const files = (input.files || []).slice(0, 10);
    const urls = unique([...(input.urls || []), ...extractOnlineDocumentUrls(input.userText || "")], 3);
    const fileSources = await Promise.all(files.map(file => parseUploadedFile(file, { visionConfig: input.visionConfig })));
    const urlSources = await Promise.all(urls.map(url => parseOnlineDocument(url, input.onlineDocumentFetcher || fetchPublicDocument)));
    const sources = [...fileSources, ...urlSources];
    const sourceWarnings = sources.filter(item => !item.readable).map(item => `${item.name}：${item.error || item.summary}`);
    const warnings = [...sourceWarnings];
    const context = renderSourcesForAgent(sources);
    let requirement = null;
    let extractionError = "";
    if (input.extractRequirement !== false && (String(input.userText || "").trim() || sources.length)) {
        try {
            requirement = await extractRequirementWithModel(input.userText || "", sources, input.requirementConfig);
        }
        catch (error) {
            extractionError = compact(error?.message || String(error), 500);
            requirement = fallbackRequirement(input.userText || "", sources);
            warnings.push("需求结构化模型暂时不可用，已改用本地规则整理，请在开始前确认计划。");
        }
    }
    const readableCount = sources.filter(item => item.readable).length;
    const userSummary = !sources.length
        ? ""
        : sourceWarnings.length
            ? `已读取 ${readableCount}/${sources.length} 份资料；${sourceWarnings.length} 份需要补充格式或授权。`
            : `已读取 ${sources.length} 份资料，并整理为可执行需求。`;
    const attachments = sources.map(source => ({
        id: source.id,
        name: source.name,
        path: source.path || "",
        url: source.url || "",
        size: source.size || 0,
        type: source.kind,
        status: source.status,
        parser: source.parser,
        readable: source.readable,
        summary: source.summary,
        error: source.error || "",
        truncated: source.truncated === true,
    }));
    return {
        schema: exports.REQUIREMENT_SOURCE_SCHEMA,
        generated_at: new Date().toISOString(),
        sources,
        attachments,
        source_documents: context.trim(),
        agent_context: context,
        user_summary: userSummary,
        warnings,
        requirement,
        technical: {
            schema: exports.REQUIREMENT_SOURCE_SCHEMA,
            source_count: sources.length,
            readable_count: readableCount,
            warning_count: warnings.length,
            source_warning_count: sourceWarnings.length,
            parsers: unique(sources.map(item => item.parser), 20),
            extraction_method: requirement?.extraction_method || "not_requested",
            extraction_error: extractionError,
            fallback_used: requirement?.extraction_method === "deterministic_fallback",
            warnings,
            sources: attachments,
        },
    };
}
function requirementToIntakeDraft(requirement, fallback = {}) {
    return {
        requirement: requirement?.business_goal || fallback.requirement || "",
        project: fallback.project || "",
        group_id: fallback.group_id || "",
        group_name: fallback.group_name || "",
        scope: requirement?.scope?.length ? requirement.scope : fallback.scope || [],
        acceptance: requirement?.acceptance_criteria?.length ? requirement.acceptance_criteria : fallback.acceptance || [],
        dependencies: requirement?.dependencies || [],
        risks: requirement?.risks?.length ? requirement.risks : fallback.risks || [],
        clarification_questions: requirement?.clarification_questions || [],
        source_evidence: requirement?.source_evidence || [],
        extraction_method: requirement?.extraction_method || "deterministic_fallback",
        generated_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=source-ingestion.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicPlatformHttpError = void 0;
exports.musicPlatformRequest = musicPlatformRequest;
exports.musicPlatformJson = musicPlatformJson;
exports.musicPlatformText = musicPlatformText;
exports.publicMusicPlatformError = publicMusicPlatformError;
const undici_1 = require("undici");
const db_1 = require("../../core/db");
const DEFAULT_HOSTS = new Set([
    "music.163.com",
    "api.bilibili.com",
    "www.bilibili.com",
    "comment.bilibili.com",
]);
const MAX_REDIRECTS = 5;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
class MusicPlatformHttpError extends Error {
    status;
    httpStatus;
    constructor(message, status, httpStatus = 0) {
        super(message);
        this.name = "MusicPlatformHttpError";
        this.status = status;
        this.httpStatus = httpStatus;
    }
}
exports.MusicPlatformHttpError = MusicPlatformHttpError;
function classifyError(error) {
    if (error instanceof MusicPlatformHttpError)
        return error;
    const code = String(error?.code || error?.cause?.code || "");
    const message = String(error?.message || "媒体平台请求失败");
    if (/timeout|timed out|abort/i.test(message) || ["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(code)) {
        return new MusicPlatformHttpError("媒体平台请求超时", "timeout");
    }
    return new MusicPlatformHttpError(message, "unavailable");
}
function dispatcherForRequest() {
    const proxy = String((0, db_1.loadMusicConfig)()?.proxy || "").trim();
    if (proxy) {
        const parsed = new URL(proxy);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new MusicPlatformHttpError("媒体代理仅支持HTTP或HTTPS", "rejected");
        }
        return new undici_1.ProxyAgent(proxy);
    }
    return new undici_1.Agent({ connect: { timeout: 8_000 } });
}
function assertAllowedUrl(input, extraHosts = []) {
    const parsed = new URL(input);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new MusicPlatformHttpError("媒体平台URL协议不受支持", "rejected");
    }
    const hosts = new Set([...DEFAULT_HOSTS, ...extraHosts.map(host => host.toLowerCase())]);
    if (!hosts.has(parsed.hostname.toLowerCase())) {
        throw new MusicPlatformHttpError(`媒体平台Host未授权：${parsed.hostname}`, "rejected");
    }
    if (parsed.username || parsed.password) {
        throw new MusicPlatformHttpError("媒体平台URL不能包含凭据", "rejected");
    }
    return parsed;
}
function guardResponseBody(body) {
    // Undici emits RequestAbortedError when a body is destroyed before it is
    // consumed. Without a listener that error can terminate the whole CCM process.
    body.on("error", () => undefined);
    return body;
}
function discardResponseBody(body) {
    guardResponseBody(body);
    if (!body.destroyed)
        body.destroy();
}
async function readLimitedBody(body, maxBytes) {
    guardResponseBody(body);
    const chunks = [];
    let total = 0;
    for await (const chunk of body) {
        const value = Buffer.from(chunk);
        total += value.length;
        if (total > maxBytes) {
            discardResponseBody(body);
            throw new MusicPlatformHttpError("媒体平台响应超过大小限制", "rejected");
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
async function musicPlatformRequest(input) {
    const timeoutMs = Math.max(1_000, Math.min(30_000, Number(input.timeoutMs || 10_000)));
    const maxBytes = Math.max(1_024, Math.min(16 * 1024 * 1024, Number(input.maxBytes || 2 * 1024 * 1024)));
    const retries = Math.max(0, Math.min(2, Number(input.retries ?? 1)));
    let current = assertAllowedUrl(input.url, input.allowedHosts);
    let redirects = 0;
    let attempt = 0;
    while (true) {
        try {
            const dispatcher = dispatcherForRequest();
            const response = await (0, undici_1.request)(current, {
                method: input.method || "GET",
                headers: input.headers,
                body: input.body,
                dispatcher,
                headersTimeout: timeoutMs,
                bodyTimeout: timeoutMs,
                maxRedirections: 0,
            });
            guardResponseBody(response.body);
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                discardResponseBody(response.body);
                const location = String(response.headers.location || "");
                if (!location || redirects++ >= MAX_REDIRECTS) {
                    throw new MusicPlatformHttpError("媒体平台重定向次数过多", "rejected", response.statusCode);
                }
                current = assertAllowedUrl(new URL(location, current).toString(), input.allowedHosts);
                continue;
            }
            if (response.statusCode === 429) {
                discardResponseBody(response.body);
                throw new MusicPlatformHttpError("媒体平台请求过于频繁", "rate_limited", 429);
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                discardResponseBody(response.body);
                const status = response.statusCode === 401 || response.statusCode === 403
                    ? "rejected"
                    : "unavailable";
                throw new MusicPlatformHttpError(`媒体平台返回HTTP ${response.statusCode}`, status, response.statusCode);
            }
            const buffer = await readLimitedBody(response.body, maxBytes);
            return {
                status: "success",
                statusCode: response.statusCode,
                headers: response.headers,
                buffer,
                text: buffer.toString("utf8"),
                finalUrl: current.toString(),
            };
        }
        catch (rawError) {
            const error = classifyError(rawError);
            const retryable = error.status === "timeout"
                || error.status === "unavailable"
                || (error.httpStatus && RETRYABLE_STATUS.has(error.httpStatus));
            if (!retryable || attempt++ >= retries)
                throw error;
            await new Promise(resolve => setTimeout(resolve, Math.min(1_500, 250 * 2 ** attempt)));
        }
    }
}
async function musicPlatformJson(input) {
    const response = await musicPlatformRequest(input);
    try {
        return JSON.parse(response.text);
    }
    catch {
        throw new MusicPlatformHttpError("媒体平台返回了无效JSON", "unavailable", response.statusCode);
    }
}
async function musicPlatformText(input) {
    return (await musicPlatformRequest(input)).text;
}
function publicMusicPlatformError(error) {
    const typed = classifyError(error);
    return { status: typed.status, error: typed.message, retryable: ["timeout", "unavailable", "rate_limited"].includes(typed.status) };
}
//# sourceMappingURL=platform-http.js.map
import { Agent, Dispatcher, ProxyAgent, request } from "undici";
import { loadMusicConfig } from "../../core/db";

export type MusicPlatformStatus = "success" | "unavailable" | "timeout" | "rate_limited" | "rejected";

const DEFAULT_HOSTS = new Set([
  "music.163.com",
  "api.bilibili.com",
  "www.bilibili.com",
  "comment.bilibili.com",
]);
const MAX_REDIRECTS = 5;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class MusicPlatformHttpError extends Error {
  readonly status: MusicPlatformStatus;
  readonly httpStatus: number;

  constructor(message: string, status: MusicPlatformStatus, httpStatus = 0) {
    super(message);
    this.name = "MusicPlatformHttpError";
    this.status = status;
    this.httpStatus = httpStatus;
  }
}

function classifyError(error: any): MusicPlatformHttpError {
  if (error instanceof MusicPlatformHttpError) return error;
  const code = String(error?.code || error?.cause?.code || "");
  const message = String(error?.message || "媒体平台请求失败");
  if (/timeout|timed out|abort/i.test(message) || ["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(code)) {
    return new MusicPlatformHttpError("媒体平台请求超时", "timeout");
  }
  return new MusicPlatformHttpError(message, "unavailable");
}

function dispatcherForRequest(): Dispatcher {
  const proxy = String(loadMusicConfig()?.proxy || "").trim();
  if (proxy) {
    const parsed = new URL(proxy);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new MusicPlatformHttpError("媒体代理仅支持HTTP或HTTPS", "rejected");
    }
    return new ProxyAgent(proxy);
  }
  return new Agent({ connect: { timeout: 8_000 } });
}

function assertAllowedUrl(input: string, extraHosts: string[] = []) {
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

function guardResponseBody(body: Dispatcher.ResponseData["body"]) {
  // Undici emits RequestAbortedError when a body is destroyed before it is
  // consumed. Without a listener that error can terminate the whole CCM process.
  body.on("error", () => undefined);
  return body;
}

function discardResponseBody(body: Dispatcher.ResponseData["body"]) {
  guardResponseBody(body);
  if (!body.destroyed) body.destroy();
}

async function readLimitedBody(body: Dispatcher.ResponseData["body"], maxBytes: number) {
  guardResponseBody(body);
  const chunks: Buffer[] = [];
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

export async function musicPlatformRequest(input: {
  url: string;
  method?: Dispatcher.HttpMethod;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  maxBytes?: number;
  retries?: number;
  allowedHosts?: string[];
}) {
  const timeoutMs = Math.max(1_000, Math.min(30_000, Number(input.timeoutMs || 10_000)));
  const maxBytes = Math.max(1_024, Math.min(16 * 1024 * 1024, Number(input.maxBytes || 2 * 1024 * 1024)));
  const retries = Math.max(0, Math.min(2, Number(input.retries ?? 1)));
  let current = assertAllowedUrl(input.url, input.allowedHosts);
  let redirects = 0;
  let attempt = 0;
  while (true) {
    try {
      const dispatcher = dispatcherForRequest();
      const response = await request(current, {
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
        const status: MusicPlatformStatus = response.statusCode === 401 || response.statusCode === 403
          ? "rejected"
          : "unavailable";
        throw new MusicPlatformHttpError(`媒体平台返回HTTP ${response.statusCode}`, status, response.statusCode);
      }
      const buffer = await readLimitedBody(response.body, maxBytes);
      return {
        status: "success" as const,
        statusCode: response.statusCode,
        headers: response.headers,
        buffer,
        text: buffer.toString("utf8"),
        finalUrl: current.toString(),
      };
    } catch (rawError: any) {
      const error = classifyError(rawError);
      const retryable = error.status === "timeout"
        || error.status === "unavailable"
        || (error.httpStatus && RETRYABLE_STATUS.has(error.httpStatus));
      if (!retryable || attempt++ >= retries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(1_500, 250 * 2 ** attempt)));
    }
  }
}

export async function musicPlatformJson<T = any>(input: Parameters<typeof musicPlatformRequest>[0]): Promise<T> {
  const response = await musicPlatformRequest(input);
  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new MusicPlatformHttpError("媒体平台返回了无效JSON", "unavailable", response.statusCode);
  }
}

export async function musicPlatformText(input: Parameters<typeof musicPlatformRequest>[0]) {
  return (await musicPlatformRequest(input)).text;
}

export function publicMusicPlatformError(error: any) {
  const typed = classifyError(error);
  return { status: typed.status, error: typed.message, retryable: ["timeout", "unavailable", "rate_limited"].includes(typed.status) };
}

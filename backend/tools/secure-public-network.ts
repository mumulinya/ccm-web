import * as dns from "dns/promises";
import * as https from "https";
import * as net from "net";
import { Readable, Transform } from "stream";

const SENSITIVE_QUERY = /(?:^|[_-])(?:access[_-]?token|api[_-]?key|key|secret|signature|sig|credential|password|auth|authorization)(?:$|[_-])/i;
const MAX_REDIRECTS = 5;

function ipv4Number(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function ipv4In(address: string, network: string, prefix: number) {
  const value = ipv4Number(address);
  const base = ipv4Number(network);
  if (value === null || base === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (base & mask);
}

export function normalizeIpAddress(address: string) {
  const raw = String(address || "").trim().toLowerCase().split("%")[0].replace(/^\[|\]$/g, "");
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  const mappedHex = raw.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!mappedHex) return raw;
  const numeric = (parseInt(mappedHex[1], 16) * 0x10000) + parseInt(mappedHex[2], 16);
  return `${numeric >>> 24}.${numeric >>> 16 & 255}.${numeric >>> 8 & 255}.${numeric & 255}`;
}

export function isBlockedNetworkAddress(input: string) {
  const address = normalizeIpAddress(input);
  if (net.isIPv4(address)) {
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([network, prefix]) => ipv4In(address, String(network), Number(prefix)));
  }
  if (!net.isIPv6(address)) return true;
  return address === "::" || address === "::1"
    || address.startsWith("fc") || address.startsWith("fd")
    || /^fe[89ab]/.test(address)
    || address.startsWith("ff")
    || address.startsWith("2001:db8:");
}

export function assertUrlHasNoCredentials(url: URL) {
  if (url.username || url.password) throw new Error("外部来源 URL 不允许内嵌凭据");
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY.test(key)) throw new Error(`外部来源 URL 不允许携带敏感查询参数: ${key}`);
  }
}

export async function resolveSafePublicHttpsUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("外部来源 URL 无效"); }
  if (url.protocol !== "https:") throw new Error("外部来源仅允许 HTTPS");
  assertUrlHasNoCredentials(url);
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("外部来源不允许访问本机地址");
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => isBlockedNetworkAddress(item.address))) {
    throw new Error("外部来源不允许访问内网、保留或组播地址");
  }
  return { url, addresses: addresses.map(item => ({ address: normalizeIpAddress(item.address), family: item.family })) };
}

function safeHeaders(headers: Headers | Record<string, string> | Array<[string, string]> | undefined) {
  const result: Record<string, string> = {};
  if (!headers) return result;
  const values = new Headers(headers);
  values.forEach((value, key) => {
    if (/^(?:host|connection|content-length)$/i.test(key)) return;
    result[key] = value;
  });
  return result;
}

async function bodyBuffer(body: any) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" || Buffer.isBuffer(body) || body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof URLSearchParams) return Buffer.from(body.toString());
  if (typeof body?.getReader === "function") {
    const chunks: Buffer[] = [];
    const reader = body.getReader();
    while (true) {
      const row = await reader.read();
      if (row.done) break;
      chunks.push(Buffer.from(row.value));
    }
    return Buffer.concat(chunks);
  }
  throw new Error("不支持的安全请求正文类型");
}

export interface SecureFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  redirects?: number;
}

export async function securePublicFetch(input: string | URL | Request, init: RequestInit = {}, options: SecureFetchOptions = {}): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const sourceUrl = request?.url || String(input);
  const method = String(init.method || request?.method || "GET").toUpperCase();
  const headers = safeHeaders(init.headers || request?.headers);
  const body = await bodyBuffer(init.body || (request && !["GET", "HEAD"].includes(method) ? request.body : null));
  const maxBytes = Math.max(1, Number(options.maxBytes || 8 * 1024 * 1024));
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 20_000));
  const redirects = Number(options.redirects || 0);
  if (redirects > MAX_REDIRECTS) throw new Error("外部来源重定向次数过多");
  const resolved = await resolveSafePublicHttpsUrl(sourceUrl);
  const pinned = resolved.addresses[0];
  if (!pinned?.address || !net.isIP(pinned.address)) throw new Error("外部来源 DNS 解析结果无效");
  const pinnedFamily = net.isIPv6(pinned.address) ? 6 : 4;

  return new Promise<Response>((resolve, reject) => {
    const req = https.request({
      protocol: "https:",
      hostname: resolved.url.hostname,
      port: resolved.url.port || 443,
      path: `${resolved.url.pathname}${resolved.url.search}`,
      method,
      headers,
      servername: resolved.url.hostname,
      lookup: (_hostname, lookupOptions: any, callback?: any) => {
        if (typeof lookupOptions === "function") {
          callback = lookupOptions;
          lookupOptions = {};
        }
        const record = { address: pinned.address, family: pinnedFamily };
        if (lookupOptions?.all) callback(null, [record]);
        else callback(null, record.address, record.family);
      },
      timeout: timeoutMs,
    }, response => {
      const status = Number(response.statusCode || 0);
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        const next = new URL(location, resolved.url).toString();
        const nextUrl = new URL(next);
        const redirectedHeaders = { ...headers };
        if (nextUrl.origin !== resolved.url.origin) {
          for (const key of Object.keys(redirectedHeaders)) {
            if (/^(?:authorization|cookie|proxy-authorization)$/i.test(key)) delete redirectedHeaders[key];
          }
        }
        const redirectedMethod = status === 303 ? "GET" : method;
        securePublicFetch(next, { ...init, headers: redirectedHeaders, method: redirectedMethod, body: redirectedMethod === "GET" ? undefined : body }, { ...options, redirects: redirects + 1 })
          .then(resolve, reject);
        return;
      }
      let read = 0;
      const limiter = new Transform({
        transform(chunk, _encoding, callback) {
          read += chunk.length;
          if (read > maxBytes) callback(new Error(`外部来源内容超过 ${Math.round(maxBytes / 1024)}KB 限制`));
          else callback(null, chunk);
        },
      });
      const responseHeaders = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach(item => responseHeaders.append(key, item));
        else if (value !== undefined) responseHeaders.set(key, String(value));
      }
      responseHeaders.set("x-ccm-final-url", resolved.url.toString());
      const bodyForbidden = method === "HEAD" || status === 204 || status === 205 || status === 304;
      if (bodyForbidden) {
        response.resume();
        resolve(new Response(null, { status, statusText: response.statusMessage, headers: responseHeaders }));
        return;
      }
      response.pipe(limiter);
      resolve(new Response(Readable.toWeb(limiter) as any, { status, statusText: response.statusMessage, headers: responseHeaders }));
    });
    req.on("timeout", () => req.destroy(new Error("外部来源请求超时")));
    req.on("error", reject);
    if (init.signal) {
      if (init.signal.aborted) req.destroy(new Error("请求已取消"));
      else init.signal.addEventListener("abort", () => req.destroy(new Error("请求已取消")), { once: true });
    }
    if (body?.length) req.write(body);
    req.end();
  });
}

export async function securePublicBuffer(value: string, maxBytes: number, headers: Record<string, string> = {}) {
  const response = await securePublicFetch(value, {
    headers: { "User-Agent": "ccm-tool-marketplace/2.0", Accept: "application/json,text/markdown,text/plain,*/*", ...headers },
  }, { maxBytes });
  if (!response.ok) throw new Error(`外部来源请求失败 (HTTP ${response.status})`);
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "",
    finalUrl: response.headers.get("x-ccm-final-url") || response.url || value,
  };
}

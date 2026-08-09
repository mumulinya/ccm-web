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
exports.configuredWebSearchProviders = configuredWebSearchProviders;
exports.isWebSearchAvailable = isWebSearchAvailable;
exports.inspectNotebook = inspectNotebook;
exports.webFetch = webFetch;
exports.webSearch = webSearch;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const secure_public_network_1 = require("./secure-public-network");
const MAX_WEB_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 300_000;
function hash(value) { return crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value ?? null))).digest("hex"); }
function cleanHtml(html) {
    return html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}
function webSearchConfig() {
    let stored = {};
    try {
        stored = require("../modules/collaboration/group-orchestrator-config").loadOrchestratorConfig();
    }
    catch { }
    return {
        searchMcpUrl: String(process.env.CCM_SEARCH_MCP_URL || stored.searchMcpUrl || "").trim(),
        searchMcpToken: String(process.env.CCM_SEARCH_MCP_TOKEN || stored.searchMcpToken || "").trim(),
        braveApiKey: String(process.env.BRAVE_SEARCH_API_KEY || stored.braveSearchApiKey || "").trim(),
        bingApiKey: String(process.env.BING_SEARCH_API_KEY || stored.bingSearchApiKey || "").trim(),
        googleApiKey: String(process.env.GOOGLE_CSE_API_KEY || stored.googleCseApiKey || "").trim(),
        googleCseId: String(process.env.GOOGLE_CSE_ID || stored.googleCseId || "").trim(),
        providerOrder: Array.isArray(stored.webSearchProviderOrder) ? stored.webSearchProviderOrder.map(String) : ["mcp", "brave", "bing", "google"],
    };
}
function configuredWebSearchProviders() {
    const config = webSearchConfig();
    return [
        config.searchMcpUrl ? "mcp" : "",
        config.braveApiKey ? "brave" : "",
        config.bingApiKey ? "bing" : "",
        config.googleApiKey && config.googleCseId ? "google" : "",
    ].filter(Boolean);
}
function isWebSearchAvailable() { return configuredWebSearchProviders().length > 0; }
function inspectNotebook(root, args) {
    const file = path.resolve(root, String(args?.path || ""));
    const rel = path.relative(root, file);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || path.extname(file).toLowerCase() !== ".ipynb")
        throw new Error("Notebook路径无效或越过项目边界");
    const raw = fs.readFileSync(file, "utf8");
    if (Buffer.byteLength(raw) > 16 * 1024 * 1024)
        throw new Error("Notebook超过16MB限制");
    const notebook = JSON.parse(raw);
    if (!Array.isArray(notebook?.cells))
        throw new Error("Notebook格式无效");
    const offset = Math.max(0, Number(args?.cursor || 0) || 0);
    const limit = Math.max(1, Math.min(200, Number(args?.limit || 50) || 50));
    const cells = notebook.cells.slice(offset, offset + limit).map((cell, index) => {
        const source = Array.isArray(cell?.source) ? cell.source.join("") : String(cell?.source || "");
        return {
            id: String(cell?.id || `cell-${offset + index}`),
            index: offset + index,
            cellType: String(cell?.cell_type || "unknown"),
            lineCount: source.split(/\r?\n/).length,
            sourceChecksum: hash(source),
            outputTypes: (Array.isArray(cell?.outputs) ? cell.outputs : []).map((output) => String(output?.output_type || "unknown")).slice(0, 50),
            executionCount: Number.isFinite(Number(cell?.execution_count)) ? Number(cell.execution_count) : null,
            metadataChecksum: hash(cell?.metadata || {}),
            contentStored: false,
        };
    });
    return {
        schema: "ccm-notebook-inspection-v1",
        path: rel.replace(/\\/g, "/"),
        notebookChecksum: hash(raw),
        metadata: { nbformat: notebook.nbformat, nbformatMinor: notebook.nbformat_minor, kernel: notebook?.metadata?.kernelspec?.name || "", language: notebook?.metadata?.language_info?.name || "" },
        cells,
        totalCells: notebook.cells.length,
        nextCursor: offset + cells.length < notebook.cells.length ? String(offset + cells.length) : "",
        truncated: offset + cells.length < notebook.cells.length,
        contentStored: false,
    };
}
async function browserRender(url) {
    const { chromium } = await Promise.resolve().then(() => __importStar(require("playwright")));
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({ storageState: undefined, acceptDownloads: false, serviceWorkers: "block" });
        const page = await context.newPage();
        await page.route("**/*", async (route) => {
            try {
                await (0, secure_public_network_1.resolveSafePublicHttpsUrl)(route.request().url());
                return route.continue();
            }
            catch {
                return route.abort();
            }
        });
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        const result = { title: await page.title(), text: (await page.locator("body").innerText({ timeout: 5000 })).slice(0, MAX_TEXT_CHARS), finalUrl: page.url() };
        await context.close();
        return result;
    }
    finally {
        await browser.close();
    }
}
async function webFetch(args, allowBrowserFallback = true) {
    const requestedUrl = String(args?.url || "").trim();
    const response = await (0, secure_public_network_1.securePublicFetch)(requestedUrl, { method: "GET", headers: { "User-Agent": "CCM-WebFetch/1.0", Accept: "text/html,application/json,text/plain,application/pdf;q=0.9" } }, { maxBytes: MAX_WEB_BYTES, timeoutMs: 20_000 });
    if (!response.ok)
        throw new Error(`Web Fetch失败 (HTTP ${response.status})`);
    const finalUrl = response.headers.get("x-ccm-final-url") || requestedUrl;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    let text = "";
    let title = "";
    if (contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(finalUrl)) {
        const pdfParse = require("pdf-parse");
        const parsed = await pdfParse(buffer);
        text = String(parsed?.text || "");
        title = String(parsed?.info?.Title || "");
    }
    else {
        const raw = buffer.toString("utf8");
        if (contentType.includes("html") || /^\s*</.test(raw)) {
            title = cleanHtml(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
            text = cleanHtml(raw);
            if (allowBrowserFallback && text.length < 200 && /<script|id=["'](?:root|app)["']/i.test(raw)) {
                const rendered = await browserRender(finalUrl);
                title = rendered.title || title;
                text = rendered.text;
            }
        }
        else
            text = raw;
    }
    text = text.slice(0, Math.max(1000, Math.min(MAX_TEXT_CHARS, Number(args?.max_chars || args?.maxChars || 100_000) || 100_000)));
    return { schema: "ccm-web-fetch-result-v1", title, requestedUrl, finalUrl, contentType, text, citation: finalUrl, contentChecksum: hash(buffer), truncated: text.length >= MAX_TEXT_CHARS || buffer.length >= MAX_WEB_BYTES, contentStored: false };
}
function searchOrder(args) {
    const config = webSearchConfig();
    const requested = Array.isArray(args?.provider_order) ? args.provider_order.map(String) : config.providerOrder;
    const available = new Set(configuredWebSearchProviders());
    return requested.filter((item) => available.has(item));
}
async function webSearch(args) {
    const query = String(args?.query || "").trim();
    if (!query || query.length > 500)
        throw new Error("Web Search查询为空或过长");
    const count = Math.max(1, Math.min(20, Number(args?.count || 8) || 8));
    const providers = searchOrder(args);
    const config = webSearchConfig();
    if (!providers.length)
        throw new Error("capability_unavailable: 未配置真实Web Search Provider");
    let lastError = "";
    for (const provider of providers) {
        try {
            let url = "";
            let headers = {};
            if (provider === "mcp") {
                url = `${config.searchMcpUrl}${config.searchMcpUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}&count=${count}`;
                headers = config.searchMcpToken ? { Authorization: `Bearer ${config.searchMcpToken}` } : {};
            }
            if (provider === "brave") {
                url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
                headers = { "X-Subscription-Token": config.braveApiKey };
            }
            if (provider === "bing") {
                url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${count}`;
                headers = { "Ocp-Apim-Subscription-Key": config.bingApiKey };
            }
            if (provider === "google") {
                url = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${encodeURIComponent(config.googleCseId)}&num=${Math.min(10, count)}`;
                headers = { "X-Goog-Api-Key": config.googleApiKey };
            }
            const response = await (0, secure_public_network_1.securePublicFetch)(url, { headers: { Accept: "application/json", ...headers } }, { maxBytes: 2 * 1024 * 1024, timeoutMs: 15_000 });
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const raw = provider === "brave" ? data?.web?.results : provider === "bing" ? data?.webPages?.value : provider === "google" ? data?.items : data?.results;
            const results = (Array.isArray(raw) ? raw : []).slice(0, count).map((item) => {
                const finalUrl = String(item?.url || item?.link || "");
                return { title: String(item?.title || item?.name || "").slice(0, 500), finalUrl, publishedAt: String(item?.publishedAt || item?.datePublished || item?.page_age || ""), excerpt: String(item?.description || item?.snippet || "").slice(0, 1500), citation: finalUrl, contentChecksum: hash(item), contentStored: false };
            }).filter((item) => /^https:\/\//i.test(item.finalUrl));
            return { schema: "ccm-web-search-result-v1", provider, queryChecksum: hash(query), results, resultChecksum: hash(results), contentStored: false };
        }
        catch (error) {
            lastError = `${provider}: ${String(error?.message || error)}`;
        }
    }
    throw new Error(`Web Search Provider均不可用：${lastError}`);
}
//# sourceMappingURL=web-notebook-tools.js.map
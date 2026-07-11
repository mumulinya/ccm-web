"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCssPageResources = extractCssPageResources;
exports.extractHtmlPageResources = extractHtmlPageResources;
exports.expectedHttpResourceContentTypes = expectedHttpResourceContentTypes;
exports.httpResourceContentTypeMatches = httpResourceContentTypeMatches;
exports.redactHttpPageResourceUrl = redactHttpPageResourceUrl;
exports.httpPageResourceFailureDetail = httpPageResourceFailureDetail;
exports.buildHttpPageResourceSummary = buildHttpPageResourceSummary;
exports.formatHttpPageResourceSummary = formatHttpPageResourceSummary;
exports.httpPageResourceEvidenceErrors = httpPageResourceEvidenceErrors;
const RESOURCE_KINDS = new Set([
    "script",
    "stylesheet",
    "image",
    "font",
    "media",
    "document",
    "manifest",
    "other",
]);
const KIND_PRIORITY = {
    script: 0,
    stylesheet: 1,
    manifest: 2,
    font: 3,
    image: 4,
    media: 5,
    document: 6,
    other: 7,
};
function decodeHtmlAttribute(value) {
    return String(value || "")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([a-f0-9]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}
function attributes(raw) {
    const output = {};
    const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = pattern.exec(raw))) {
        const key = String(match[1] || "").toLowerCase();
        if (!key || Object.prototype.hasOwnProperty.call(output, key))
            continue;
        output[key] = decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? "");
    }
    return output;
}
function kindFromAs(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "script" || normalized === "worker")
        return "script";
    if (normalized === "style")
        return "stylesheet";
    if (normalized === "image")
        return "image";
    if (normalized === "font")
        return "font";
    if (normalized === "audio" || normalized === "video" || normalized === "track")
        return "media";
    if (normalized === "document")
        return "document";
    return "other";
}
function kindFromMime(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized.startsWith("image/"))
        return "image";
    if (normalized.startsWith("font/") || /font|woff|truetype|opentype/.test(normalized))
        return "font";
    if (normalized.startsWith("audio/") || normalized.startsWith("video/"))
        return "media";
    if (/javascript|ecmascript/.test(normalized))
        return "script";
    if (normalized === "text/css")
        return "stylesheet";
    if (/html|xhtml/.test(normalized))
        return "document";
    return "other";
}
function kindFromUrl(value) {
    try {
        const pathname = new URL(value).pathname.toLowerCase();
        if (/\.(?:m?js|cjs)$/.test(pathname))
            return "script";
        if (/\.css$/.test(pathname))
            return "stylesheet";
        if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)$/.test(pathname))
            return "image";
        if (/\.(?:woff2?|ttf|otf|eot)$/.test(pathname))
            return "font";
        if (/\.(?:mp4|webm|ogg|ogv|mp3|wav|m4a|aac|flac)$/.test(pathname))
            return "media";
        if (/\.(?:html?|xhtml)$/.test(pathname))
            return "document";
        if (/\.webmanifest$/.test(pathname))
            return "manifest";
    }
    catch { }
    return "other";
}
function srcsetUrls(value) {
    if (/(?:^|,\s*)data:/i.test(String(value || "")))
        return [];
    return String(value || "")
        .split(",")
        .map(item => item.trim().split(/\s+/)[0])
        .filter(Boolean);
}
function candidateFor(pageUrl, resolutionBase, rawUrl, kind, source, discoveredFrom) {
    const raw = decodeHtmlAttribute(String(rawUrl || "").trim());
    if (!raw || raw.startsWith("#") || /[<>{}\\\u0000-\u001f]/.test(raw) || /^(?:data|blob|javascript|mailto|tel|about):/i.test(raw))
        return null;
    try {
        const page = new URL(pageUrl);
        const url = new URL(raw, resolutionBase);
        if (!/^https?:$/.test(url.protocol) || url.origin !== page.origin)
            return null;
        url.hash = "";
        return { url: url.toString(), kind, source, discoveredFrom };
    }
    catch {
        return null;
    }
}
function uniqueCandidates(candidates, limit) {
    const seen = new Set();
    return candidates
        .map((item, index) => ({ item, index }))
        .sort((left, right) => KIND_PRIORITY[left.item.kind] - KIND_PRIORITY[right.item.kind] || left.index - right.index)
        .map(entry => entry.item)
        .filter(item => {
        if (seen.has(item.url))
            return false;
        seen.add(item.url);
        return true;
    })
        .slice(0, Math.max(0, limit));
}
function extractCssPageResources(pageUrl, stylesheetUrl, css, limit = 100) {
    if (!css || limit <= 0)
        return [];
    const sourceText = String(css).replace(/\/\*[\s\S]*?\*\//g, "");
    const candidates = [];
    const add = (raw, source) => {
        const temporary = candidateFor(pageUrl, stylesheetUrl, raw, "other", source, stylesheetUrl);
        if (!temporary)
            return;
        temporary.kind = kindFromUrl(temporary.url);
        candidates.push(temporary);
    };
    const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*))\s*\)/gi;
    let match;
    while ((match = urlPattern.exec(sourceText)))
        add(match[1] ?? match[2] ?? match[3] ?? "", "css:url()");
    const importPattern = /@import\s+(?:"([^"]+)"|'([^']+)')/gi;
    while ((match = importPattern.exec(sourceText)))
        add(match[1] ?? match[2] ?? "", "css:@import");
    return uniqueCandidates(candidates, limit);
}
function extractHtmlPageResources(pageUrl, html, limit = 100) {
    if (!html || limit <= 0)
        return [];
    const withoutComments = String(html).replace(/<!--[\s\S]*?-->/g, "");
    const baseMatch = /<base\b([^>]*)>/i.exec(withoutComments);
    const baseHref = baseMatch ? attributes(baseMatch[1]).href : "";
    let resolutionBase = pageUrl;
    if (baseHref) {
        try {
            resolutionBase = new URL(baseHref, pageUrl).toString();
        }
        catch { }
    }
    const candidates = [];
    const add = (raw, kind, source) => {
        const candidate = candidateFor(pageUrl, resolutionBase, raw, kind, source, pageUrl);
        if (candidate)
            candidates.push(candidate);
    };
    const styleBlockPattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
    let styleMatch;
    while ((styleMatch = styleBlockPattern.exec(withoutComments))) {
        candidates.push(...extractCssPageResources(pageUrl, resolutionBase, styleMatch[1], limit));
    }
    const searchable = withoutComments
        .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, "$1</script>")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
        .replace(/<(?:template|noscript|textarea|xmp)\b[^>]*>[\s\S]*?<\/(?:template|noscript|textarea|xmp)\s*>/gi, "");
    const tagPattern = /<(script|link|img|source|video|audio|iframe|object|embed|input)\b([^>]*)>/gi;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(searchable))) {
        const tag = tagMatch[1].toLowerCase();
        const attrs = attributes(tagMatch[2]);
        if (attrs.style)
            candidates.push(...extractCssPageResources(pageUrl, resolutionBase, attrs.style, limit));
        if (tag === "script" && attrs.src)
            add(attrs.src, "script", "script[src]");
        if (tag === "link") {
            const rel = new Set(String(attrs.rel || "").toLowerCase().split(/\s+/).filter(Boolean));
            if (attrs.href && rel.has("stylesheet"))
                add(attrs.href, "stylesheet", "link[rel=stylesheet][href]");
            else if (attrs.href && rel.has("modulepreload"))
                add(attrs.href, "script", "link[rel=modulepreload][href]");
            else if (attrs.href && rel.has("preload"))
                add(attrs.href, kindFromAs(attrs.as), `link[rel=preload][as=${attrs.as || "other"}]`);
            else if (attrs.href && (rel.has("icon") || rel.has("apple-touch-icon") || rel.has("mask-icon")))
                add(attrs.href, "image", "link[rel=icon][href]");
            else if (attrs.href && rel.has("manifest"))
                add(attrs.href, "manifest", "link[rel=manifest][href]");
            for (const raw of srcsetUrls(attrs.imagesrcset || ""))
                add(raw, "image", "link[imagesrcset]");
        }
        if (tag === "img") {
            if (attrs.src)
                add(attrs.src, "image", "img[src]");
            for (const raw of srcsetUrls(attrs.srcset || ""))
                add(raw, "image", "img[srcset]");
        }
        if (tag === "source") {
            if (attrs.src)
                add(attrs.src, kindFromMime(attrs.type) === "other" ? "media" : kindFromMime(attrs.type), "source[src]");
            for (const raw of srcsetUrls(attrs.srcset || ""))
                add(raw, "image", "source[srcset]");
        }
        if (tag === "video") {
            if (attrs.src)
                add(attrs.src, "media", "video[src]");
            if (attrs.poster)
                add(attrs.poster, "image", "video[poster]");
        }
        if (tag === "audio" && attrs.src)
            add(attrs.src, "media", "audio[src]");
        if (tag === "iframe" && attrs.src)
            add(attrs.src, "document", "iframe[src]");
        if (tag === "object" && attrs.data)
            add(attrs.data, kindFromMime(attrs.type), "object[data]");
        if (tag === "embed" && attrs.src)
            add(attrs.src, kindFromMime(attrs.type), "embed[src]");
        if (tag === "input" && String(attrs.type || "").toLowerCase() === "image" && attrs.src)
            add(attrs.src, "image", "input[type=image][src]");
    }
    return uniqueCandidates(candidates, limit);
}
function expectedHttpResourceContentTypes(kind) {
    if (kind === "script")
        return ["javascript", "ecmascript", "application/wasm"];
    if (kind === "stylesheet")
        return ["text/css"];
    if (kind === "image")
        return ["image/"];
    if (kind === "font")
        return ["font/", "application/font", "application/x-font", "application/vnd.ms-fontobject", "application/octet-stream"];
    if (kind === "media")
        return ["audio/", "video/", "application/ogg", "application/octet-stream"];
    if (kind === "document")
        return ["text/html", "application/xhtml+xml"];
    if (kind === "manifest")
        return ["application/manifest+json", "application/json"];
    return [];
}
function httpResourceContentTypeMatches(kind, contentType) {
    const expected = expectedHttpResourceContentTypes(kind);
    if (!expected.length)
        return undefined;
    const actual = String(contentType || "").toLowerCase().split(";", 1)[0].trim();
    return expected.some(item => actual === item || actual.startsWith(item) || actual.includes(item));
}
function redactHttpPageResourceUrl(value) {
    try {
        const url = new URL(String(value || ""));
        url.username = "";
        url.password = "";
        for (const key of Array.from(url.searchParams.keys())) {
            if (/(?:token|secret|signature|sig|auth|password|passwd|api[_-]?key|credential)/i.test(key)) {
                url.searchParams.set(key, "[redacted]");
            }
        }
        return url.toString();
    }
    catch {
        return String(value || "").split("#", 1)[0];
    }
}
function httpPageResourceFailureDetail(resources) {
    const failed = resources.filter(item => item.status === "failed" || item.status === "blocked");
    if (!failed.length)
        return "";
    const sample = failed.slice(0, 3).map(item => `${item.kind || "other"} ${item.url}: ${item.error || item.status}`);
    return `${failed.length} page resource${failed.length === 1 ? "" : "s"} failed: ${sample.join(" | ")}`;
}
function buildHttpPageResourceSummary(results) {
    const resources = results.filter(result => result.context?.pageResourceProbe === true).flatMap(result => result.resourceChecks || []);
    const kinds = {};
    for (const resource of resources)
        kinds[resource.kind || "other"] = (kinds[resource.kind || "other"] || 0) + 1;
    return {
        total: resources.length,
        passed: resources.filter(item => item.status === "passed").length,
        failed: resources.filter(item => item.status === "failed").length,
        blocked: resources.filter(item => item.status === "blocked").length,
        contentTypeMismatches: resources.filter(item => item.contentTypeMatched === false).length,
        kinds,
    };
}
function formatHttpPageResourceSummary(results) {
    const summary = buildHttpPageResourceSummary(results);
    const kinds = Object.entries(summary.kinds).sort().map(([kind, count]) => `${kind}:${count}`).join(",") || "none";
    return `total=${summary.total}; passed=${summary.passed}; failed=${summary.failed}; blocked=${summary.blocked}; contentTypeMismatches=${summary.contentTypeMismatches}; kinds=${kinds}`;
}
function httpPageResourceEvidenceErrors(result, label = "HTTP page resource evidence") {
    if (result.context?.pageResourceProbe !== true)
        return [];
    const errors = [];
    const resources = Array.isArray(result.resourceChecks) ? result.resourceChecks : [];
    const failOnResourceError = result.context?.failOnHttpResourceError !== false;
    const maxResourceChecks = Number(result.context?.maxHttpResourceChecks);
    if (!Number.isInteger(maxResourceChecks) || maxResourceChecks < 0)
        errors.push(`${label}.context.maxHttpResourceChecks is invalid.`);
    if (Number.isInteger(maxResourceChecks) && resources.length > maxResourceChecks)
        errors.push(`${label} exceeds maxHttpResourceChecks.`);
    const seen = new Set();
    let pageOrigin = "";
    try {
        pageOrigin = new URL(result.url).origin;
    }
    catch {
        errors.push(`${label}.url is invalid.`);
    }
    for (const [index, resource] of resources.entries()) {
        const resourceLabel = `${label}.resourceChecks[${index}]`;
        if (!RESOURCE_KINDS.has(resource.kind))
            errors.push(`${resourceLabel}.kind is invalid.`);
        if (!String(resource.source || "").trim())
            errors.push(`${resourceLabel}.source is missing.`);
        if (!String(resource.discoveredFrom || "").trim())
            errors.push(`${resourceLabel}.discoveredFrom is missing.`);
        if (seen.has(resource.url))
            errors.push(`${resourceLabel}.url is duplicated.`);
        seen.add(resource.url);
        try {
            const url = new URL(resource.url);
            if (!/^https?:$/.test(url.protocol) || (pageOrigin && url.origin !== pageOrigin))
                errors.push(`${resourceLabel}.url is not a same-origin HTTP resource.`);
            for (const [key, value] of url.searchParams.entries()) {
                if (/(?:token|secret|signature|sig|auth|password|passwd|api[_-]?key|credential)/i.test(key) && value !== "[redacted]") {
                    errors.push(`${resourceLabel}.url contains an unredacted sensitive query value.`);
                }
            }
        }
        catch {
            errors.push(`${resourceLabel}.url is invalid.`);
        }
        for (const [field, value] of [["finalUrl", resource.finalUrl], ["discoveredFrom", resource.discoveredFrom]]) {
            try {
                const url = new URL(String(value || ""));
                if (!/^https?:$/.test(url.protocol) || (pageOrigin && url.origin !== pageOrigin))
                    errors.push(`${resourceLabel}.${field} is not same-origin.`);
                for (const [key, queryValue] of url.searchParams.entries()) {
                    if (/(?:token|secret|signature|sig|auth|password|passwd|api[_-]?key|credential)/i.test(key) && queryValue !== "[redacted]") {
                        errors.push(`${resourceLabel}.${field} contains an unredacted sensitive query value.`);
                    }
                }
            }
            catch {
                errors.push(`${resourceLabel}.${field} is invalid.`);
            }
        }
        if (!Number.isInteger(resource.redirectCount) || Number(resource.redirectCount) < 0 || Number(resource.redirectCount) > 3) {
            errors.push(`${resourceLabel}.redirectCount is invalid.`);
        }
        const expected = expectedHttpResourceContentTypes(resource.kind);
        if (JSON.stringify(resource.expectedContentTypes || []) !== JSON.stringify(expected)) {
            errors.push(`${resourceLabel}.expectedContentTypes does not match kind.`);
        }
        const matched = httpResourceContentTypeMatches(resource.kind, resource.contentType);
        if (resource.contentTypeMatched !== matched)
            errors.push(`${resourceLabel}.contentTypeMatched does not match contentType.`);
        const hasResponse = resource.statusCode !== null;
        if (resource.status === "passed" && (!hasResponse || Number(resource.statusCode) < 200 || Number(resource.statusCode) >= 400 || matched === false)) {
            errors.push(`${resourceLabel} is passed without a successful response and matching content type.`);
        }
        if (resource.status === "blocked" && (hasResponse || !String(resource.error || "").trim())) {
            errors.push(`${resourceLabel} is blocked but contains a response or no error.`);
        }
        if (resource.status === "failed") {
            const error = String(resource.error || "").trim();
            if (!error)
                errors.push(`${resourceLabel} is failed without an error.`);
            if (hasResponse && Number(resource.statusCode) >= 200 && Number(resource.statusCode) < 400 && matched !== false && !/redirect/i.test(error)) {
                errors.push(`${resourceLabel} is failed without an HTTP, content-type, or redirect failure.`);
            }
        }
        if (resource.status === "skipped")
            errors.push(`${resourceLabel} must not be skipped after selection.`);
    }
    const mainOk = result.statusCode !== null && result.statusCode >= 200 && result.statusCode < 400;
    const resourceFailure = failOnResourceError && resources.some(item => item.status === "failed" || item.status === "blocked");
    const expectedStatus = result.statusCode === null ? "blocked" : mainOk && !resourceFailure ? "passed" : "failed";
    if (result.status !== expectedStatus)
        errors.push(`${label}.status must be ${expectedStatus}.`);
    return errors;
}
//# sourceMappingURL=http-page-resources.js.map
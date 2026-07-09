"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE = void 0;
exports.buildAcceptanceDownloadFlows = buildAcceptanceDownloadFlows;
exports.buildAcceptanceDownloadFlowBrowserChecks = buildAcceptanceDownloadFlowBrowserChecks;
const utils_1 = require("../utils");
exports.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE = "acceptance_download_flow";
function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function quotedText(value) {
    const out = [];
    const patterns = [
        /"([^"\r\n]{2,120})"/g,
        /'([^'\r\n]{2,120})'/g,
        /`([^`\r\n]{2,120})`/g,
        /“([^”\r\n]{2,120})”/g,
        /‘([^’\r\n]{2,120})’/g,
        /「([^」\r\n]{2,120})」/g,
        /『([^』\r\n]{2,120})』/g,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(value))) {
            const text = clean(match[1]);
            if (text)
                out.push(text);
        }
    }
    return out;
}
function firstQuotedAfter(criterion, pattern) {
    const match = pattern.exec(criterion);
    if (!match)
        return "";
    return quotedText(criterion.slice(match.index))[0] || "";
}
function explicitUrlPath(criterion) {
    const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
    return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}
function looksLikeDownloadCriterion(criterion) {
    return /\b(?:download|downloads|downloaded|export|exports|exported)\b/i.test(criterion)
        && /\b(?:click|clicking|press|tap)\b/i.test(criterion);
}
function looksLikeFileName(value) {
    return /^[^\\/:*?"<>|\r\n]+\.[a-z0-9]{1,12}$/i.test(value.trim());
}
function fileNameFromCriterion(criterion) {
    const quoted = quotedText(criterion).find(looksLikeFileName);
    if (quoted)
        return quoted;
    const match = /\b([a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.(?:csv|txt|json|pdf|zip|xlsx|xls|docx|png|jpg|jpeg|webp))\b/i.exec(criterion);
    return clean(match?.[1] || "");
}
function buttonNameFromCriterion(criterion, fileName) {
    const quoted = firstQuotedAfter(criterion, /\b(?:click|clicking|press|tap)\b[^"'`“‘「『]{0,80}["'`“‘「『]/i);
    if (quoted && quoted !== fileName)
        return quoted;
    const match = /\b(?:click|clicking|press|tap)\s+(?:the\s+)?(?:button\s+)?([a-zA-Z][^,.;]{1,80}?)(?:\s+(?:then|and)\b|\s+(?:to\s+)?(?:download|export)s?\b|$)/i.exec(criterion);
    return clean(match?.[1] || "").replace(/^["'`“‘「『]+|["'`”’」』]+$/g, "");
}
function contentIncludesFromCriterion(criterion, fileName, buttonName) {
    const quoted = firstQuotedAfter(criterion, /\b(?:contain|contains|containing|include|includes|including|with)\b[^"'`“‘「『]{0,80}["'`“‘「『]/i);
    if (quoted && quoted !== fileName && quoted !== buttonName)
        return quoted;
    const candidates = quotedText(criterion).filter(item => item !== fileName && item !== buttonName);
    return candidates[candidates.length - 1] || "";
}
function flowName(project, flow) {
    try {
        const parsed = new URL(flow.url);
        return `Acceptance download flow: ${project.name} ${parsed.pathname || "/"}`;
    }
    catch {
        return `Acceptance download flow: ${project.name}`;
    }
}
function flowActions(flow) {
    return [
        { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
        { type: "click", role: "button", name: flow.buttonName, exact: true },
    ];
}
function flowAssertions(flow) {
    return [
        { type: "pageNotBlank" },
        {
            type: "downloadedFile",
            fileName: flow.fileName,
            contentIncludes: flow.contentIncludes || undefined,
            minBytes: 1,
        },
        { type: "urlIncludes", text: flow.path || "/" },
        { type: "consoleNoErrors" },
        { type: "networkNoErrors" },
    ];
}
function buildAcceptanceDownloadFlows(project, acceptanceCriteria = []) {
    if (!project.targetUrl)
        return [];
    const flows = [];
    const seen = new Set();
    for (const raw of acceptanceCriteria) {
        const criterion = clean(raw);
        if (!criterion || !looksLikeDownloadCriterion(criterion))
            continue;
        const path = explicitUrlPath(criterion);
        const url = path ? (0, utils_1.resolveUrl)(project.targetUrl, path) : project.targetUrl;
        const fileName = fileNameFromCriterion(criterion);
        const buttonName = buttonNameFromCriterion(criterion, fileName);
        if (!url || !fileName || !buttonName)
            continue;
        const contentIncludes = contentIncludesFromCriterion(criterion, fileName, buttonName);
        const key = `${url}:${buttonName.toLowerCase()}:${fileName.toLowerCase()}:${contentIncludes.toLowerCase()}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        flows.push({
            criterion,
            url,
            path: path || "/",
            buttonName,
            fileName,
            contentIncludes,
        });
    }
    return flows;
}
function buildAcceptanceDownloadFlowBrowserChecks(project, acceptanceCriteria = []) {
    return buildAcceptanceDownloadFlows(project, acceptanceCriteria).map(flow => ({
        name: flowName(project, flow),
        url: flow.url,
        probeType: exports.ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE,
        actions: flowActions(flow),
        assertions: flowAssertions(flow),
        screenshot: true,
    }));
}
//# sourceMappingURL=acceptance-download-flows.js.map
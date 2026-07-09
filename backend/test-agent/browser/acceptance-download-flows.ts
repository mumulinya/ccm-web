import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE = "acceptance_download_flow";

export interface AcceptanceDownloadFlow {
  criterion: string;
  url: string;
  path: string;
  buttonName: string;
  fileName: string;
  contentIncludes: string;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function quotedText(value: string) {
  const out: string[] = [];
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
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value))) {
      const text = clean(match[1]);
      if (text) out.push(text);
    }
  }
  return out;
}

function firstQuotedAfter(criterion: string, pattern: RegExp) {
  const match = pattern.exec(criterion);
  if (!match) return "";
  return quotedText(criterion.slice(match.index))[0] || "";
}

function explicitUrlPath(criterion: string) {
  const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
  return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}

function looksLikeDownloadCriterion(criterion: string) {
  const hasDownload = /\b(?:download|downloads|downloaded|export|exports|exported)\b/i.test(criterion)
    || /(?:下载|导出)/.test(criterion);
  const hasClick = /\b(?:click|clicking|press|tap)\b/i.test(criterion)
    || /(?:点击|点按|轻触|按下)/.test(criterion);
  return hasDownload && hasClick;
}

function looksLikeFileName(value: string) {
  return /^[^\\/:*?"<>|\r\n]+\.[a-z0-9]{1,12}$/i.test(value.trim());
}

function fileNameFromCriterion(criterion: string) {
  const quoted = quotedText(criterion).find(looksLikeFileName);
  if (quoted) return quoted;
  const match = /\b([a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.(?:csv|txt|json|pdf|zip|xlsx|xls|docx|png|jpg|jpeg|webp))\b/i.exec(criterion);
  return clean(match?.[1] || "");
}

function buttonNameFromCriterion(criterion: string, fileName: string) {
  const quoted = firstQuotedAfter(criterion, /(?:\b(?:click|clicking|press|tap)\b|点击|点按|轻触|按下)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (quoted && quoted !== fileName) return quoted;
  const match = /\b(?:click|clicking|press|tap)\s+(?:the\s+)?(?:button\s+)?([a-zA-Z][^,.;]{1,80}?)(?:\s+(?:then|and)\b|\s+(?:to\s+)?(?:download|export)s?\b|$)/i.exec(criterion);
  return clean(match?.[1] || "").replace(/^["'`“‘「『]+|["'`”’」』]+$/g, "");
}

function contentIncludesFromCriterion(criterion: string, fileName: string, buttonName: string) {
  const quoted = firstQuotedAfter(criterion, /(?:\b(?:contain|contains|containing|include|includes|including|with)\b|内容包含|包含|包括|含有)[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (quoted && quoted !== fileName && quoted !== buttonName) return quoted;
  const candidates = quotedText(criterion).filter(item => item !== fileName && item !== buttonName);
  return candidates[candidates.length - 1] || "";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceDownloadFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance download flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance download flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceDownloadFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    { type: "click", role: "button", name: flow.buttonName, exact: true },
  ];
}

function flowAssertions(flow: AcceptanceDownloadFlow): BrowserAssertionSpec[] {
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

export function buildAcceptanceDownloadFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceDownloadFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceDownloadFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeDownloadCriterion(criterion)) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const fileName = fileNameFromCriterion(criterion);
    const buttonName = buttonNameFromCriterion(criterion, fileName);
    if (!url || !fileName || !buttonName) continue;
    const contentIncludes = contentIncludesFromCriterion(criterion, fileName, buttonName);
    const key = `${url}:${buttonName.toLowerCase()}:${fileName.toLowerCase()}:${contentIncludes.toLowerCase()}`;
    if (seen.has(key)) continue;
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

export function buildAcceptanceDownloadFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceDownloadFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE,
    context: {
      source: "acceptance_criteria",
      generatedBy: ACCEPTANCE_DOWNLOAD_FLOW_PROBE_TYPE,
      acceptanceCriteria: [flow.criterion],
      buttonName: flow.buttonName,
      fileName: flow.fileName,
      contentIncludes: flow.contentIncludes,
    },
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}

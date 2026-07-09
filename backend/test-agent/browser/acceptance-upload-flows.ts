import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { resolveUrl } from "../utils";

export const ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE = "acceptance_upload_flow";

export interface AcceptanceUploadFlow {
  criterion: string;
  url: string;
  path: string;
  fieldLabel: string;
  fileName: string;
  fileContent: string;
  mediaType: string;
  buttonName: string;
  expectedText: string;
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

function firstQuotedAfter(value: string, pattern: RegExp) {
  const match = pattern.exec(value);
  if (!match) return "";
  return quotedText(value.slice(match.index))[0] || "";
}

function explicitUrlPath(criterion: string) {
  const match = /(^|[\s(["'`])((?:\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%-]+)+(?:\?[a-zA-Z0-9._~!$&'()*+,;=:@/?%-]+)?)/.exec(criterion);
  return clean(match?.[2] || "").replace(/[),.;:!?，。；：！？]+$/g, "");
}

function looksLikeUploadCriterion(criterion: string) {
  return /\b(?:upload|uploads|uploaded|attach|attaches|attached)\b/i.test(criterion)
    && /\b(?:click|clicking|press|tap|submit)\b/i.test(criterion)
    && !/\b(?:download|downloads|downloaded|export|exports|exported)\b/i.test(criterion);
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

function uploadSegment(criterion: string) {
  const start = /\b(?:upload|uploads|uploaded|attach|attaches|attached)\b/i.exec(criterion)?.index ?? -1;
  if (start < 0) return "";
  const tail = criterion.slice(start);
  const boundary = /\b(?:click|clicking|press|tap|submit|then|afterwards|after|should|must|will)\b/i.exec(tail.slice(1));
  return boundary ? tail.slice(0, boundary.index + 1) : tail;
}

function fileContentFromCriterion(segment: string, fileName: string) {
  const quoted = firstQuotedAfter(segment, /\b(?:contain|contains|containing|include|includes|including|with\s+content|content)\b[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (quoted && quoted !== fileName) return quoted;
  return `TestAgent upload content for ${fileName || "upload.txt"}`;
}

function fieldLabelFromCriterion(segment: string, fileName: string, fileContent: string) {
  const quoted = firstQuotedAfter(segment, /\b(?:to|into|in|for)\b[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (quoted && quoted !== fileName && quoted !== fileContent) return quoted;
  const candidates = quotedText(segment).filter(item => item !== fileName && item !== fileContent);
  return candidates[candidates.length - 1] || "";
}

function buttonNameFromCriterion(criterion: string, fileName: string, fieldLabel: string, fileContent: string) {
  const quoted = firstQuotedAfter(criterion, /\b(?:click|clicking|press|tap|submit)\b[^"'`“‘「『]{0,80}["'`“‘「『]/i);
  if (quoted && quoted !== fileName && quoted !== fieldLabel && quoted !== fileContent) return quoted;
  const match = /\b(?:click|clicking|press|tap|submit)\s+(?:the\s+)?(?:button\s+)?([a-zA-Z][^,.;]{1,80}?)(?:\s+(?:then|and)\b|$)/i.exec(criterion);
  return clean(match?.[1] || "").replace(/^["'`“‘「『]+|["'`”’」』]+$/g, "");
}

function expectedTextFromCriterion(criterion: string, fileName: string, fieldLabel: string, fileContent: string, buttonName: string) {
  const afterThen = /(?:then|after(?:wards)?|and then|should|must|will)\b/i.exec(criterion);
  const tail = afterThen ? criterion.slice(afterThen.index) : criterion;
  const expected = firstQuotedAfter(tail, /(?:show|shows|display|displays|see|visible|appear|appears|contain|contains|include|includes|list|lists|render|renders)\w*\s+["'`“‘「『]/i);
  if (expected) return expected;
  const ignored = new Set([fileName, fieldLabel, fileContent, buttonName]);
  const distinct = quotedText(tail).find(item => !ignored.has(item));
  return distinct || fileName;
}

function mediaTypeForFileName(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "csv") return "text/csv";
  if (ext === "json") return "application/json";
  if (ext === "txt" || ext === "md") return "text/plain";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function flowName(project: NormalizedTestAgentProjectTarget, flow: AcceptanceUploadFlow) {
  try {
    const parsed = new URL(flow.url);
    return `Acceptance upload flow: ${project.name} ${parsed.pathname || "/"}`;
  } catch {
    return `Acceptance upload flow: ${project.name}`;
  }
}

function flowActions(flow: AcceptanceUploadFlow): BrowserActionSpec[] {
  return [
    { type: "goto", url: flow.url, waitUntil: "domcontentloaded" },
    {
      type: "uploadFile",
      label: flow.fieldLabel,
      fileName: flow.fileName,
      fileContent: flow.fileContent,
      mediaType: flow.mediaType,
      exact: true,
    },
    { type: "click", role: "button", name: flow.buttonName, exact: true },
    { type: "waitForTimeout", value: "250" },
  ];
}

function flowAssertions(flow: AcceptanceUploadFlow): BrowserAssertionSpec[] {
  return [
    { type: "pageNotBlank" },
    { type: "text", text: flow.expectedText },
    { type: "urlIncludes", text: flow.path || "/" },
    { type: "consoleNoErrors" },
    { type: "networkNoErrors" },
  ];
}

export function buildAcceptanceUploadFlows(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): AcceptanceUploadFlow[] {
  if (!project.targetUrl) return [];
  const flows: AcceptanceUploadFlow[] = [];
  const seen = new Set<string>();

  for (const raw of acceptanceCriteria) {
    const criterion = clean(raw);
    if (!criterion || !looksLikeUploadCriterion(criterion)) continue;
    const path = explicitUrlPath(criterion);
    const url = path ? resolveUrl(project.targetUrl, path) : project.targetUrl;
    const fileName = fileNameFromCriterion(criterion);
    const segment = uploadSegment(criterion);
    const fileContent = fileContentFromCriterion(segment, fileName);
    const fieldLabel = fieldLabelFromCriterion(segment, fileName, fileContent);
    const buttonName = buttonNameFromCriterion(criterion, fileName, fieldLabel, fileContent);
    const expectedText = expectedTextFromCriterion(criterion, fileName, fieldLabel, fileContent, buttonName);
    if (!url || !fileName || !fieldLabel || !buttonName || !expectedText) continue;
    const key = `${url}:${fieldLabel.toLowerCase()}:${buttonName.toLowerCase()}:${fileName.toLowerCase()}:${fileContent.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flows.push({
      criterion,
      url,
      path: path || "/",
      fieldLabel,
      fileName,
      fileContent,
      mediaType: mediaTypeForFileName(fileName),
      buttonName,
      expectedText,
    });
  }

  return flows;
}

export function buildAcceptanceUploadFlowBrowserChecks(project: NormalizedTestAgentProjectTarget, acceptanceCriteria: string[] = []): BrowserCheckSpec[] {
  return buildAcceptanceUploadFlows(project, acceptanceCriteria).map(flow => ({
    name: flowName(project, flow),
    url: flow.url,
    probeType: ACCEPTANCE_UPLOAD_FLOW_PROBE_TYPE,
    actions: flowActions(flow),
    assertions: flowAssertions(flow),
    screenshot: true,
  }));
}

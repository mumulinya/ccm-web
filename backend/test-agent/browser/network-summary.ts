import { BrowserCheckResult, BrowserNetworkSummaryItem } from "../types";
import { parseBrowserNetworkLine } from "./network-assertions";

function bump(counts: Record<string, number>, key: string) {
  const normalized = key || "unknown";
  counts[normalized] = (counts[normalized] || 0) + 1;
}

function uniqueLimited(values: string[], limit = 12) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function extractUrl(value: string) {
  const match = String(value || "").match(/\bhttps?:\/\/[^\s)]+/i);
  return match ? match[0].replace(/[.,;]+$/, "") : "";
}

function failureKind(line: string) {
  const first = String(line || "").trim().split(/\s+/)[0] || "network_error";
  return first.replace(/[^a-z0-9_.:-]/gi, "_") || "network_error";
}

function summarizeOne(result: BrowserCheckResult): BrowserNetworkSummaryItem {
  const networkRequests = result.networkRequests || [];
  const networkErrors = result.networkErrors || [];
  const statusCodes: Record<string, number> = {};
  const resourceTypes: Record<string, number> = {};
  const failureKinds: Record<string, number> = {};
  const failedUrls: string[] = [];
  let requestCount = 0;
  let responseCount = 0;
  let failedRequestCount = 0;
  let failedResponseCount = 0;

  for (const line of networkRequests) {
    const parsed = parseBrowserNetworkLine(line);
    if (parsed.kind === "request" && line.startsWith("request ")) requestCount += 1;
    if (parsed.kind === "response" && parsed.status !== undefined && line.startsWith("response ")) {
      responseCount += 1;
      bump(statusCodes, String(parsed.status));
      bump(resourceTypes, parsed.resourceType || "unknown");
      if (parsed.status >= 400) {
        failedResponseCount += 1;
        if (parsed.url) failedUrls.push(parsed.url);
      }
    }
    if (parsed.kind === "failed") {
      failedRequestCount += 1;
      if (parsed.url) failedUrls.push(parsed.url);
    }
  }

  for (const error of networkErrors) {
    bump(failureKinds, failureKind(error));
    const url = extractUrl(error);
    if (url) failedUrls.push(url);
  }

  return {
    project: result.project,
    name: result.name,
    ...(result.provider ? { provider: result.provider } : {}),
    status: result.status,
    url: result.url,
    ...(result.finalUrl ? { finalUrl: result.finalUrl } : {}),
    requestCount,
    responseCount,
    failedRequestCount,
    failedResponseCount,
    errorCount: networkErrors.length,
    statusCodes,
    resourceTypes,
    failureKinds,
    failedUrls: uniqueLimited(failedUrls),
    errors: networkErrors.slice(0, 12),
    ...(result.networkLogPath ? { networkLogPath: result.networkLogPath } : {}),
  };
}

export function buildBrowserNetworkSummary(results: BrowserCheckResult[]): BrowserNetworkSummaryItem[] {
  return results.map(summarizeOne);
}

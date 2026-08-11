import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { startPlaywrightAppServer } from "./playwright-app-server.mjs";

const root = path.resolve(import.meta.dirname, "..");
const appHost = await startPlaywrightAppServer(root, { port: 3086 });
const outputDir = path.join(root, "scratch", "agent-metrics-regression");
fs.mkdirSync(outputDir, { recursive: true });
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"].filter(Boolean);
const executablePath = candidates.find(candidate => fs.existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const report = { pass: false, checks: [], screenshots: [], errors: [] };
const date = "2026-08-11";
const aggregate = (calls, tokens, extra = {}) => ({
  calls, successes: Math.max(0, calls - 1), failures: Math.min(1, calls), totalMs: calls * 3200,
  avgMs: 3200, durationsMs: [2100, 3200, 5100], inputTokens: Math.round(tokens * .72), outputTokens: Math.round(tokens * .28),
  providerTotalTokens: tokens, usageReportedCalls: Math.max(0, calls - 1), unreportedCalls: calls ? 1 : 0,
  cacheCreationInputTokens: Math.round(tokens * .08), cacheReadInputTokens: Math.round(tokens * .3), totalCostUsd: tokens / 100000,
  modelMs: calls * 2100, toolWallMs: calls * 600, queueWaitMs: 180, verificationMs: 900, summaryMs: 300,
  peakCpuPercent: 42.5, peakRssBytes: 201326592, peakChildProcessCount: 4, lastCall: `${date}T08:10:00.000Z`, ...extra,
});
const projectRoles = {
  main_agent: { "project-main-agent": aggregate(8, 18200) },
  project_agent: { codex: aggregate(5, 12400) },
  test_agent: { "test-agent": aggregate(3, 2300, { usageReportedCalls: 1, localNoModelCalls: 2, unreportedCalls: 0 }) },
};
const projects = Array.from({ length: 14 }, (_, index) => ({ id: index ? `project-${index}` : "smart-live-ui", name: index ? `业务项目 ${index}` : "smart-live-ui", agent: index % 2 ? "Codex" : "Claude Code", scopeKey: `project:${index ? `project-${index}` : "smart-live-ui"}` }));
const groups = Array.from({ length: 6 }, (_, index) => ({ id: `group-${index + 1}`, name: index ? `研发协作群 ${index + 1}` : "智评生活开发群", coordinator: "group-main-agent", members: [{ project: "smart-live-ui", role: "coordinator" }, { project: "smart-live-api", role: "member" }] }));

const metricsResponse = {
  metrics: {
    version: 3, schema: "ccm-metrics-dashboard-v3", updatedAt: `${date}T08:10:00.000Z`, agents: {}, daily: {},
    scopes: {
      "global:global": { roles: { global_agent: { "global-agent": aggregate(4, 9800) } }, dailyRoles: { [date]: { global_agent: { "global-agent": aggregate(4, 9800) } } } },
      "project:smart-live-ui": { roles: projectRoles, dailyRoles: { [date]: projectRoles } },
    },
    coverage: [
      { scopeType: "project", scopeId: "smart-live-ui", role: "main_agent", agent: "project-main-agent", runtime: "main-agent-model", usageSource: "provider_reported", calls: 7 },
      { scopeType: "project", scopeId: "smart-live-ui", role: "main_agent", agent: "project-main-agent", runtime: "main-agent-model", usageSource: "unreported", missingReason: "runtime_unreported", calls: 1 },
      { scopeType: "project", scopeId: "smart-live-ui", role: "project_agent", agent: "codex", runtime: "codex", usageSource: "provider_reported", calls: 4 },
      { scopeType: "project", scopeId: "smart-live-ui", role: "project_agent", agent: "codex", runtime: "codex", usageSource: "unreported", missingReason: "runtime_unreported", calls: 1 },
      { scopeType: "project", scopeId: "smart-live-ui", role: "test_agent", agent: "test-agent", runtime: "native-test-agent", usageSource: "local_no_model", calls: 2 },
      { scopeType: "project", scopeId: "smart-live-ui", role: "test_agent", agent: "test-agent", runtime: "native-test-agent+model-planner", usageSource: "provider_reported", calls: 1 },
    ],
  },
  catalog: { projects, groups, global: { id: "global", name: "全局 Agent", agent: "global-agent", scopeKey: "global:global" }, legacyUnscoped: {} },
  system: { collectedAt: `${date}T08:10:00.000Z`, process: { cpuPercent: 12.4, heapUsedBytes: 125829120, heapTotalBytes: 268435456, rssBytes: 314572800, uptimeSeconds: 7200, pid: 1234 }, eventLoop: { utilization: 4.2 } },
  agentResources: [{ id: "run-1", project: "smart-live-ui", source: "agent-cli", commandLabel: "Codex", ageMs: 8400, resources: { cpuPercent: 31.2, rssBytes: 178257920, childProcessCount: 3 } }],
};
const session = { success: true, authenticated: true, user: { id: "admin-1", username: "metrics-admin", role: "admin" }, csrf: "metrics-csrf", access: { features: ["maintenance_ops"], resources: [] } };
const mockApi = async (page) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const json = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/session") return json(session);
    if (url.pathname === "/api/metrics") return json(metricsResponse);
    if (url.pathname === "/api/metrics/events") return json({ success: true, events: [], total: 0, page: 1, pageSize: 20, totalPages: 1, statusCounts: { all: 0, completed: 0, failed: 0, cancelled: 0, blocked: 0, unknown: 0 } });
    if (url.pathname === "/api/reliability/drills/status") return json({ success: true, status: null, runs: [] });
    if (url.pathname === "/api/global-agent/runs") return json({ success: true, runs: [] });
    if (String(route.request().headers().accept || "").includes("text/event-stream")) return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    return json({ success: true, items: [], groups: [], projects: [] });
  });
};

async function run(viewport, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(`${name}: ${error.message}`));
  page.on("console", message => { if (message.type() === "error") report.errors.push(`${name}: ${message.text()}`); });
  await mockApi(page);
  await page.goto(`${appHost.baseUrl}/?tab=metrics`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator(".metrics-page").waitFor();
  await page.locator(".scope-picker-trigger").click();
  await page.locator(".scope-picker-popover").waitFor();
  const layout = await page.evaluate(() => {
    const root = document.querySelector(".metrics-page");
    const popover = document.querySelector(".scope-picker-popover");
    const list = document.querySelector(".scope-picker-list");
    return { pageOverflow: root.scrollWidth - root.clientWidth, popoverWidth: popover.getBoundingClientRect().width, listClient: list.clientHeight, listScroll: list.scrollHeight, fixed: getComputedStyle(popover).position === "fixed" };
  });
  assert.ok(layout.pageOverflow <= 1, `${name} page overflow: ${JSON.stringify(layout)}`);
  if (viewport.width > 700) assert.ok(layout.popoverWidth >= 380 && layout.listScroll > layout.listClient, `desktop scope popup contract failed: ${JSON.stringify(layout)}`);
  else assert.equal(layout.fixed, true, `mobile scope picker should be a bottom drawer: ${JSON.stringify(layout)}`);
  report.checks.push({ name, ...layout });
  const screenshot = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  report.screenshots.push(screenshot);
  await context.close();
}

try {
  await run({ width: 1536, height: 900 }, "desktop-grouped-scope-picker");
  await run({ width: 430, height: 860 }, "mobile-scope-bottom-drawer");
  assert.equal(report.errors.length, 0, report.errors.join("\n"));
  report.pass = true;
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await appHost.server.close();
}

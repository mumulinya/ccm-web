#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const scratch = path.join(root, "scratch", "main-agent-cc-tools-selftest");
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(path.join(scratch, ".cc-connect", "configs"), { recursive: true });
const project = path.join(scratch, "alpha");
fs.mkdirSync(path.join(project, "src"), { recursive: true });
fs.writeFileSync(path.join(project, "src", "service.ts"), "export function alpha() {\n  return 'alpha';\n}\n");
fs.writeFileSync(path.join(project, "root.ts"), "export const rootValue = 'root';\n");
fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "alpha", scripts: { test: "node test.js" } }, null, 2));
fs.writeFileSync(path.join(project, ".env"), "SECRET=do-not-read\n");
fs.writeFileSync(path.join(scratch, ".cc-connect", "configs", "config-alpha.toml"), `[[projects]]\nname = "alpha"\nwork_dir = "${project.replaceAll("\\", "\\\\")}"\ntype = "codex"\n`);
process.env.HOME = scratch;
process.env.USERPROFILE = scratch;

const require = createRequire(import.meta.url);
const workspace = require(path.join(root, "ccm-package", "dist", "tools", "workspace-readonly-tools.js"));
const mainRuntime = require(path.join(root, "ccm-package", "dist", "tools", "main-agent-tool-runtime.js"));
const ccLimits = require(path.join(root, "ccm-package", "dist", "tools", "cc-tool-result-limits.js"));
const toolDisplay = require(path.join(root, "ccm-package", "dist", "system", "tool-display-projection.js"));
const eventApi = require(path.join(root, "ccm-package", "dist", "system", "user-visible-agent-events-api.js"));

assert.equal(workspace.runWorkspaceReadonlyToolsSelfTest().success, true);
assert.equal(ccLimits.CC_ALIGNED_FILE_READ_MAX_TOKENS, 25_000);
assert.equal(ccLimits.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS, 100_000);
assert.equal(ccLimits.CC_ALIGNED_GLOB_MAX_RESULTS, 100);
assert.equal(ccLimits.CC_ALIGNED_GREP_DEFAULT_HEAD_LIMIT, 250);
assert.ok(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.length >= 21);
const readSchema = workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.find(tool => tool.name === "read_file")?.inputSchema;
assert.equal(readSchema?.properties?.limit?.maximum, 2_000);
assert.equal(readSchema?.properties?.token_budget, undefined);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "read_file")?.inputSchema?.properties?.token_budget, undefined);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "read_files")?.inputSchema?.properties?.token_budget, undefined);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.find(tool => tool.name === "glob_files")?.inputSchema?.properties?.limit?.maximum, 100);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "glob_files")?.inputSchema?.properties?.limit?.maximum, 100);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.find(tool => tool.name === "list_directory")?.inputSchema?.properties?.limit?.maximum, 100);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "list_directory")?.inputSchema?.properties?.limit?.maximum, 100);
const webFetchSchema = workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.find(tool => tool.name === "web_fetch")?.inputSchema;
assert.ok(webFetchSchema?.required?.includes("prompt"));
assert.equal(webFetchSchema?.properties?.max_chars, undefined);
assert.ok(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "web_fetch")?.inputSchema?.required?.includes("prompt"));
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "web_fetch")?.inputSchema?.properties?.max_chars, undefined);
assert.match(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.name === "read_file")?.description || "", /最多读取2000行/);
const htmlMd = require(path.join(root, "ccm-package", "dist", "tools", "html-to-light-markdown.js"));
assert.match(htmlMd.htmlToLightMarkdown("<h1>Hello</h1><p>See <a href=\"https://example.com\">docs</a></p><pre>code()</pre>"), /# Hello/);
assert.match(htmlMd.htmlToLightMarkdown("<h1>Hello</h1><p>See <a href=\"https://example.com\">docs</a></p><pre>code()</pre>"), /\[docs\]\(https:\/\/example.com\)/);
assert.match(htmlMd.htmlToLightMarkdown("<h1>Hello</h1><p>See <a href=\"https://example.com\">docs</a></p><pre>code()</pre>"), /```[\s\S]*code\(\)/);
const token = workspace.sealScopedToolCapability({ scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3, allowedProjects: ["alpha"] });
assert.equal(workspace.openScopedToolCapability(token).exactSessionId, "pchat-alpha");

const listing = await workspace.executeWorkspaceReadonlyTool("list_directory", { path: "", limit: 20 }, token);
assert.equal(listing.items.some(item => item.name === "src"), true);
assert.equal(listing.items.some(item => item.name === ".env"), false);
const listingDisplay = toolDisplay.buildToolDisplayDetail({ toolName: "mcp__ccm__ccm_workspace_readonly__list_directory", arguments: { project_id: "alpha", path: "", limit: 20 }, result: listing });
assert.equal(listingDisplay.tool.label, "List directory");
assert.equal(listingDisplay.tool.family, "read");
assert.equal(listingDisplay.tool.userLabel, "查找目录");
assert.equal(listingDisplay.tool.name, "list_directory");
assert.equal(listingDisplay.tool.category, "builtin");
assert.equal(listingDisplay.tool.serverLabel, undefined);
assert.equal(listingDisplay.result.rows.some(item => item.name === "src"), true);
const glob = await workspace.executeWorkspaceReadonlyTool("glob_files", { pattern: "**/*.ts", limit: 20 }, token);
assert.deepEqual(glob.items, ["root.ts", "src/service.ts"]);
const sensitiveGrep = await workspace.executeWorkspaceReadonlyTool("grep_text", { pattern: "do-not-read", limit: 20 }, token);
assert.equal(sensitiveGrep.lines.some(line => String(line).includes("do-not-read")), false);
const firstRead = await workspace.executeWorkspaceReadonlyTool("read_file", { path: "src/service.ts", offset: 1, limit: 1 }, token);
assert.equal(firstRead.lines.length, 1);
assert.equal(firstRead.truncated, true);
const persistedReadDisplay = toolDisplay.buildToolDisplayDetail({ toolName: "mcp__ccm__ccm_workspace_readonly__read_file", arguments: { path: "src/service.ts", offset: 1, limit: 1 }, result: firstRead });
assert.equal(persistedReadDisplay.tool.family, "read");
assert.equal(persistedReadDisplay.tool.userLabel, "读取文件");
assert.equal(JSON.stringify(persistedReadDisplay).includes("export function alpha"), false);
assert.equal(persistedReadDisplay.result.rehydratable, true);
const rehydratedReadDisplay = await eventApi.rehydrateReadonlyToolDetail({
  scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3,
  toolName: "mcp__ccm__ccm_workspace_readonly__read_file", toolCallId: "read-call",
  detail: { safeArguments: { path: "src/service.ts", offset: 1, limit: 1 }, toolDisplay: persistedReadDisplay },
});
assert.equal(JSON.stringify(rehydratedReadDisplay).includes("export function alpha"), true);
assert.equal(rehydratedReadDisplay.result.fileRows.length, 1);
assert.equal(rehydratedReadDisplay.result.fileRows[0].freshness, "current");
assert.equal(rehydratedReadDisplay.result.fileRows[0].observedChecksum, rehydratedReadDisplay.result.fileRows[0].currentChecksum);
const searchDisplay = toolDisplay.buildToolDisplayDetail({ toolName: "mcp__ccm__ccm_workspace_readonly__grep_text", arguments: { pattern: "alpha" }, result: { lines: [], total: 0 } });
assert.equal(searchDisplay.tool.family, "search");
assert.equal(searchDisplay.tool.userLabel, "搜索代码");
const terminalDisplay = toolDisplay.buildToolDisplayDetail({ toolName: "run_terminal", arguments: { command: "npm test TOKEN=super-secret" }, includeTechnicalCommand: true });
assert.equal(terminalDisplay.tool.family, "terminal");
assert.equal(terminalDisplay.tool.userLabel, "运行项目命令");
assert.equal(String(terminalDisplay.sensitiveCommand).includes("super-secret"), false);
await assert.rejects(() => eventApi.rehydrateReadonlyToolDetail({
  scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3,
  toolName: "mcp__external__write_file", toolCallId: "write-call", detail: { safeArguments: { path: "src/service.ts" } },
}), /不支持安全详情重取/);
assert.equal(toolDisplay.isWorkspaceReadonlyToolName("read_files"), true);
assert.equal(toolDisplay.isWorkspaceReadonlyToolName("mcp__ccm__ccm_workspace_readonly__read_files"), true);
assert.equal(toolDisplay.workspaceReadonlyContractVersion("read_files"), 3);
const shortNameBatch = await eventApi.rehydrateReadonlyToolDetail({
  scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3,
  toolName: "read_files", toolCallId: "batch-read-short",
  detail: {
    safeArguments: { paths: ["package.json", "src/service.ts"] },
    toolDisplay: toolDisplay.buildToolDisplayDetail({ toolName: "read_files", arguments: { paths: ["package.json", "src/service.ts"] }, result: {} }),
  },
});
assert.equal(shortNameBatch.result.fileRows.length, 2);
assert.ok(shortNameBatch.result.fileRows.some(file => file.path === "package.json" && Array.isArray(file.lines) && file.lines.length > 0));
assert.ok(JSON.stringify(shortNameBatch.result.fileRows).includes("alpha"));
const secondRead = await workspace.executeWorkspaceReadonlyTool("read_file", { path: "src/service.ts", offset: Number(firstRead.next_cursor), limit: 20 }, token);
assert.equal(secondRead.lines[0].line, 2);
await assert.rejects(() => workspace.executeWorkspaceReadonlyTool("read_file", { path: ".env" }, token), /敏感文件/);

const symbolResult = await workspace.executeWorkspaceReadonlyTool("workspace_symbols", { query: "alpha", limit: 20 }, token);
assert.equal(symbolResult.schema, "ccm-code-intelligence-result-v1");
assert.equal(symbolResult.contentStored, false);
assert.equal(symbolResult.locations.some(location => location.symbol === "alpha"), true);
const definitionResult = await workspace.executeWorkspaceReadonlyTool("find_definition", { path: "src/service.ts", symbol: "alpha", limit: 20 }, token);
assert.equal(definitionResult.locations.some(location => location.path === "src/service.ts"), true);
const firstIndexGeneration = definitionResult.indexGeneration;
fs.appendFileSync(path.join(project, "src", "service.ts"), "\nexport function beta() { return alpha(); }\n");
const driftedReadDisplay = await eventApi.rehydrateReadonlyToolDetail({
  scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3,
  toolName: "mcp__ccm__ccm_workspace_readonly__read_file", toolCallId: "read-call",
  detail: { safeArguments: { path: "src/service.ts", offset: 1, limit: 1 }, toolDisplay: persistedReadDisplay },
});
assert.equal(driftedReadDisplay.result.fileRows[0].freshness, "drifted");
assert.notEqual(driftedReadDisplay.result.fileRows[0].observedChecksum, driftedReadDisplay.result.fileRows[0].currentChecksum);
const incrementalResult = await workspace.executeWorkspaceReadonlyTool("workspace_symbols", { query: "beta", limit: 20 }, token);
assert.equal(incrementalResult.locations.some(location => location.symbol === "beta"), true);
assert.ok(incrementalResult.indexGeneration > firstIndexGeneration);

const groupToken = workspace.sealScopedToolCapability({ scope: "group", scopeId: "g1", exactSessionId: "gs1", generation: 1, allowedProjects: ["alpha"] });
const groupListing = await workspace.executeWorkspaceReadonlyTool("list_directory", { path: "", limit: 20 }, groupToken);
assert.equal(groupListing.project, "alpha");
assert.equal(groupListing.items.some(item => item.name === "src"), true);
const multiToken = workspace.sealScopedToolCapability({ scope: "group", scopeId: "g1", exactSessionId: "gs1", generation: 1, allowedProjects: ["alpha", "beta"] });
const needProject = await workspace.executeWorkspaceReadonlyTool("list_directory", { path: "", limit: 20 }, multiToken);
assert.equal(needProject.status, "needs_project_id");
assert.deepEqual(needProject.available_projects, ["alpha", "beta"]);
const needDisplay = toolDisplay.buildToolDisplayDetail({ toolName: "mcp__ccm__ccm_workspace_readonly__list_directory", arguments: { path: "" }, result: needProject });
assert.equal(needDisplay.result.kind, "summary");
assert.match(needDisplay.result.summary, /请选择要查看的项目/);
assert.equal(needDisplay.result.kind !== "error", true);

const globalToken = workspace.sealScopedToolCapability({ scope: "global", scopeId: "global-agent", exactSessionId: "gas-alpha", generation: 1, allowedProjects: ["alpha"] });
await assert.rejects(() => workspace.executeWorkspaceReadonlyTool("read_file", { project_id: "beta", path: "package.json" }, globalToken), /无权读取项目/);
const globalUnique = await workspace.executeWorkspaceReadonlyTool("list_directory", { path: "", limit: 20 }, globalToken);
assert.equal(globalUnique.project, "alpha");
const expired = workspace.sealScopedToolCapability({ scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 1, allowedProjects: ["alpha"], issuedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2020-01-01T00:01:00.000Z" });
assert.throws(() => workspace.openScopedToolCapability(expired), /已过期/);

const context = mainRuntime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "项目主 Agent",
  mcpPolicy: "read_only",
  scopeIdentity: { scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", allowedProjects: ["alpha"] },
});
assert.equal(context.schema, "ccm-main-agent-tool-runtime-context-v2");
assert.deepEqual(context.catalog.loadedMcp.filter(tool => tool.server === "ccm__workspace_readonly").map(tool => tool.name).sort(), ["glob_files", "grep_text", "list_directory", "read_file", "read_files"]);
assert.match(context.policyPrompt, /可直接使用的工作区工具/);
assert.match(context.policyPrompt, /- read_file:/);
assert.match(context.policyPrompt, /默认一次读完/);
assert.equal(context.policyPrompt.includes("首轮读取预算"), false);
assert.equal(context.policyPrompt.includes("不超过8000"), false);
assert.equal(context.policyPrompt.includes("mcp__ccm__ccm_workspace_readonly__read_file"), false);
assert.equal(context.policyPrompt.includes("参数 Schema="), true);
const nativeContext = mainRuntime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "项目主 Agent",
  mcpPolicy: "read_only",
  schemaSurface: "native",
  scopeIdentity: { scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", allowedProjects: ["alpha"] },
});
assert.equal(nativeContext.policyPrompt.includes("参数 Schema="), false);
assert.match(nativeContext.policyPrompt, /- read_file:/);
const nativeLoop = require(path.join(root, "ccm-package", "dist", "agents", "native-query-loop.js"));
const nativeTools = nativeLoop.catalogToNativeTools(nativeContext);
assert.equal(nativeTools.some(tool => tool.name === "tool_search"), true);
assert.equal(nativeTools.some(tool => tool.name === "invoke_skill"), true);
assert.equal(nativeTools.some(tool => tool.name === "read_file" && tool.deferred !== true), true);
assert.equal(nativeTools.every(tool => !String(tool.name).includes("ccm_workspace_readonly")), true);
assert.equal(context.catalog.discoverableMcp.length, workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.length - 5);
const emptyGroupContext = mainRuntime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "群聊主 Agent",
  mcpPolicy: "read_only",
  scopeIdentity: { scope: "group", scopeId: "empty-group", exactSessionId: "gcs-empty", allowedProjects: [] },
});
assert.equal(emptyGroupContext.capabilityToken, "");
assert.equal(emptyGroupContext.catalog.loadedMcp.some(tool => tool.server === "ccm__workspace_readonly"), false);
assert.equal(emptyGroupContext.catalog.discoverableMcp.some(tool => tool.server === "ccm__workspace_readonly"), false);

const contextualRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_file", arguments: { path: "src/service.ts", offset: 1, limit: 1 }, reason: "inspect context ledger" }],
  toolContext: context,
});
assert.equal(contextualRead[0].ok, true);
const contextualReadPayload = JSON.parse(contextualRead[0].output);
assert.equal(contextualReadPayload.modelPayload.status, "partial");
assert.equal(contextualReadPayload.modelPayload.continuation.nextOffset, 2);
assert.equal(typeof contextualReadPayload.modelPayload.continuation.checksum, "string");
const unchangedRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_file", arguments: { path: "src/service.ts", offset: 1, limit: 1 }, reason: "deduplicate context read" }],
  toolContext: context,
});
assert.equal(JSON.parse(unchangedRead[0].output).modelPayload.status, "unchanged");
const continuedRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_file", arguments: { path: "src/service.ts", offset: contextualReadPayload.modelPayload.continuation.nextOffset, limit: 20, expected_checksum: contextualReadPayload.modelPayload.continuation.checksum }, reason: "continue safely" }],
  toolContext: context,
});
assert.equal(JSON.parse(continuedRead[0].output).modelPayload.lines[0].line, 2);
const suggestedRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_file", arguments: { path: "src/servce.ts", offset: 1, limit: 1 }, reason: "suggest safe path" }],
  toolContext: context,
});
assert.equal(suggestedRead[0].ok, false);
const suggestedReadPayload = JSON.parse(suggestedRead[0].output);
assert.equal(suggestedReadPayload.code, "PATH_NOT_FOUND");
assert.equal(suggestedReadPayload.suggestions[0].path, "src/service.ts");
const reliableSearch = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "grep_text", arguments: { pattern: "alpha", path: "src", output_mode: "files_with_matches" }, reason: "inspect reliable search" }],
  toolContext: context,
});
assert.equal(reliableSearch[0].ok, true);
assert.equal(JSON.parse(reliableSearch[0].output).modelPayload.searchExecution.engine, "bundled_rg");
const cancelledSearchController = new AbortController();
cancelledSearchController.abort();
const cancelledSearch = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "grep_text", arguments: { pattern: "alpha", path: ".", output_mode: "content" }, reason: "cancel search safely" }],
  toolContext: context,
  abortSignal: cancelledSearchController.signal,
});
const cancelledSearchPayload = JSON.parse(cancelledSearch[0].output).modelPayload;
assert.equal(cancelledSearchPayload.status, "partial", JSON.stringify(cancelledSearchPayload));
assert.equal(cancelledSearchPayload.searchExecution.cancelled, true);
const firstBatchRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_files", arguments: { paths: ["src/service.ts", "root.ts"] }, reason: "batch read" }],
  toolContext: context,
});
assert.equal(JSON.parse(firstBatchRead[0].output).modelPayload.item_count, 2);
fs.writeFileSync(path.join(project, "large.ts"), Array.from({ length: 500 }, (_, index) => `export const fixture_${index} = '${"x".repeat(32)}';`).join("\n"));
const resilientBatchRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{
    name: "read_files",
    arguments: {
      paths: [
        { path: "large.ts", offset: 1, limit: 500 },
        { path: "root.ts", offset: 1, limit: 20 },
        { path: "src", offset: 1, limit: 20 },
      ],
    },
    reason: "preserve successful files when one batch item fails",
  }],
  toolContext: context,
});
assert.equal(resilientBatchRead[0].ok, true, resilientBatchRead[0].error);
const resilientBatchPayload = JSON.parse(resilientBatchRead[0].output).modelPayload;
assert.equal(resilientBatchPayload.item_count, 3);
assert.equal(resilientBatchPayload.read_count, 2);
assert.equal(resilientBatchPayload.failed_count, 1);
assert.equal(resilientBatchPayload.status, "partial");
assert.equal(resilientBatchPayload.files[0].status, "read");
assert.equal(resilientBatchPayload.files[1].status, "read");
assert.equal(resilientBatchPayload.files[2].status, "failed");
assert.match(resilientBatchPayload.files[2].error, /目标不是文件/);
const resilientBatchDisplay = toolDisplay.buildToolDisplayDetail({
  toolName: "mcp__ccm__ccm_workspace_readonly__read_files",
  arguments: { paths: ["large.ts", "root.ts", "src"] },
  result: resilientBatchPayload,
  transientBody: true,
});
assert.match(resilientBatchDisplay.result.summary, /成功读取 2 个，1 个读取失败/);
assert.equal(resilientBatchDisplay.result.total, 3);
assert.equal(resilientBatchDisplay.result.rows.find(row => row.path === "src")?.status, "读取失败");
const failedBatchRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_files", arguments: { paths: ["src"] }, reason: "surface an all-failed batch as failure" }],
  toolContext: context,
});
assert.equal(failedBatchRead[0].ok, false);
assert.equal(JSON.parse(failedBatchRead[0].output).code, "BATCH_READ_FAILED");
const unchangedBatchRead = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_files", arguments: { paths: ["src/service.ts", "root.ts"] }, reason: "deduplicate batch read" }],
  toolContext: context,
});
const unchangedBatchPayload = JSON.parse(unchangedBatchRead[0].output).modelPayload;
assert.equal(unchangedBatchPayload.item_count, 2);
assert.equal(unchangedBatchPayload.files.every(file => file.status === "unchanged"), true);
fs.writeFileSync(path.join(project, "src", "service.ts"), "export function beta() {\n  return 'beta';\n}\n");
const driftedContinuation = await mainRuntime.executeMainAgentToolRequests({
  requests: [{ name: "read_file", arguments: { path: "src/service.ts", offset: 2, limit: 20, expected_checksum: contextualReadPayload.modelPayload.continuation.checksum }, reason: "reject stale continuation" }],
  toolContext: context,
});
assert.equal(driftedContinuation[0].ok, false);
assert.equal(JSON.parse(driftedContinuation[0].output).code, "FILE_CHANGED");
const rejectedBeforeSearch = await mainRuntime.executeMainAgentToolRequests({ requests: [{ name: "read_git_status", arguments: {}, reason: "inspect" }], toolContext: context });
assert.equal(rejectedBeforeSearch[0].error, "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED");
const searchRows = await mainRuntime.executeMainAgentToolRequests({ requests: [{ name: "tool_search", arguments: { query: "Git" }, reason: "inspect" }], toolContext: context });
assert.equal(searchRows[0].ok, true);
assert.equal(context.catalog.loadedMcp.some(tool => tool.name === "read_git_status"), true);
assert.match(searchRows[0].output, /inputSchema/);
assert.match(searchRows[0].output, /"name":"read_git_status"/);
assert.equal(searchRows[0].output.includes("mcp__ccm__ccm_workspace_readonly__read_git_status"), false);
assert.match(context.policyPrompt, /CCM ToolSearch 本轮已加载 Schema/);

const fakeTool = (name, readOnlyHint) => ({
  name,
  canonicalName: name,
  server: "selftest",
  description: name,
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint },
});
const fakeContext = {
  catalog: {
    mcp: [fakeTool("read_a", true), fakeTool("read_b", true), fakeTool("write_c", false)],
    loadedMcp: [fakeTool("read_a", true), fakeTool("read_b", true), fakeTool("write_c", false)],
    discoverableMcp: [],
    skills: [],
  },
  scope: {},
  capabilityToken: "",
};
let activeCalls = 0;
let maxActiveCalls = 0;
const executionOrder = [];
const executeTimed = async name => {
  activeCalls += 1;
  maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
  executionOrder.push(`start:${name}`);
  await new Promise(resolve => setTimeout(resolve, name === "read_a" ? 25 : 10));
  executionOrder.push(`end:${name}`);
  activeCalls -= 1;
  return { name };
};
const parallelRows = await mainRuntime.executeMainAgentToolRequests({
  requests: [
    { name: "read_a", arguments: {}, reason: "parallel read" },
    { name: "read_b", arguments: {}, reason: "parallel read" },
  ],
  toolContext: fakeContext,
  executeToolCall: executeTimed,
  toolBatchSize: 2,
  readOnlyParallelism: 2,
});
assert.equal(maxActiveCalls, 2);
assert.deepEqual(parallelRows.map(row => row.name), ["read_a", "read_b"]);

activeCalls = 0;
maxActiveCalls = 0;
executionOrder.length = 0;
const serialRows = await mainRuntime.executeMainAgentToolRequests({
  requests: [
    { name: "read_a", arguments: {}, reason: "read before write" },
    { name: "write_c", arguments: {}, reason: "serialized write" },
    { name: "read_b", arguments: {}, reason: "read after write" },
  ],
  toolContext: fakeContext,
  executeToolCall: executeTimed,
  toolBatchSize: 3,
  readOnlyParallelism: 3,
});
assert.equal(maxActiveCalls, 1);
assert.deepEqual(serialRows.map(row => row.name), ["read_a", "write_c", "read_b"]);
assert.deepEqual(executionOrder, ["start:read_a", "end:read_a", "start:write_c", "end:write_c", "start:read_b", "end:read_b"]);

const projectSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "project-main-agent.ts"), "utf8");
const groupSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-orchestrator-llm.ts"), "utf8");
const nativeLoopSrc = fs.readFileSync(path.join(root, "backend", "agents", "native-query-loop.ts"), "utf8");
assert.equal((projectSource.match(/hydrateProjectConfiguredTools\(\{/g) || []).length, 0);
assert.equal(groupSource.includes('canonicalName: "read_project_source"'), false);
assert.equal(nativeLoopSrc.includes("while (true)"), true);
assert.equal(projectSource.includes("runProjectMainNativeQueryLoop"), true);
assert.equal(groupSource.includes("runGroupMainNativeQueryLoop"), true);
assert.equal(projectSource.includes("for (let round = 0; round <= loopBudget.maxToolRounds"), false);
assert.equal(groupSource.includes("for (let round = 0; round <= loopBudget.maxToolRounds"), false);

console.log(JSON.stringify({
  pass: true,
  tools: workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.length,
  base_tools: 5,
  lazy_tools: workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.length - 5,
  semantic_code_intelligence: true,
  incremental_index_generation: true,
  complete_line_paging: true,
  root_glob_and_sensitive_grep: true,
  sensitive_file_blocked: true,
  cross_project_blocked: true,
  empty_group_workspace_tools_hidden: true,
  expired_capability_blocked: true,
  duplicate_project_selector_removed: true,
  group_duplicate_source_schema_removed: true,
  safe_read_parallelism: true,
  side_effect_serial_barrier: true,
  adaptive_project_group_loops: true,
  provider_calls: 0,
}, null, 2));

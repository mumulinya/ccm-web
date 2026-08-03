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

assert.equal(workspace.runWorkspaceReadonlyToolsSelfTest().success, true);
assert.equal(workspace.WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.length, 12);
const token = workspace.sealScopedToolCapability({ scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 3, allowedProjects: ["alpha"] });
assert.equal(workspace.openScopedToolCapability(token).exactSessionId, "pchat-alpha");

const listing = await workspace.executeWorkspaceReadonlyTool("list_directory", { path: "", limit: 20 }, token);
assert.equal(listing.items.some(item => item.name === "src"), true);
assert.equal(listing.items.some(item => item.name === ".env"), false);
const glob = await workspace.executeWorkspaceReadonlyTool("glob_files", { pattern: "**/*.ts", limit: 20 }, token);
assert.deepEqual(glob.items, ["root.ts", "src/service.ts"]);
const sensitiveGrep = await workspace.executeWorkspaceReadonlyTool("grep_text", { pattern: "do-not-read", limit: 20 }, token);
assert.equal(sensitiveGrep.lines.some(line => String(line).includes("do-not-read")), false);
const firstRead = await workspace.executeWorkspaceReadonlyTool("read_file", { path: "src/service.ts", offset: 1, limit: 1 }, token);
assert.equal(firstRead.lines.length, 1);
assert.equal(firstRead.truncated, true);
const secondRead = await workspace.executeWorkspaceReadonlyTool("read_file", { path: "src/service.ts", offset: Number(firstRead.next_cursor), limit: 20 }, token);
assert.equal(secondRead.lines[0].line, 2);
await assert.rejects(() => workspace.executeWorkspaceReadonlyTool("read_file", { path: ".env" }, token), /敏感文件/);

const globalToken = workspace.sealScopedToolCapability({ scope: "global", scopeId: "global-agent", exactSessionId: "gas-alpha", generation: 1, allowedProjects: ["alpha"] });
await assert.rejects(() => workspace.executeWorkspaceReadonlyTool("read_file", { project_id: "beta", path: "package.json" }, globalToken), /无权读取项目/);
const expired = workspace.sealScopedToolCapability({ scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", generation: 1, allowedProjects: ["alpha"], issuedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2020-01-01T00:01:00.000Z" });
assert.throws(() => workspace.openScopedToolCapability(expired), /已过期/);

const context = mainRuntime.buildMainAgentToolRuntimeContext({
  configuredTools: {},
  label: "项目主 Agent",
  mcpPolicy: "read_only",
  scopeIdentity: { scope: "project", scopeId: "alpha", exactSessionId: "pchat-alpha", allowedProjects: ["alpha"] },
});
assert.equal(context.schema, "ccm-main-agent-tool-runtime-context-v2");
assert.deepEqual(context.catalog.mcp.filter(tool => tool.server === "ccm__workspace_readonly").map(tool => tool.name).sort(), ["glob_files", "grep_text", "list_directory", "read_file"]);
assert.equal(context.catalog.discoverableMcp.length, 8);
const rejectedBeforeSearch = await mainRuntime.executeMainAgentToolRequests({ requests: [{ name: "read_git_status", arguments: {}, reason: "inspect" }], toolContext: context });
assert.equal(rejectedBeforeSearch[0].error, "MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED");
const searchRows = await mainRuntime.executeMainAgentToolRequests({ requests: [{ name: "tool_search", arguments: { query: "Git" }, reason: "inspect" }], toolContext: context });
assert.equal(searchRows[0].ok, true);
assert.equal(context.catalog.mcp.some(tool => tool.name === "read_git_status"), true);
assert.match(searchRows[0].output, /inputSchema/);
assert.match(context.policyPrompt, /CCM ToolSearch 本轮已加载 Schema/);

const projectSource = fs.readFileSync(path.join(root, "backend", "modules", "projects", "project-main-agent.ts"), "utf8");
const groupSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-orchestrator-llm.ts"), "utf8");
assert.equal((projectSource.match(/hydrateProjectConfiguredTools\(\{/g) || []).length, 0);
assert.equal(groupSource.includes('canonicalName: "read_project_source"'), false);

console.log(JSON.stringify({
  pass: true,
  tools: 12,
  base_tools: 4,
  lazy_tools: 8,
  complete_line_paging: true,
  root_glob_and_sensitive_grep: true,
  sensitive_file_blocked: true,
  cross_project_blocked: true,
  expired_capability_blocked: true,
  duplicate_project_selector_removed: true,
  group_duplicate_source_schema_removed: true,
  provider_calls: 0,
}, null, 2));

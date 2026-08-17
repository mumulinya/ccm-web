const INTERNAL_CONTEXT_TOOL_SERVERS = new Set([
  "ccm__workspace_readonly",
  "ccm-group-readonly",
  "ccm-project-readonly",
  "ccm__global_native",
  "ccm__knowledge_context",
]);

function toolIdentityParts(tool: any) {
  const server = String(tool?.server || tool?.serverName || "").trim();
  const name = String(tool?.canonicalName || tool?.name || tool?.function?.name || tool?.id || "").trim();
  const source = String(tool?.source || "").trim();
  return { server, name, source, blob: `${server} ${name} ${source}` };
}

export function isInternalContextToolServer(server: string) {
  return INTERNAL_CONTEXT_TOOL_SERVERS.has(String(server || "").trim());
}

export function isBuiltinOrWorkspaceToolDefinition(tool: any) {
  const { server, name, blob } = toolIdentityParts(tool);
  if (isInternalContextToolServer(server)) return true;
  if (/ccm_workspace_readonly|ccm__workspace_readonly/.test(blob)) return true;
  if (/ccm-group-readonly|ccm-project-readonly/.test(blob)) return true;
  return false;
}

export function isUserMcpToolDefinition(tool: any) {
  const { server, name, blob } = toolIdentityParts(tool);
  if (!name && !server) return false;
  if (isBuiltinOrWorkspaceToolDefinition(tool)) return false;
  if (/subagent|task[_-]?agent|worker[_-]?agent/i.test(blob)) return false;
  if (server && !isInternalContextToolServer(server)) return true;
  return /^mcp__/i.test(name);
}

export function selectUserMcpToolDefinitions(value: any): any[] {
  const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  return items.filter((item: any) => item && typeof item === "object" && isUserMcpToolDefinition(item));
}

export function runSessionContextToolBucketSelfTest() {
  const workspace = { name: "read_file", canonicalName: "mcp__ccm__ccm_workspace_readonly__read_file", server: "ccm__workspace_readonly" };
  const inspect = { name: "inspect_system" };
  const userMcp = { name: "search_records", canonicalName: "mcp__ccm__docs__search_records", server: "docs" };
  const checks = {
    workspaceIsBuiltin: isBuiltinOrWorkspaceToolDefinition(workspace) === true,
    workspaceIsNotUserMcp: isUserMcpToolDefinition(workspace) === false,
    inspectStaysInToolDefinitions: isUserMcpToolDefinition(inspect) === false,
    userMcpDetected: isUserMcpToolDefinition(userMcp) === true,
    selectFiltersWorkspace: selectUserMcpToolDefinitions([workspace, inspect, userMcp]).map((item: any) => item.name).join(",") === "search_records",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

import { GLOBAL_AGENT_TOOL_SPECS } from "./global-agent-run-store";
import { WORKSPACE_READONLY_TOOL_DEFINITIONS_V3 } from "../../tools/workspace-readonly-tools";

const GLOBAL_ALWAYS_INLINE_TOOLS = new Set([
  "tool_search",
  "invoke_skill",
  "invoke_mcp",
  "inspect_system",
]);

const WORKSPACE_BY_NAME = new Map(WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.map(tool => [tool.name, tool]));

function uniqueNames(values: any[] = []) {
  return new Set(values.map(value => String(value || "").trim()).filter(Boolean));
}

export function isGlobalAlwaysInlineTool(name: string) {
  const toolName = String(name || "").trim();
  if (GLOBAL_ALWAYS_INLINE_TOOLS.has(toolName)) return true;
  return WORKSPACE_BY_NAME.get(toolName)?.loadPolicy === "base";
}

export function isGlobalDeferredTool(name: string, loadedToolNames: string[] = []) {
  const toolName = String(name || "").trim();
  if (!toolName || isGlobalAlwaysInlineTool(toolName)) return false;
  return !uniqueNames(loadedToolNames).has(toolName);
}

function skinnySchema(spec: { name: string; required?: string[] }) {
  const properties: Record<string, any> = {};
  for (const key of spec.required || []) {
    properties[key] = {
      type: key === "targets" || key === "files" ? "array" : "string",
      description: `${spec.name}.${key}`,
    };
  }
  if (!properties.operation) properties.operation = { type: "string" };
  return {
    type: "object",
    additionalProperties: true,
    required: spec.required || [],
    properties,
  };
}

export function globalDiscoverableManagementTools(loadedToolNames: string[] = []) {
  const loaded = uniqueNames(loadedToolNames);
  return GLOBAL_AGENT_TOOL_SPECS
    .filter(spec => isGlobalDeferredTool(spec.name, [...loaded]) && !WORKSPACE_BY_NAME.has(spec.name))
    .map(spec => ({
      name: spec.name,
      canonicalName: spec.name,
      server: "ccm__global_native",
      description: spec.description,
      inputSchema: skinnySchema(spec),
      loadPolicy: "search" as const,
      authorized: true,
      connected: true,
      annotations: { readOnlyHint: spec.risk === "read" },
    }));
}

export function runGlobalToolLoadPolicySelfTest() {
  const loaded = ["manage_project", "read_git_status"];
  const discoverable = globalDiscoverableManagementTools(loaded);
  const names = discoverable.map(tool => tool.name);
  const checks = {
    inspectSystemInline: isGlobalAlwaysInlineTool("inspect_system") === true,
    readFileInline: isGlobalAlwaysInlineTool("read_file") === true,
    toolSearchInline: isGlobalAlwaysInlineTool("tool_search") === true,
    manageProjectDeferredUntilLoaded: isGlobalDeferredTool("manage_project") === true
      && isGlobalDeferredTool("manage_project", loaded) === false,
    orchestrateDeferred: isGlobalDeferredTool("orchestrate_development") === true,
    gitSearchDeferredUntilLoaded: isGlobalDeferredTool("read_git_status") === true
      && isGlobalDeferredTool("read_git_status", loaded) === false,
    discoverableOmitsLoadedAndWorkspace: names.includes("orchestrate_development") === true
      && names.includes("manage_project") === false
      && names.includes("read_git_status") === false
      && names.includes("read_file") === false
      && names.includes("inspect_system") === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

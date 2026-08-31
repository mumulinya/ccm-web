"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGlobalAlwaysInlineTool = isGlobalAlwaysInlineTool;
exports.isGlobalDeferredTool = isGlobalDeferredTool;
exports.globalDiscoverableManagementTools = globalDiscoverableManagementTools;
exports.runGlobalToolLoadPolicySelfTest = runGlobalToolLoadPolicySelfTest;
const global_agent_run_store_1 = require("./global-agent-run-store");
const GLOBAL_ALWAYS_INLINE_TOOLS = new Set([
    "tool_search",
    "invoke_skill",
    "invoke_mcp",
    "inspect_system",
    "read_scope_instruction",
    "request_project_source_inquiry",
    "request_group_source_inquiry",
]);
function uniqueNames(values = []) {
    return new Set(values.map(value => String(value || "").trim()).filter(Boolean));
}
function isGlobalAlwaysInlineTool(name) {
    const toolName = String(name || "").trim();
    return GLOBAL_ALWAYS_INLINE_TOOLS.has(toolName);
}
function isGlobalDeferredTool(name, loadedToolNames = []) {
    const toolName = String(name || "").trim();
    if (!toolName || isGlobalAlwaysInlineTool(toolName))
        return false;
    return !uniqueNames(loadedToolNames).has(toolName);
}
function skinnySchema(spec) {
    const properties = {};
    for (const key of spec.required || []) {
        properties[key] = {
            type: key === "targets" || key === "files" ? "array" : "string",
            description: `${spec.name}.${key}`,
        };
    }
    if (!properties.operation)
        properties.operation = { type: "string" };
    return {
        type: "object",
        additionalProperties: true,
        required: spec.required || [],
        properties,
    };
}
function globalDiscoverableManagementTools(loadedToolNames = []) {
    const loaded = uniqueNames(loadedToolNames);
    return global_agent_run_store_1.GLOBAL_AGENT_TOOL_SPECS
        .filter(spec => isGlobalDeferredTool(spec.name, [...loaded]))
        .map(spec => ({
        name: spec.name,
        canonicalName: spec.name,
        server: "ccm__global_native",
        description: spec.description,
        inputSchema: skinnySchema(spec),
        loadPolicy: "search",
        authorized: true,
        connected: true,
        annotations: { readOnlyHint: spec.risk === "read" },
    }));
}
function runGlobalToolLoadPolicySelfTest() {
    const loaded = ["manage_project", "read_git_status"];
    const discoverable = globalDiscoverableManagementTools(loaded);
    const names = discoverable.map(tool => tool.name);
    const checks = {
        inspectSystemInline: isGlobalAlwaysInlineTool("inspect_system") === true,
        readFileUnavailable: isGlobalAlwaysInlineTool("read_file") === false
            && global_agent_run_store_1.GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === "read_file") === false,
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
//# sourceMappingURL=global-tool-load-policy.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFERRED_TOOL_SCHEMA_VERSION = void 0;
exports.deferredToolDefinition = deferredToolDefinition;
exports.deferredToolCallVia = deferredToolCallVia;
exports.validateDeferredToolInput = validateDeferredToolInput;
exports.resolveDeferredToolCall = resolveDeferredToolCall;
exports.resolveGlobalDeferredToolCall = resolveGlobalDeferredToolCall;
exports.recordGlobalDeferredToolSchemas = recordGlobalDeferredToolSchemas;
exports.normalizeDeferredToolEvidence = normalizeDeferredToolEvidence;
exports.validateGlobalDeferredConfirmation = validateGlobalDeferredConfirmation;
const crypto_1 = require("crypto");
const ajv_provider_js_1 = require("@modelcontextprotocol/sdk/validation/ajv-provider.js");
exports.DEFERRED_TOOL_SCHEMA_VERSION = 'ccm-native-tools-v2';
const validator = new ajv_provider_js_1.AjvJsonSchemaValidator();
const INTERNAL_SERVERS = new Set(['ccm__workspace_readonly', 'ccm-group-readonly', 'ccm-project-readonly', 'ccm__global_native']);
function deferredToolDefinition() {
    return { name: 'invoke_deferred_tool', description: 'Invoke a loaded internal tool through its exact name and schema returned by tool_search. Discovery does not add top-level function definitions.',
        inputSchema: { type: 'object', additionalProperties: false, required: ['name', 'input'],
            properties: { name: { type: 'string', minLength: 1 }, input: { type: 'object' } } } };
}
function deferredToolCallVia(tool) {
    return INTERNAL_SERVERS.has(String(tool?.server || '')) ? 'invoke_deferred_tool' : 'invoke_mcp';
}
function validateDeferredToolInput(tool, input) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('MAIN_AGENT_TOOL_ARGUMENTS_INVALID');
    const result = validator.getValidator(tool.inputSchema || { type: 'object' })(input);
    if (!result.valid)
        throw new Error('MAIN_AGENT_TOOL_ARGUMENTS_INVALID');
    return input;
}
const schemaChecksum = (tool) => (0, crypto_1.createHash)('sha256').update(JSON.stringify({ description: tool.description || '', inputSchema: tool.inputSchema || {} })).digest('hex');
function resolveDeferredToolCall(name, args, tools) {
    if (name !== 'invoke_deferred_tool')
        return { name, arguments: args || {} };
    validateDeferredToolInput(deferredToolDefinition(), args);
    const target = String(args.name || '').trim();
    const tool = tools.find(row => target === row.canonicalName || target === row.name);
    if (!tool || deferredToolCallVia(tool) !== 'invoke_deferred_tool')
        throw new Error('MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED');
    validateDeferredToolInput(tool, args.input);
    return { name: String(tool.server === 'ccm__workspace_readonly' || tool.server === 'ccm__global_native' ? tool.name : tool.canonicalName || tool.name), arguments: args.input,
        targetSchemaChecksum: schemaChecksum(tool) };
}
function resolveGlobalDeferredToolCall(run, name, args) {
    if (name !== 'invoke_deferred_tool' && !run.deferred_tool_schema_bindings?.[name]) {
        const { isGlobalAlwaysInlineTool } = require('./global/global-tool-load-policy');
        if (!run.deferred_tool_binding_identity || isGlobalAlwaysInlineTool(name))
            return { name, arguments: args || {} };
    }
    if (run.deferred_tool_binding_identity && run.deferred_tool_binding_identity !== bindingIdentity(run))
        throw new Error('MAIN_AGENT_TOOL_SCOPE_CHANGED');
    // Rebuild the current catalog for every execution/confirmation; never trust
    // names supplied in a model argument or a stale in-memory Provider surface.
    const { buildGlobalAgentToolRuntimeContext } = require('../modules/global/global-agent-tool-authorization');
    const context = buildGlobalAgentToolRuntimeContext({ taskId: run.id, sessionId: run.session_id }, run.loaded_tool_names || run.loadedToolNames || []);
    const target = name === 'invoke_deferred_tool' ? String(args?.name || '') : name;
    const definition = (context.loaded_tools || []).find((row) => target === row.name || target === row.canonicalName);
    if (!definition)
        throw new Error('MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED');
    const known = run.deferred_tool_schema_bindings?.[target];
    if (run.deferred_tool_binding_identity && !known)
        throw new Error('MAIN_AGENT_TOOL_SCHEMA_CHANGED');
    if (known && known !== schemaChecksum(definition))
        throw new Error('MAIN_AGENT_TOOL_SCHEMA_CHANGED');
    validateDeferredToolInput(definition, name === 'invoke_deferred_tool' ? args?.input : args);
    return resolveDeferredToolCall(name, args, context.loaded_tools || []);
}
function recordGlobalDeferredToolSchemas(run) {
    if (run.deferred_tool_binding_identity && run.deferred_tool_binding_identity !== bindingIdentity(run))
        throw new Error('MAIN_AGENT_TOOL_SCOPE_CHANGED');
    const { buildGlobalAgentToolRuntimeContext } = require('../modules/global/global-agent-tool-authorization');
    const context = buildGlobalAgentToolRuntimeContext({ taskId: run.id, sessionId: run.session_id }, run.loaded_tool_names || run.loadedToolNames || []);
    run.deferred_tool_schema_bindings = Object.fromEntries((context.loaded_tools || [])
        .filter((tool) => tool.server === 'ccm__global_native' && tool.loadPolicy === 'search')
        .map((tool) => [String(tool.name), schemaChecksum(tool)]));
    run.deferred_tool_binding_identity = bindingIdentity(run);
}
function bindingIdentity(run) {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(['global', run.id, run.session_id])).digest('hex');
}
function normalizeDeferredToolEvidence(run) {
    const bindings = run?.deferred_tool_schema_bindings;
    return {
        deferred_tool_binding_identity: String(run?.deferred_tool_binding_identity || ''),
        deferred_tool_schema_bindings: Object.fromEntries(Object.entries(bindings && typeof bindings === 'object' ? bindings : {})
            .filter(([name, value]) => name.length <= 200 && /^[a-f0-9]{64}$/.test(String(value))).slice(0, 256).map(([name, value]) => [name, String(value)])),
    };
}
function validateGlobalDeferredConfirmation(run, pending) {
    const resolved = resolveGlobalDeferredToolCall(run, pending.name, pending.arguments);
    const store = require('./global/global-agent-run-store');
    const args = store.validateTool(resolved.name, resolved.arguments);
    const risk = store.classifyGlobalAgentToolRisk(resolved.name, args);
    const signature = store.toolSignature(resolved.name, args);
    if (signature !== pending.signature || risk !== pending.risk)
        throw new Error('MAIN_AGENT_TOOL_CONFIRMATION_CHANGED');
    const { evaluateGlobalAgentPermission } = require('./global/runtime');
    if (evaluateGlobalAgentPermission({ run, tool: resolved.name, args, risk, signature }).denied)
        throw new Error('MAIN_AGENT_TOOL_PERMISSION_REVOKED');
}
//# sourceMappingURL=deferred-tool-invocation.js.map
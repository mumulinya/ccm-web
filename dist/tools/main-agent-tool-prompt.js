"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_TOOL_USAGE_POLICY_VERSION = void 0;
exports.renderToolCatalogLine = renderToolCatalogLine;
exports.createToolPromptLayout = createToolPromptLayout;
exports.toolPromptSystemMessages = toolPromptSystemMessages;
exports.refreshToolCatalogMessages = refreshToolCatalogMessages;
exports.withoutPromptMetadata = withoutPromptMetadata;
exports.composeToolPolicy = composeToolPolicy;
const declared_answer_stream_1 = require("../system/declared-answer-stream");
exports.CCM_TOOL_USAGE_POLICY_VERSION = 'ccm-agent-tool-usage-v3';
// Tools encoded directly in the protocol already carry their full description
// and schema. Extensions invoked through invoke_mcp still need their own text.
const DIRECT_SCHEMA_SERVERS = new Set([
    'ccm__workspace_readonly', 'ccm-group-readonly', 'ccm-project-readonly', 'ccm__global_native',
]);
function renderToolCatalogLine(tool, name, surface) {
    if (surface === 'native' && DIRECT_SCHEMA_SERVERS.has(String(tool?.server || '')))
        return `- ${name}`;
    const description = String(tool?.description || tool?.name || '');
    return surface === 'native' ? `- ${name}: ${description}`
        : `- ${name}: ${description}; parameter schema=${JSON.stringify(tool?.inputSchema || {})}`;
}
function createToolPromptLayout(stable, catalog, runtimeContext) {
    return { layoutVersion: 'ccm-prefix-layout-v4', stablePolicy: [...stable, declared_answer_stream_1.ANSWER_PHASE_POLICY].filter(Boolean).join('\n\n'),
        dynamicCatalog: catalog, runtimeContext: runtimeContext.filter(row => row.content.trim()) };
}
function toolPromptSystemMessages(input) {
    const layout = input.toolPromptLayout;
    const block = (content, contextBlockType, promptPart) => content?.trim()
        ? [{ role: 'system', content: content.trim(), contextBlockType, promptPart, prefixLayoutVersion: layout.layoutVersion,
                ...(contextBlockType === 'system' && ['identity', 'stable_policy'].includes(promptPart)
                    ? { prefixEligible: true, publicPrefixEligible: true } : {}) }] : [];
    return [
        ...block(input.identityRules, 'system', 'identity'),
        ...block(layout.stablePolicy, 'system', 'stable_policy'),
        // The catalog is deterministically ordered, but its contents are allowed
        // to grow when tool_search/deferred schemas are loaded. Keep the catalog
        // as an authoritative system block while marking it dynamic so the wire
        // transcript moves it to the suffix. Putting a session's first catalog in
        // the stable head meant that the next request (after discovery/restored
        // tools) changed message:1:system and the relay fell back to its 192-token
        // baseline fragment. Identity and stable policy remain in the prefix;
        // catalog bytes are still sent exactly once in the current request.
        ...block(layout.dynamicCatalog, 'dynamic_context', 'tool_catalog'),
        ...block(input.sessionGuidance || '', 'dynamic_context', 'session'),
        ...layout.runtimeContext.flatMap(row => block(row.content, 'dynamic_context', row.kind)),
    ];
}
function refreshToolCatalogMessages(messages, layout) {
    if (!layout)
        return messages;
    const catalogIndex = messages.findIndex(row => row.role === 'system' && row.promptPart === 'tool_catalog');
    if (catalogIndex < 0)
        return messages;
    const current = messages[catalogIndex];
    const updateIndexes = messages
        .map((row, index) => row?.role === 'system' && row?.promptPart === 'tool_catalog_update' ? index : -1)
        .filter(index => index >= 0);
    if (current?.content === layout.dynamicCatalog && updateIndexes.length === 0)
        return messages;
    // A catalog that is already marked dynamic has not been committed to the
    // provider prefix. Replace that one runtime slot in place instead of
    // appending a second copy. The transcript adapter will place the resulting
    // catalog at the suffix after committed conversation history.
    if (String(current?.contextBlockType || current?.context_block_type || '').toLowerCase() === 'dynamic_context') {
        const replacement = { ...current, content: layout.dynamicCatalog, prefixLayoutVersion: layout.layoutVersion };
        return messages.map((row, index) => index === catalogIndex ? replacement : row)
            .filter((_row, index) => !updateIndexes.includes(index));
    }
    // The initial catalog is part of the committed system prefix. A tool_search
    // or deferred-schema load may change the effective catalog later, but
    // replacing that head block would change every byte after it and make the
    // Provider fall back to its small baseline cache fragment. Keep the original
    // catalog immutable and carry the latest discovery result as one dynamic
    // update. The provider transcript adapter moves that update to the suffix.
    const update = { role: 'system', content: layout.dynamicCatalog, contextBlockType: 'dynamic_context', promptPart: 'tool_catalog_update', prefixLayoutVersion: layout.layoutVersion };
    const withoutOldUpdates = messages.filter((_row, index) => !updateIndexes.includes(index));
    const boundary = withoutOldUpdates.findIndex((row, index) => index > catalogIndex
        && String(row?.role || '').toLowerCase() !== 'system');
    if (boundary >= 0)
        return [...withoutOldUpdates.slice(0, boundary), update, ...withoutOldUpdates.slice(boundary)];
    return [...withoutOldUpdates, update];
}
function withoutPromptMetadata(messages) {
    return messages.map(({ promptPart, prefixLayoutVersion, runtimeContextCommitted, ...row }) => row);
}
function composeToolPolicy(sections, catalog) {
    return [...sections.beforeCatalog, catalog, ...sections.afterCatalog].filter(Boolean).join('\n\n');
}
//# sourceMappingURL=main-agent-tool-prompt.js.map
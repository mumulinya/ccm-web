"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogLoadedTools = catalogLoadedTools;
// loadedMcp is the current authorized, materialized catalog. mcp describes
// configured tools and discoverableMcp describes unloaded tools; neither may
// expand a modern catalog merely to keep a provider prefix stable.
const DIRECT_NATIVE_SERVERS = new Set([
    'ccm__workspace_readonly', 'ccm-group-readonly', 'ccm-project-readonly',
]);
function catalogLoadedTools(toolContext) {
    const catalog = toolContext?.catalog || {};
    // Only legacy callers without a loaded catalog use mcp as their loaded list.
    // In particular, an explicit empty list must not restore configured tools.
    const source = Array.isArray(catalog.loadedMcp) ? catalog.loadedMcp
        : Array.isArray(catalog.mcp) ? catalog.mcp : [];
    const seen = new Set();
    return source.filter((tool) => {
        if (!DIRECT_NATIVE_SERVERS.has(String(tool?.server || '')))
            return false;
        const name = String(tool?.canonicalName || tool?.name || '');
        if (!name || seen.has(name))
            return false;
        seen.add(name);
        return true;
    });
}
//# sourceMappingURL=native-tool-catalog.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactWorkspaceDirectoryModelBody = compactWorkspaceDirectoryModelBody;
/** Only called for a trusted, freshly executed CCM list_directory result. */
function compactWorkspaceDirectoryModelBody(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.items)
        || !['read', 'scope_too_broad'].includes(value.status))
        return value;
    return { ...value, items: value.items.map((row) => {
            if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.path !== 'string'
                || typeof row.name !== 'string' || !['file', 'directory', 'other'].includes(row.type))
                return row;
            // Workspace paths use '/', even on Windows. Preserve any distinct name;
            // do not interpret platform separators or touch nested business fields.
            if (!row.name || row.path.split('/').at(-1) !== row.name)
                return row;
            const { name, ...entry } = row;
            return entry;
        }) };
}
//# sourceMappingURL=workspace-directory-model-body.js.map
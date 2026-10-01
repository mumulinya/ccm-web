"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeProviderPrefixLayers = summarizeProviderPrefixLayers;
const crypto_1 = require("crypto");
const hash = (value) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(value ?? null)).digest('hex');
const bytes = (value) => Buffer.byteLength(JSON.stringify(value ?? null));
/** Classifies only explicitly tagged prompt blocks. Dynamic/session content is
 * deliberately excluded from the public layer and can never be inferred from
 * keywords or arbitrary business fields. */
function summarizeProviderPrefixLayers(messages = [], previous) {
    const rows = Array.isArray(messages) ? messages : [];
    const publicRows = rows.filter(row => ['public_header', 'identity', 'stable_policy', 'protocol'].includes(String(row?.promptPart || '')));
    // The wire projection folds mutable tool/session/skill blocks into one
    // runtime-context message. Keep that message in the private layer so a
    // catalog or authorization change cannot be mistaken for a reusable public
    // prefix. It is never promoted into the workspace-public checksum.
    const privateRows = rows.filter(row => String(row?.promptPart || '') === 'tool_catalog'
        || String(row?.contextBlockType || '') === 'scope_private'
        || String(row?.contextBlockType || '') === 'runtime_context');
    const publicValue = publicRows.map(row => ({ role: row.role, promptPart: row.promptPart, content: row.content }));
    const privateValue = privateRows.map(row => ({ role: row.role, promptPart: row.promptPart, content: row.content }));
    const workspacePublicChecksum = hash(publicValue);
    const scopePrivateChecksum = hash(privateValue);
    let reuseClassification = 'no_comparable_request';
    let firstChangedSegment = null;
    if (previous) {
        if (previous.workspacePublicChecksum !== workspacePublicChecksum) {
            reuseClassification = 'stable_prefix_changed';
            firstChangedSegment = 'workspace_public';
        }
        else if (previous.scopePrivateChecksum !== scopePrivateChecksum) {
            reuseClassification = 'tool_schema_changed';
            firstChangedSegment = 'scope_private';
        }
        else
            reuseClassification = 'public_prefix_same';
    }
    return { workspacePublicChecksum, scopePrivateChecksum, workspacePublicBytes: bytes(publicValue), scopePrivateBytes: bytes(privateValue), firstChangedSegment, reuseClassification, contentStored: false };
}
//# sourceMappingURL=provider-prefix-layers.js.map
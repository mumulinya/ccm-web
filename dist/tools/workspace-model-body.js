"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactWorkspaceModelBody = compactWorkspaceModelBody;
/** Lossless representation changes, restricted to CCM-owned workspace records. */
function compactWorkspaceModelBody(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return value;
    const schema = String(value.schema || '');
    const known = /^ccm-workspace-(?:read|glob|grep|json-fields)/.test(schema);
    if (!known)
        return value;
    const body = { ...value };
    if (Array.isArray(body.lines) && body.lines.every((row) => Number.isInteger(row?.line) && typeof row?.text === 'string')) {
        body.content = body.lines.map((row) => `${row.line}\t${row.text}`).join('\n');
        delete body.lines;
    }
    if (Array.isArray(body.files))
        body.files = body.files.map((file) => compactWorkspaceModelBody({ ...file, schema: file.schema || 'ccm-workspace-read-result-v3' }));
    if (Array.isArray(body.items) && JSON.stringify(body.items) === JSON.stringify(body.filenames))
        delete body.filenames;
    // Remove only duplicated metadata. Distinct references/fields remain evidence.
    for (const key of ['safeReceipt', 'planningEvidence']) {
        if (!body[key] || typeof body[key] !== 'object')
            continue;
        const metadata = { ...body[key] };
        for (const field of Object.keys(metadata)) {
            if (field === 'contentStored' || (body[field] !== undefined && JSON.stringify(body[field]) === JSON.stringify(metadata[field])))
                delete metadata[field];
        }
        if (Object.keys(metadata).length)
            body[key] = metadata;
        else
            delete body[key];
    }
    return body;
}
//# sourceMappingURL=workspace-model-body.js.map
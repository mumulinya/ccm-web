"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceEvidenceMetadata = sourceEvidenceMetadata;
exports.retainEvidenceRevision = retainEvidenceRevision;
/** Closed metadata projection: neither legacy nor new callers may persist source bodies. */
function sourceEvidenceMetadata(values) {
    return (Array.isArray(values) ? values : []).slice(0, 120).map(row => ({
        project: String(row.project || '').slice(0, 160), path: String(row.path || '').replace(/\\/g, '/').slice(0, 500),
        checksum: String(row.checksum || '').slice(0, 128), evidenceId: String(row.evidenceId || '').slice(0, 180),
        ...(Number.isSafeInteger(row.startLine ?? row.from) ? { startLine: row.startLine ?? row.from, endLine: row.endLine ?? row.to ?? row.startLine ?? row.from } : {}),
        verified: row.verified !== false, kind: row.kind === 'search_hit' ? 'search_hit' : 'source_read', truncated: row.truncated === true,
    })).filter(row => row.project && row.path && !/^(?:\/|[a-z]:)|(?:^|\/)\.\.(?:\/|$)/i.test(row.path));
}
function retainEvidenceRevision(existing) {
    return [...(existing?.evidenceRevisions || []), ...(existing ? [{ revision: existing.revision, status: existing.status,
                evidenceRefs: sourceEvidenceMetadata(existing.evidenceRefs), conclusionSummary: existing.conclusionSummary,
                missingEvidenceSummaries: existing.missingEvidenceSummaries, completedAt: existing.completedAt }] : [])].slice(-20);
}
//# sourceMappingURL=source-evidence-metadata.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeReviewText = void 0;
exports.finding = finding;
exports.mergeReviewFindings = mergeReviewFindings;
exports.blockingFinding = blockingFinding;
exports.evaluateReviewJob = evaluateReviewJob;
exports.reviewCanProceed = reviewCanProceed;
const credential_store_1 = require("../core/credential-store");
const settings_1 = require("./settings");
const redaction_1 = require("./redaction");
const safeReviewText = (value, max = 2000) => (0, redaction_1.redactReviewSource)((0, credential_store_1.redactSensitiveText)(String(value ?? ''))).replace(/\u0000/g, '').slice(0, max);
exports.safeReviewText = safeReviewText;
function finding(input, source, paths) {
    const rel = String(input.path || '').replace(/\\/g, '/');
    if (!paths.includes(rel))
        throw new Error('审核意见路径不属于授权快照');
    const title = (0, exports.safeReviewText)(input.title || input.content || input.description || '需要核对的代码问题');
    const severity = ['critical', 'high', 'medium', 'low'].includes(input.severity) ? input.severity : 'unknown';
    const symbol = (0, exports.safeReviewText)(input.symbol || '', 200), category = (0, exports.safeReviewText)(input.category || 'unknown', 80);
    const startLine = Math.max(1, Number(input.startLine || input.start_line || input.line || 1));
    const at = new Date().toISOString();
    return { id: `finding_${(0, settings_1.reviewHash)([rel, symbol, category, title.replace(/\d+/g, '#')]).slice(0, 24)}`, path: rel,
        startLine, endLine: Math.max(startLine, Number(input.endLine || input.end_line || startLine)), side: input.side === 'before' ? 'before' : 'after', symbol,
        category, severity, state: input.state === 'confirmed' ? 'confirmed' : 'unverified', title,
        trigger: (0, exports.safeReviewText)(input.trigger), impact: (0, exports.safeReviewText)(input.impact), suggestion: (0, exports.safeReviewText)(input.suggestion || input.suggestion_code),
        evidence: (Array.isArray(input.evidence) ? input.evidence : []).map(x => (0, exports.safeReviewText)(x, 500)).slice(0, 20), sources: [source], firstSeen: at, lastSeen: at };
}
function mergeReviewFindings(existing, incoming, subjectChecksum) {
    const map = new Map(existing.map(f => [f.id, { ...f }]));
    for (const f of incoming) {
        const prior = map.get(f.id);
        const decisionFresh = prior?.decision?.subjectChecksum === subjectChecksum;
        map.set(f.id, { ...f, firstSeen: prior?.firstSeen || f.firstSeen, sources: [...new Set([...(prior?.sources || []), ...f.sources])],
            ...(decisionFresh ? { state: prior.state, decision: prior.decision } : {}) });
    }
    return [...map.values()];
}
function blockingFinding(f, policy) {
    if (['resolved', 'false_positive', 'waived'].includes(f.state))
        return false;
    if (['scope', 'secret', 'test_integrity'].includes(f.category))
        return true;
    if (f.severity === 'unknown')
        return true;
    if (policy.level === 'light')
        return false;
    if (policy.level === 'standard')
        return f.severity === 'critical' || f.severity === 'high' && f.category === 'security';
    return ['critical', 'high'].includes(f.severity);
}
function evaluateReviewJob(job) {
    if (!job.subject.files.length)
        return 'not_required';
    if (!job.coverage.some(c => c.tool === 'secretlint' && c.status === 'complete') || !job.coverage.some(c => c.tool === 'test_integrity' && c.status === 'complete'))
        return 'incomplete';
    if (job.findings.some(f => f.state === 'confirmed' && ['scope', 'secret'].includes(f.category)))
        return 'blocked';
    const incomplete = job.coverage.some(c => ['failed', 'partial'].includes(c.status))
        || (job.policy.required && (!job.coverage.some(c => c.tool === 'ocr' && c.status === 'complete') || !job.coverage.some(c => c.tool === 'review_agent' && c.status === 'complete')));
    if (incomplete)
        return 'incomplete';
    if (job.findings.some(f => blockingFinding(f, job.policy)))
        return 'blocked';
    return job.policy.required ? 'passed' : 'not_required';
}
function reviewCanProceed(job) {
    if (job.status !== 'completed')
        return false;
    if (['passed', 'not_required'].includes(job.conclusion))
        return true;
    const warn = job.policy.level === 'commit' ? job.policy.settings.commitMode === 'warn' : job.policy.settings.taskMode === 'warn';
    return warn && !job.findings.some(f => ['scope', 'secret', 'test_integrity'].includes(f.category) && blockingFinding(f, job.policy)) && job.conclusion !== 'incomplete';
}
//# sourceMappingURL=findings.js.map
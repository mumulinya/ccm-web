"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSourceFeishuSummary = globalSourceFeishuSummary;
const global_source_summary_1 = require("./global-source-summary");
function globalSourceFeishuSummary(run) {
    const rows = (0, global_source_summary_1.buildSourceAccessSummaries)(run);
    if (!rows.length)
        return '';
    const labels = { completed: '已核对', located: '已定位，尚未读取', partial: '证据不足', needs_input: '待补充', failed: '核对失败', stale: '证据失效' };
    return '\n\n**来源与证据**\n' + rows.slice(0, 8).map(row => {
        const refs = row.evidenceRefs.slice(0, 6).map(ref => `${ref.project}/${ref.path}${ref.startLine ? `:${ref.startLine}–${ref.endLine}` : ''}`).join('、');
        return `- ${row.mode === 'direct' ? '源码读取' : '协作核对'} · ${labels[row.status] || row.status}${refs ? `：${refs}` : ''}${row.missingEvidenceSummaries.length ? `；缺口：${row.missingEvidenceSummaries.join('；')}` : ''}`;
    }).join('\n');
}
//# sourceMappingURL=global-source-feishu-summary.js.map
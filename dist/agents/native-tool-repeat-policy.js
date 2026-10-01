"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNativeToolRepeatPolicy = createNativeToolRepeatPolicy;
const crypto_1 = require("crypto");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const MAX_READ_ATTEMPTS = 3;
const CONTROL = new Set(['ccm_ask_user', 'ccm_present_plan', 'ccm_dispatch', 'tool_search', 'invoke_skill', 'invoke_mcp', 'read_scope_instruction']);
const fingerprint = (call) => (0, workspace_model_result_projection_1.stableModelJson)({ name: call.name, arguments: call.arguments || {} });
const digest = (value) => (0, crypto_1.createHash)('sha256').update((0, workspace_model_result_projection_1.stableModelJson)(value)).digest('hex');
/** Conservative reliability classification, never a routing or authorization decision. */
function transientReadFailure(row) {
    let body = row.modelOutput ?? row.output;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        }
        catch { }
    }
    const code = String(body?.code || body?.error?.code || '').toUpperCase();
    const message = `${row.error || ''} ${row.reason || ''} ${body?.error?.message || (typeof body?.error === 'string' ? body.error : '')}`;
    if (/PERMISSION|DENIED|FORBIDDEN|UNAUTHORIZED|AUTHORIZATION|CONFIRMATION|SCHEMA|INVALID|CANCEL|ABORT|NOT_FOUND|ENOENT|EACCES|EPERM/.test(code)
        || /permission|denied|forbidden|unauthorized|confirmation|invalid|schema|cancel|abort|权限|授权|确认|取消|参数|越界/i.test(message))
        return false;
    if (code)
        return ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'EAGAIN', 'EBUSY', 'TIMEOUT', 'TOOL_TIMEOUT', 'READ_TIMEOUT', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE'].includes(code);
    return /\b(timeout|timed out|ECONNRESET|ETIMEDOUT|EAI_AGAIN|EAGAIN|EBUSY)\b|temporar(?:y|ily) unavailable|暂时不可用|读取超时|请求超时/i.test(message);
}
/** Re-reads validate freshness through the authorized adapter, not direct I/O here. */
function createNativeToolRepeatPolicy(isReadOnly) {
    const records = new Map();
    const callIds = new Set();
    const readonly = (call) => !CONTROL.has(call.name) && isReadOnly?.(call) === true;
    return {
        select(calls) {
            const fresh = [];
            const duplicateResults = [];
            let retrying = false;
            const batch = new Set();
            for (const call of calls) {
                const key = fingerprint(call);
                const prior = records.get(key);
                let reason = '';
                if (callIds.has(call.id) || batch.has(key))
                    reason = '同一调用或同批次相同参数已声明，不能重复执行。';
                else if (prior) {
                    if (!readonly(call))
                        reason = '相同工具和参数已执行；写入及未确认只读的工具保持幂等保护。';
                    else if (!prior.row)
                        reason = '前次调用尚无完成结果，请先恢复执行账本。';
                    else if (!prior.row.ok && (!transientReadFailure(prior.row) || prior.failures >= MAX_READ_ATTEMPTS)) {
                        reason = prior.failures >= MAX_READ_ATTEMPTS
                            ? `相同读取已失败 ${prior.failures} 次，达到有限重试上限；请检查失败原因。`
                            : '前次读取并非可重试的临时失败，请先修正参数、权限或其他失败原因。';
                    }
                }
                batch.add(key);
                callIds.add(call.id);
                if (reason)
                    duplicateResults.push({ callId: call.id, name: call.name, ok: false, error: 'NATIVE_QUERY_LOOP_DUPLICATE_REQUEST', reason,
                        modelOutput: { reason, failedAttempts: prior?.failures || 0, maxReadAttempts: MAX_READ_ATTEMPTS } });
                else {
                    if (prior?.row?.ok === false)
                        retrying = true;
                    if (!prior)
                        records.set(key, { failures: 0, bodies: new Set() });
                    fresh.push(call);
                }
            }
            return { fresh, duplicateResults, retrying };
        },
        record(calls, rows) {
            let progress = false;
            const byId = new Map(rows.map(row => [row.callId, row]));
            for (const call of calls) {
                const row = byId.get(call.id);
                const record = records.get(fingerprint(call));
                if (!row || !record)
                    continue;
                record.row = row;
                if (!row.ok) {
                    record.failures++;
                    continue;
                }
                record.failures = 0;
                const body = row.modelOutput !== undefined ? row.modelOutput : row.output;
                const hash = digest({ body, attachments: row.modelAttachments });
                // Unchanged references and oscillating old bodies cannot reset the
                // no-progress budget. A changed read or a successful write can.
                const unchanged = (['ccm-workspace-read-result-v3', 'ccm-workspace-json-fields-result-v1'].includes(body?.schema) && body?.type === 'file_unchanged') || body?.schema === 'ccm-tool-result-reference-v1'
                    || (body?.schema === 'ccm-workspace-read-files-result-v3' && body?.status === 'unchanged');
                if (!unchanged && !record.bodies.has(hash))
                    progress = true;
                record.bodies.add(hash);
            }
            return progress;
        },
    };
}
//# sourceMappingURL=native-tool-repeat-policy.js.map
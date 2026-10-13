"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSearchGeneration = buildSearchGeneration;
exports.buildSearchGenerationAsync = buildSearchGenerationAsync;
const crypto = __importStar(require("crypto"));
const perf_hooks_1 = require("perf_hooks");
const observability_database_1 = require("../../system/observability-database");
const conversation_search_dirty_1 = require("../../system/conversation-search-dirty");
const sha = (value) => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
function shortTerms(content) {
    const chars = Array.from(content.toLowerCase().normalize('NFKC')), terms = new Set();
    for (let index = 0; index < chars.length && terms.size < 12_000; index++) {
        if (!/\s/u.test(chars[index]))
            terms.add(chars[index]);
        if (index + 1 < chars.length && !/\s/u.test(chars[index]) && !/\s/u.test(chars[index + 1]))
            terms.add(chars[index] + chars[index + 1]);
    }
    return [...terms];
}
// Only a ready generation is queryable. Interrupted batches remain inactive;
// publishing the complete generation is one short atomic transaction.
function* buildSearchGeneration(sources) {
    const manifestChecksum = sha(sources.map(source => ({ identity: source.sourceIdentity, checksum: source.sourceChecksum, status: source.status })));
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const count = sources.reduce((sum, source) => sum + source.records.length, 0);
    const active = db.prepare('SELECT * FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1').get();
    if (active?.source_manifest_checksum === manifestChecksum && Number(active.message_count || 0) === count) {
        (0, conversation_search_dirty_1.clearConversationSearchIndexDirty)({ checkedAt: new Date().toISOString(), reason: 'unchanged' });
        return { success: true, unchanged: true, generation: active.generation, message_count: count, source_count: sources.length };
    }
    const generation = `csi_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`, now = new Date().toISOString();
    db.prepare('INSERT INTO conversation_search_generations_v3(generation,status,active,created_at,updated_at,source_manifest_checksum) VALUES(?,?,?,?,?,?)')
        .run(generation, 'building', 0, now, now, manifestChecksum);
    try {
        const message = db.prepare(`INSERT INTO conversation_search_messages_v3(
      generation,row_id,conversation_type,source,source_label,project_id,group_id,group_name,session_id,session_name,message_id,message_index,role,agent,content,content_checksum,timestamp,task_id,task_title,attachments_json,source_identity,source_checksum,indexed_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const fts = db.prepare('INSERT INTO conversation_search_fts_v3(row_id,generation,content) VALUES(?,?,?)');
        const term = db.prepare('INSERT OR IGNORE INTO conversation_search_short_terms_v3(generation,row_id,term) VALUES(?,?,?)');
        const header = db.prepare('INSERT INTO conversation_search_sources_v3(generation,source_identity,scope_type,scope_id,session_id,source_checksum,message_count,status,error_summary,indexed_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
        for (const source of sources) {
            header.run(generation, source.sourceIdentity, source.scopeType, source.scopeId, source.sessionId, source.sourceChecksum, source.records.length, source.status, source.errorSummary, now);
            yield;
            for (let offset = 0; offset < source.records.length;) {
                // Tokenization/hashing never holds the shared Task database write lock.
                const batch = source.records.slice(offset, offset + 100).map(record => ({ record, terms: shortTerms(record.content), checksum: sha(record.content) }));
                let written = 0;
                (0, observability_database_1.withImmediateObservabilityTransaction)(() => {
                    const started = perf_hooks_1.performance.now();
                    for (const { record: r, terms, checksum } of batch) {
                        message.run(generation, r.rowId, r.conversationType, r.source, r.sourceLabel, r.project, r.groupId, r.groupName, r.sessionId, r.sessionName, r.messageId, r.messageIndex, r.role, r.agent, r.content, checksum, r.timestamp, r.taskId, r.taskTitle, JSON.stringify(r.attachments), r.sourceIdentity, r.sourceChecksum, now);
                        fts.run(r.rowId, generation, r.content.normalize('NFKC').toLowerCase());
                        for (const value of terms)
                            term.run(generation, r.rowId, value);
                        written++;
                        if (perf_hooks_1.performance.now() - started >= 10)
                            break;
                    }
                });
                offset += written;
                yield;
            }
        }
        (0, observability_database_1.withImmediateObservabilityTransaction)(tx => {
            tx.prepare('UPDATE conversation_search_generations_v3 SET active=0 WHERE active=1').run();
            tx.prepare("UPDATE conversation_search_generations_v3 SET status='ready',active=1,completed_at=?,updated_at=?,source_count=?,message_count=?,degraded_source_count=? WHERE generation=?")
                .run(now, now, sources.length, count, sources.filter(source => source.status === 'degraded').length, generation);
        });
        (0, conversation_search_dirty_1.clearConversationSearchIndexDirty)({ indexedAt: now, generation });
        yield;
        // Prune obsolete/incomplete generations without another full-history lock.
        const old = db.prepare("SELECT generation FROM conversation_search_generations_v3 WHERE active=0 AND generation NOT IN (SELECT generation FROM conversation_search_generations_v3 WHERE status='ready' ORDER BY completed_at DESC LIMIT 3)").all();
        for (const row of old) {
            for (const table of ['conversation_search_messages_v3', 'conversation_search_fts_v3', 'conversation_search_short_terms_v3']) {
                const remove = db.prepare(`DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE generation=? LIMIT 100)`);
                for (;;) {
                    const changes = (0, observability_database_1.withImmediateObservabilityTransaction)(() => remove.run(row.generation).changes);
                    if (!changes)
                        break;
                    yield;
                }
            }
            (0, observability_database_1.withImmediateObservabilityTransaction)(tx => {
                tx.prepare('DELETE FROM conversation_search_sources_v3 WHERE generation=?').run(row.generation);
                tx.prepare('DELETE FROM conversation_search_generations_v3 WHERE generation=? AND active=0').run(row.generation);
            });
            yield;
        }
        return { success: true, generation, source_count: sources.length, message_count: count, degraded_source_count: sources.filter(source => source.status === 'degraded').length };
    }
    catch (error) {
        db.prepare("UPDATE conversation_search_generations_v3 SET status='failed',updated_at=?,error_summary=? WHERE generation=? AND active=0").run(new Date().toISOString(), String(error.message).slice(0, 800), generation);
        throw error;
    }
}
async function buildSearchGenerationAsync(sources) {
    const steps = buildSearchGeneration(sources);
    for (;;) {
        const result = steps.next();
        if (result.done)
            return result.value;
        await new Promise(resolve => setImmediate(resolve));
    }
}
//# sourceMappingURL=conversation-search-builder.js.map
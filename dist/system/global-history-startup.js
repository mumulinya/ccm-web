"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapGlobalHistoryInBatches = bootstrapGlobalHistoryInBatches;
const cooperative_batch_1 = require("./cooperative-batch");
const performance_monitor_1 = require("./performance-monitor");
// Complete history is retained; migration yields between durable batches so
// authentication and query handlers can run while the execution barrier waits.
async function bootstrapGlobalHistoryInBatches(load, ingest) {
    return (0, performance_monitor_1.measureAsyncPerformance)('startup.global_history_memory', async () => {
        const store = load(), results = [];
        await (0, cooperative_batch_1.forEachCooperatively)(store.sessions || [], async (session) => {
            try {
                const messages = session.messages || [];
                for (let index = 0; index < messages.length; index += 50) {
                    ingest({ sessionId: session.id, source: session.source || 'history-migration', messages: messages.slice(index, index + 50), extractMemory: false });
                    await new Promise(resolve => setImmediate(resolve));
                }
                results.push({ sessionId: session.id });
            }
            catch (error) {
                results.push({ sessionId: session.id, error: error.message || String(error) });
            }
        });
        return { total: results.length, migrated: results.filter(item => !item.error).length, results };
    });
}
//# sourceMappingURL=global-history-startup.js.map
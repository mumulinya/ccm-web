"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forEachCooperatively = forEachCooperatively;
const perf_hooks_1 = require("perf_hooks");
async function forEachCooperatively(items, callback) {
    let count = 0, start = perf_hooks_1.performance.now();
    for (const item of items) {
        await callback(item);
        if (++count >= 100 || perf_hooks_1.performance.now() - start >= 10) {
            await new Promise(resolve => setImmediate(resolve));
            count = 0;
            start = perf_hooks_1.performance.now();
        }
    }
}
//# sourceMappingURL=cooperative-batch.js.map
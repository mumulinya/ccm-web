"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boundedSseSnapshot = boundedSseSnapshot;
exports.createBoundedSseWriter = createBoundedSseWriter;
const performance_monitor_1 = require("./performance-monitor");
let active = 0;
function boundedSseSnapshot() { return { activeConnections: active, maxPendingBytes: 256 * 1024 }; }
function createBoundedSseWriter(res) {
    let closed = false;
    const callbacks = new Set();
    active++;
    const close = () => {
        if (closed)
            return;
        closed = true;
        active--;
        for (const callback of callbacks)
            callback();
        callbacks.clear();
    };
    res.once('close', close);
    return {
        onClose(callback) { if (closed)
            callback();
        else
            callbacks.add(callback); },
        write(frame) {
            if (closed || res.destroyed || res.writableEnded) {
                close();
                return false;
            }
            if (Number(res.writableLength || 0) > 256 * 1024) {
                (0, performance_monitor_1.recordPerformance)('sse.backpressure_disconnect', 0);
                close();
                res.destroy();
                return false;
            }
            try {
                res.write(frame);
                return true;
            }
            catch {
                close();
                res.destroy();
                return false;
            }
        },
        end() { close(); if (!res.destroyed && !res.writableEnded)
            res.end(); },
    };
}
//# sourceMappingURL=bounded-sse.js.map
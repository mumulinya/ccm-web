"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSseHeartbeat = startSseHeartbeat;
/**
 * Keeps a live response open without adding synthetic conversation events.
 * Protocol comments are ignored by EventSource and never enter the ledger.
 */
function startSseHeartbeat(res, intervalMs = 15_000) {
    const timer = setInterval(() => {
        if (res.destroyed || res.writableEnded)
            return;
        try {
            res.write(`: ccm-heartbeat ${Date.now()}\n\n`);
            res.flush?.();
        }
        catch { }
    }, Math.max(1_000, Number(intervalMs || 15_000)));
    timer.unref?.();
    let stopped = false;
    const stop = () => {
        if (stopped)
            return;
        stopped = true;
        clearInterval(timer);
    };
    res.once("close", stop);
    res.once("finish", stop);
    return stop;
}
//# sourceMappingURL=sse-heartbeat.js.map
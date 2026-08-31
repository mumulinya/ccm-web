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
const v8 = __importStar(require("v8"));
const code_intelligence_1 = require("./code-intelligence");
function send(message) {
    if (process.connected)
        process.send?.(message);
}
function telemetry() {
    const usage = process.memoryUsage();
    return {
        rssMb: Math.round(usage.rss / 1024 / 1024),
        heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
    };
}
function watchBackgroundRun(runId) {
    send({ type: "background", state: "started", runId });
    const timer = setInterval(() => {
        const run = (0, code_intelligence_1.getCodeIntelligenceIndexRun)(runId);
        if (!run || !["completed", "failed"].includes(String(run.state)))
            return;
        clearInterval(timer);
        send({ type: "background", state: "finished", runId });
    }, 500);
    timer.unref();
}
async function execute(message) {
    const args = Array.isArray(message.args) ? message.args : [];
    if (message.method === "execute_tool") {
        return (0, code_intelligence_1.executeCodeIntelligenceToolLocal)(String(args[0] || ""), args[1], args[2] || {});
    }
    if (message.method === "start_index_run") {
        const run = (0, code_intelligence_1.startCodeIntelligenceIndexRun)(String(args[0] || ""), args[1], String(args[2] || ""));
        watchBackgroundRun(String(run.runId || ""));
        return run;
    }
    if (message.method === "self_test") {
        return {
            ...(0, code_intelligence_1.runTypeScriptLanguageServiceFixtureSelfTest)(),
            workerPid: process.pid,
            heapLimitMb: Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024),
            contentStored: false,
        };
    }
    throw new Error("不支持的代码智能Worker操作");
}
process.on("message", (message) => {
    if (message?.type === "shutdown") {
        process.disconnect?.();
        process.exit(0);
        return;
    }
    if (message?.type !== "request" || !message.id)
        return;
    execute(message).then(result => send({ type: "response", id: message.id, ok: true, result, telemetry: telemetry() }), error => send({ type: "response", id: message.id, ok: false, error: String(error?.message || error), telemetry: telemetry() }));
});
process.on("disconnect", () => process.exit(0));
send({
    type: "ready",
    pid: process.pid,
    heapLimitMb: Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024),
});
//# sourceMappingURL=code-intelligence-worker.js.map
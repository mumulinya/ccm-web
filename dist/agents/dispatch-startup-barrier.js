"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchStartupStatus = dispatchStartupStatus;
exports.prepareDispatchStartup = prepareDispatchStartup;
exports.assertDispatchStartupReady = assertDispatchStartupReady;
exports.afterDispatchStartup = afterDispatchStartup;
exports.stopDispatchStartup = stopDispatchStartup;
exports.failDispatchStartup = failDispatchStartup;
exports.runDispatchStartup = runDispatchStartup;
let generation = 0;
let status = { state: "idle", generation, stage: "", failedStage: "", startedAt: "", finishedAt: "" };
let resolveReady;
let rejectReady;
let ready = Promise.resolve();
let recovery = null;
function dispatchStartupStatus() { return { ...status }; }
function prepareDispatchStartup() {
    if (["pending", "recovering"].includes(status.state))
        return generation;
    generation++;
    status = { state: "pending", generation, stage: "", failedStage: "", startedAt: new Date().toISOString(), finishedAt: "" };
    recovery = null;
    ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    // Diagnostics can be queried even when there were no awaiting consumers.
    void ready.catch(() => { });
    return generation;
}
function assertDispatchStartupReady() {
    if (["idle", "ready"].includes(status.state))
        return;
    throw Object.assign(new Error(status.state === "failed" ? "执行启动恢复失败，请先查看恢复诊断" : "执行启动恢复尚未完成"), {
        code: status.state === "failed" ? "CCM_EXECUTION_RECOVERY_FAILED" : "CCM_EXECUTION_RECOVERY_PENDING", status: 503,
    });
}
async function afterDispatchStartup(callback) {
    const expected = generation;
    await ready;
    if (generation !== expected || !["idle", "ready"].includes(status.state))
        throw new Error("执行恢复实例已停止或替换");
    return callback();
}
function stopDispatchStartup() {
    const wasPending = ["pending", "recovering"].includes(status.state);
    status = { ...status, state: "stopped", finishedAt: new Date().toISOString() };
    if (wasPending)
        rejectReady(new Error("服务已停止，取消待启动执行消费者"));
}
function failDispatchStartup(error, stage = "bootstrap") {
    if (status.state === "stopped")
        return;
    status = { ...status, state: "failed", failedStage: status.stage || stage, finishedAt: new Date().toISOString() };
    rejectReady?.(error);
}
function runDispatchStartup(stages) {
    if (recovery)
        return recovery;
    if (status.state !== "pending")
        prepareDispatchStartup();
    const expected = generation;
    recovery = (async () => {
        try {
            status.state = "recovering";
            for (const stage of stages) {
                if (generation !== expected || dispatchStartupStatus().state === "stopped")
                    throw new Error("服务恢复已停止");
                status.stage = stage.name;
                await require('../system/performance-monitor').measureAsyncPerformance(`startup.${stage.name}`, stage.run);
                await new Promise(resolve => setImmediate(resolve));
            }
            if (generation !== expected || dispatchStartupStatus().state === "stopped")
                throw new Error("服务恢复已停止");
            status = { ...status, state: "ready", stage: "", finishedAt: new Date().toISOString() };
            resolveReady();
        }
        catch (error) {
            if (generation === expected && status.state !== "stopped")
                status = { ...status, state: "failed", failedStage: status.stage, finishedAt: new Date().toISOString() };
            rejectReady(error);
            throw error;
        }
    })();
    return recovery;
}
//# sourceMappingURL=dispatch-startup-barrier.js.map
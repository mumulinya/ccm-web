"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareLocalKnowledgeModelAtStartup = prepareLocalKnowledgeModelAtStartup;
exports.scheduleLocalKnowledgeModelStartupPreparation = scheduleLocalKnowledgeModelStartupPreparation;
exports.resetLocalKnowledgeModelStartupForTest = resetLocalKnowledgeModelStartupForTest;
const runtime_events_1 = require("../../system/runtime-events");
const knowledge_files_1 = require("./knowledge-files");
const knowledge_embedding_1 = require("./knowledge-embedding");
const knowledge_index_1 = require("./knowledge-index");
let startupTimer = null;
let startupPromise = null;
function startupEnabled() {
    if (/^(1|true|yes|on)$/i.test(String(process.env.CCM_DISABLE_LOCAL_EMBEDDING_STARTUP_PREPARE || "")))
        return false;
    return /^(1|true|yes|on)$/i.test(String(process.env.CCM_STARTUP_PREPARE_LOCAL_EMBEDDING || ""));
}
async function prepareLocalKnowledgeModelAtStartup(options = {}) {
    if (startupPromise)
        return startupPromise;
    startupPromise = (async () => {
        const enabled = options.enabled ?? startupEnabled();
        if (!enabled)
            return { accepted: false, reason: "startup_prepare_disabled", localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)() };
        const config = (0, knowledge_files_1.loadRagEmbeddingConfig)();
        if ((0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)(config) !== "local") {
            return { accepted: false, reason: `embedding_mode_${config.mode}`, localModel: (0, knowledge_embedding_1.getLocalKnowledgeModelStatus)() };
        }
        (0, runtime_events_1.publishRuntimeEvent)("system", "knowledge.local_model.startup_prepare", { status: "downloading", source: "ccm_start" });
        const localModel = await (0, knowledge_embedding_1.prepareLocalKnowledgeModel)();
        if (localModel.state !== "ready") {
            (0, runtime_events_1.publishRuntimeEvent)("system", "knowledge.local_model.startup_failed", { status: "failed", reason: localModel.error, source: "ccm_start" });
            return { accepted: true, ready: false, reason: localModel.error || "local_model_prepare_failed", localModel };
        }
        let indexStatus = null;
        if (options.rebuild !== false)
            indexStatus = await (0, knowledge_index_1.rebuildKnowledgeIndex)("ccm-start-local-model-ready");
        (0, runtime_events_1.publishRuntimeEvent)("system", "knowledge.local_model.startup_ready", { status: "ready", source: "ccm_start" });
        return { accepted: true, ready: true, reason: "local_model_ready", localModel, indexStatus };
    })().finally(() => { startupPromise = null; });
    return startupPromise;
}
function scheduleLocalKnowledgeModelStartupPreparation(delayMs = 1_500) {
    if (!startupEnabled())
        return { scheduled: false, reason: "startup_prepare_disabled" };
    if ((0, knowledge_embedding_1.preferredKnowledgeEmbeddingBackend)((0, knowledge_files_1.loadRagEmbeddingConfig)()) !== "local") {
        return { scheduled: false, reason: "local_embedding_not_selected" };
    }
    if (startupTimer || startupPromise)
        return { scheduled: false, reason: "startup_prepare_already_running" };
    startupTimer = setTimeout(() => {
        startupTimer = null;
        void prepareLocalKnowledgeModelAtStartup().then(result => {
            if (result.ready)
                console.log("[知识库] 本地语义模型已在启动后台完成校验，语义索引已就绪");
            else if (result.accepted)
                console.warn(`[知识库] 本地语义模型启动准备失败，当前继续使用词面检索：${result.reason}`);
        }).catch(error => console.warn(`[知识库] 本地语义模型启动准备失败，当前继续使用词面检索：${error?.message || error}`));
    }, Math.max(0, Number(delayMs) || 0));
    startupTimer.unref?.();
    return { scheduled: true, reason: "ccm_start_background_prepare" };
}
function resetLocalKnowledgeModelStartupForTest() {
    if (startupTimer)
        clearTimeout(startupTimer);
    startupTimer = null;
    startupPromise = null;
}
//# sourceMappingURL=knowledge-model-startup.js.map
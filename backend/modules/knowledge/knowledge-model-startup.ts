import { publishRuntimeEvent } from "../../system/runtime-events";
import { loadRagEmbeddingConfig } from "./knowledge-files";
import {
  getLocalKnowledgeModelStatus,
  preferredKnowledgeEmbeddingBackend,
  prepareLocalKnowledgeModel,
} from "./knowledge-embedding";
import { rebuildKnowledgeIndex } from "./knowledge-index";

let startupTimer: NodeJS.Timeout | null = null;
let startupPromise: Promise<any> | null = null;

function startupEnabled() {
  if (/^(1|true|yes|on)$/i.test(String(process.env.CCM_DISABLE_LOCAL_EMBEDDING_STARTUP_PREPARE || ""))) return false;
  return /^(1|true|yes|on)$/i.test(String(process.env.CCM_STARTUP_PREPARE_LOCAL_EMBEDDING || ""));
}

export async function prepareLocalKnowledgeModelAtStartup(options: { enabled?: boolean; rebuild?: boolean } = {}) {
  if (startupPromise) return startupPromise;
  startupPromise = (async () => {
    const enabled = options.enabled ?? startupEnabled();
    if (!enabled) return { accepted: false, reason: "startup_prepare_disabled", localModel: getLocalKnowledgeModelStatus() };
    const config = loadRagEmbeddingConfig();
    if (preferredKnowledgeEmbeddingBackend(config) !== "local") {
      return { accepted: false, reason: `embedding_mode_${config.mode}`, localModel: getLocalKnowledgeModelStatus() };
    }
    publishRuntimeEvent("system", "knowledge.local_model.startup_prepare", { status: "downloading", source: "ccm_start" });
    const localModel = await prepareLocalKnowledgeModel();
    if (localModel.state !== "ready") {
      publishRuntimeEvent("system", "knowledge.local_model.startup_failed", { status: "failed", reason: localModel.error, source: "ccm_start" });
      return { accepted: true, ready: false, reason: localModel.error || "local_model_prepare_failed", localModel };
    }
    let indexStatus: any = null;
    if (options.rebuild !== false) indexStatus = await rebuildKnowledgeIndex("ccm-start-local-model-ready");
    publishRuntimeEvent("system", "knowledge.local_model.startup_ready", { status: "ready", source: "ccm_start" });
    return { accepted: true, ready: true, reason: "local_model_ready", localModel, indexStatus };
  })().finally(() => { startupPromise = null; });
  return startupPromise;
}

export function scheduleLocalKnowledgeModelStartupPreparation(delayMs = 1_500) {
  if (!startupEnabled()) return { scheduled: false, reason: "startup_prepare_disabled" };
  if (preferredKnowledgeEmbeddingBackend(loadRagEmbeddingConfig()) !== "local") {
    return { scheduled: false, reason: "local_embedding_not_selected" };
  }
  if (startupTimer || startupPromise) return { scheduled: false, reason: "startup_prepare_already_running" };
  startupTimer = setTimeout(() => {
    startupTimer = null;
    void prepareLocalKnowledgeModelAtStartup().then(result => {
      if (result.ready) console.log("[知识库] 本地语义模型已在启动后台完成校验，语义索引已就绪");
      else if (result.accepted) console.warn(`[知识库] 本地语义模型启动准备失败，当前继续使用词面检索：${result.reason}`);
    }).catch(error => console.warn(`[知识库] 本地语义模型启动准备失败，当前继续使用词面检索：${error?.message || error}`));
  }, Math.max(0, Number(delayMs) || 0));
  startupTimer.unref?.();
  return { scheduled: true, reason: "ccm_start_background_prepare" };
}

export function resetLocalKnowledgeModelStartupForTest() {
  if (startupTimer) clearTimeout(startupTimer);
  startupTimer = null;
  startupPromise = null;
}

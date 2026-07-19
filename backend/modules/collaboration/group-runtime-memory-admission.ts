function textOf(value: any, keys: string[]) {
  for (const key of keys) {
    const text = String(value?.[key] || "").trim();
    if (text) return text;
  }
  return typeof value === "string" ? value.trim() : "";
}

const TRANSIENT_COORDINATION = /Agent intent gateway|普通对话|只读项目分析|^s*answers*[：:]|不创建任务卡|直接回复用户|已按普通对话回复|用户把消息交给我协调|等待用户继续补充/i;
const DURABLE_FACT_SIGNAL = /必须|不得|不能|不要|需要|要求|约束|验收|保持|使用|采用|记住|以后|始终|文件|路径|项目|接口|模型|上下文|数据库|部署|must|never|required?|constraint|acceptance|file|path|project|database|deploy/i;

export function isModelVisibleGroupDecision(value: any) {
  const text = textOf(value, ["decision", "text", "value"]);
  return text.length >= 8 && !TRANSIENT_COORDINATION.test(text);
}

export function isModelVisibleGroupNextAction(value: any) {
  const text = textOf(value, ["action", "text", "value"]);
  return text.length >= 6 && !TRANSIENT_COORDINATION.test(text);
}

export function isModelVisibleGroupFactAnchor(value: any) {
  if (value?.memoryAdmission?.admitted === true || value?.memory_admission?.admitted === true || value?.persistent === true) return true;
  const text = textOf(value, ["text", "value", "fact"]);
  return text.length >= 8 && DURABLE_FACT_SIGNAL.test(text) && !TRANSIENT_COORDINATION.test(text);
}

export function modelVisibleGroupRuntimeState(memory: any) {
  return {
    decisions: (Array.isArray(memory?.decisions) ? memory.decisions : []).filter(isModelVisibleGroupDecision),
    nextActions: (Array.isArray(memory?.nextActions) ? memory.nextActions : []).filter(isModelVisibleGroupNextAction),
    factAnchors: (Array.isArray(memory?.factAnchors) ? memory.factAnchors : []).filter(isModelVisibleGroupFactAnchor),
  };
}

export function isCanonicalGroupSessionMemory(value: any) {
  return value?.modelExtracted === true
    && value?.hasSummary === true
    && value?.markdownExists === true
    && value?.markdownChecksumMatches === true;
}

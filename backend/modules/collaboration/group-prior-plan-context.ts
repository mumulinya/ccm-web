const SKIP_PRIOR_PLAN = /模型这次没有给出可用回复|只读检查已完成，但没能生成计划/;

function asMessages(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function parseVisibleMessages(context: string) {
  const text = String(context || "");
  const heading = text.search(/【[^】]*完整会话原文[^】]*】/);
  const from = heading >= 0 ? text.indexOf("[", heading) : text.indexOf("[{");
  if (from < 0) return [];
  try {
    const parsed = JSON.parse(text.slice(from));
    return asMessages(parsed);
  } catch {
    return [];
  }
}

function planFromMessage(item: any) {
  const plan = item?.presentedPlan || item?.presented_plan;
  if (plan && typeof plan === "object" && Array.isArray(plan.steps) && plan.steps.length) return plan;
  return null;
}

export function extractPriorGroupPlanDraft(context: any) {
  const messages = parseVisibleMessages(String(context || ""));
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index];
    if (String(item?.role || "") !== "assistant") continue;
    const content = String(item?.content || item?.text || "").trim();
    const plan = planFromMessage(item);
    if (plan) {
      return JSON.stringify({
        title: plan.title || "已有计划稿",
        goal: plan.goal || "",
        steps: plan.steps,
        summary: content.slice(0, 1500),
      });
    }
    if (content && !SKIP_PRIOR_PLAN.test(content)) return content.slice(0, 4000);
  }
  return "";
}

export function formatPriorGroupPlanBlock(draft: any) {
  const text = String(draft || "").trim();
  if (!text) return "";
  return `已有计划稿（上一轮主 Agent 输出，请在此基础上展开或修订，不要重新扫仓库）：\n${text}`;
}

export function runGroupPriorPlanContextSelfTest() {
  const context = [
    "【当前精确群聊会话连续性】",
    "【压缩前完整会话原文 · 2/2 条】",
    JSON.stringify([
      { id: "u1", role: "user", content: "给我做个实现计划" },
      { id: "a1", role: "assistant", content: "建议按 P0 后端校验，再接 P1 AI/SSE。" },
    ]),
  ].join("\n");
  const planContext = [
    "【压缩前完整会话原文 · 1/1 条】",
    JSON.stringify([
      { id: "a2", role: "assistant", content: "卡片", presentedPlan: { title: "实施计划", goal: "预约排队", steps: [{ title: "P0 后端" }] } },
    ]),
  ].join("\n");
  const draft = extractPriorGroupPlanDraft(context);
  const withPlan = extractPriorGroupPlanDraft(planContext);
  const checks = {
    extractsLastAssistant: draft.includes("P0 后端校验") === true,
    formatsBlock: formatPriorGroupPlanBlock(draft).includes("不要重新扫仓库") === true,
    emptyContext: extractPriorGroupPlanDraft("") === "",
    skipsEmptyFallback: extractPriorGroupPlanDraft([
      "【压缩前完整会话原文 · 1/1 条】",
      JSON.stringify([{ role: "assistant", content: "模型这次没有给出可用回复，本次请求未完成。" }]),
    ].join("\n")) === "",
    prefersPresentedPlan: String(withPlan).includes("P0 后端") === true,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

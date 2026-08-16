import * as crypto from "crypto";

export type PrePlanQuestionType = "single" | "multiple" | "text";
export const PRE_PLAN_OTHER_OPTION_ID = "other";
export const PRE_PLAN_OTHER_OPTION_LABEL = "其他";

function isOtherOption(option: any) {
  const id = clean(option?.id, 80).toLowerCase();
  const label = clean(option?.label, 80);
  return id === PRE_PLAN_OTHER_OPTION_ID || /^(其他|other)$/i.test(label);
}

export function ensureOtherOption(options: any[] = []) {
  const rest = (Array.isArray(options) ? options : []).filter(option => option && !isOtherOption(option));
  return [
    ...rest,
    {
      id: PRE_PLAN_OTHER_OPTION_ID,
      label: PRE_PLAN_OTHER_OPTION_LABEL,
      description: "以上都不合适时，用自己的话说明",
    },
  ];
}

function clean(value: any, max = 240) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/(?:prompt|trace[_-]?id|native[_-]?session|raw[_-]?(?:stdout|output)|api[_-]?key)\s*[:=][^\n]*/gi, "")
    .replace(/\s+/g, " ").trim().slice(0, max);
}

function stableId(prefix: string, value: string, index: number) {
  const digest = crypto.createHash("sha256").update(`${prefix}:${value}:${index}`).digest("hex").slice(0, 10);
  return `${prefix}_${digest}`;
}

export function normalizePrePlanQuestions(value: any, fallback: any[] = []) {
  const source = Array.isArray(value) && value.length ? value : Array.isArray(fallback) ? fallback : [];
  const seen = new Set<string>();
  const questions: any[] = [];
  for (const [index, raw] of source.entries()) {
    const object = raw && typeof raw === "object" ? raw : { label: raw, question: raw, type: "text" };
    const label = clean(object.label || object.question || object.title, 160);
    if (!label) continue;
    const signature = label.toLocaleLowerCase().replace(/[\s?？。！!，,：:]/g, "");
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    const rawType = clean(object.type || object.kind, 24).toLowerCase();
    let type: PrePlanQuestionType = rawType === "single" || rawType === "multiple" ? rawType : "text";
    let options = (Array.isArray(object.options) ? object.options : []).slice(0, 4).map((item: any, optionIndex: number) => {
      const option = item && typeof item === "object" ? item : { label: item };
      const optionLabel = clean(option.label || option.title || option.value, 100);
      if (!optionLabel) return null;
      return {
        id: clean(option.id, 80) || stableId("option", optionLabel, optionIndex),
        label: optionLabel,
        description: clean(option.description || option.reason, 160),
        recommended: option.recommended === true,
        safeDefault: option.safeDefault === true || option.safe_default === true,
      };
    }).filter(Boolean);
    if (type === "single" || type === "multiple") {
      const withOther = ensureOtherOption(options);
      if (withOther.length < 2) type = "text";
      else options = withOther;
    }
    questions.push({
      id: clean(object.id, 80) || stableId("question", label, index),
      label,
      reason: clean(object.reason || object.description, 180) || "该选择会影响业务流程、实施范围或验收结果。",
      type,
      required: object.required !== false,
      ...(type === "text" ? {} : { options }),
    });
    if (questions.length >= 3) break;
  }
  return questions;
}

export function buildPrePlanClarification(input: any) {
  const questions = normalizePrePlanQuestions(input.questions, input.fallbackQuestions);
  const safeDefaultsAvailable = questions.length > 0 && questions.every(question => (
    question.type === "text" ? question.required === false : question.options?.some((option: any) => option.safeDefault)
  ));
  const scope = ["project", "group"].includes(String(input.scope)) ? input.scope : "global";
  const scopeId = clean(input.scopeId || (scope === "global" ? "global" : ""), 180);
  const exactSessionId = clean(input.exactSessionId, 180);
  const anchorMessageId = clean(input.anchorMessageId, 180);
  const id = clean(input.id, 180) || `preplan:${scope}:${scopeId}:${anchorMessageId || exactSessionId}`;
  const generation = Math.max(0, Number(input.generation || 0));
  const revision = Math.max(1, Number(input.revision || 1));
  const round = Math.max(1, Math.min(2, Number(input.round || 1)));
  return {
    schema: "ccm-pre-plan-clarification-v1",
    id, scope, scopeId, exactSessionId, anchorMessageId,
    status: ["resolved", "cancelled"].includes(String(input.status)) ? input.status : "pending",
    revision, generation, round,
    title: clean(input.title, 120) || (String(input.purpose || "").toLowerCase() === "mid_turn" ? `需要确认 ${questions.length} 项` : `制定计划前，需要确认 ${questions.length} 项`),
    headline: clean(input.headline, 220) || (String(input.purpose || "").toLowerCase() === "mid_turn" ? "请先选择一项，我会按你的答案继续。" : "这些选择会影响业务流程和验收范围。"),
    purpose: String(input.purpose || "").toLowerCase() === "mid_turn" ? "mid_turn" : "pre_plan",
    questions,
    allowAdditionalNote: input.allowAdditionalNote !== false,
    safeDefaultsAvailable,
    originalRequestChecksum: clean(input.originalRequestChecksum, 128),
    contentStored: false,
  };
}

export function formatPrePlanAnswers(clarification: any, answers: any = {}, additionalNote = "") {
  const lines: string[] = [];
  for (const question of clarification?.questions || []) {
    const raw = answers?.[question.id];
    const selected = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
    const labels = selected.map((value: any) => {
      const option = question.options?.find((item: any) => item.id === value);
      if (option && isOtherOption(option)) {
        const note = clean(answers?.[`${question.id}__note`] || answers?.[`${question.id}__other`] || additionalNote, 400);
        return note && note !== clean(additionalNote, 400) ? `${PRE_PLAN_OTHER_OPTION_LABEL}：${note}` : PRE_PLAN_OTHER_OPTION_LABEL;
      }
      return clean(option?.label || value, 160);
    }).filter(Boolean);
    if (labels.length) lines.push(`${question.label}：${labels.join("、")}`);
  }
  const note = clean(additionalNote, 600);
  if (note) lines.push(`补充说明：${note}`);
  return lines.join("\n");
}

export function buildConversationClarificationSummary(input: {
  schema?: string;
  question?: string;
  reason?: string;
  headline?: string;
  suggestions?: string[];
  nextAction?: string;
  prePlanClarification: any;
}) {
  const projection = input.prePlanClarification;
  const firstQuestion = Array.isArray(projection?.questions) ? projection.questions[0] : null;
  const question = clean(input.question || firstQuestion?.label || projection?.headline, 260)
    || "请补充会影响实施方案或验收结果的业务信息。";
  return {
    schema: input.schema || "ccm-conversation-clarification-summary-v1",
    title: projection?.title || "需要你补充信息",
    status: "waiting_user",
    status_label: "等待你回复",
    headline: clean(input.headline || projection?.headline, 220) || "请先选择一项，我会按你的答案继续。",
    question,
    reason: clean(input.reason, 220),
    answer_suggestions: Array.isArray(input.suggestions) ? input.suggestions.filter(Boolean).slice(0, 3) : [],
    next_action: clean(input.nextAction, 220) || "你回复后我会继续。",
    pre_plan_clarification: projection,
    prePlanClarification: projection,
  };
}

export function formatPrePlanClarificationText(clarification: any) {
  const questions = Array.isArray(clarification?.questions) ? clarification.questions : [];
  if (!questions.length) return "请补充会影响实施方案或验收结果的业务信息。";
  return [
    clarification.title || `制定计划前，需要确认 ${questions.length} 项`,
    ...questions.map((question: any, index: number) => {
      const options = Array.isArray(question.options) && question.options.length
        ? `\n${question.options.map((option: any, optionIndex: number) => `   ${optionIndex + 1}. ${clean(option.label, 100)}${option.recommended ? "（推荐）" : ""}`).join("\n")}`
        : "";
      return `${index + 1}. ${clean(question.label, 160)}${options}`;
    }),
    "请按“问题序号：选项序号/补充文字”回复。回答后我会先生成详细计划，等待你确认后再执行。",
  ].join("\n");
}

export function runPrePlanClarificationSelfTest() {
  const projection = buildPrePlanClarification({
    scope: "project", scopeId: "demo", exactSessionId: "session-1", anchorMessageId: "message-1",
    questions: [
      { label: "审核方式", type: "single", options: [{ label: "人工审核", recommended: true, safeDefault: true }, { label: "自动退款" }] },
      { label: "实施范围", type: "multiple", options: ["后端接口", "管理端页面"] },
      "请补充验收要求",
      "请补充验收要求",
    ],
  });
  return {
    pass: projection.questions.length === 3 && projection.safeDefaultsAvailable === false && projection.contentStored === false && projection.questions[0]?.options?.some((option: any) => option.id === PRE_PLAN_OTHER_OPTION_ID),
    checks: { cappedAndDeduped: projection.questions.length === 3, structuredOptions: projection.questions[0]?.options?.length === 3, otherOption: projection.questions[0]?.options?.at(-1)?.id === PRE_PLAN_OTHER_OPTION_ID, safeProjection: projection.contentStored === false },
  };
}

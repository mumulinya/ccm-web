export type CcDurableMemoryType = "user" | "feedback" | "project" | "reference";

const TYPE_MAP: Record<string, CcDurableMemoryType> = {
  user: "user",
  preference: "user",
  feedback: "feedback",
  authorization: "feedback",
  constraint: "feedback",
  lesson: "feedback",
  project: "project",
  decision: "project",
  decisions: "project",
  fact: "project",
  risk: "project",
  open_item: "project",
  contract: "project",
  mission: "project",
  missions: "project",
  unresolved: "project",
  reference: "reference",
  references: "reference",
};

export function ccDurableMemoryType(value: any, fallback: CcDurableMemoryType = "project"): CcDurableMemoryType {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return TYPE_MAP[normalized] || fallback;
}

export function isCcDurableMemoryCandidate(input: {
  content?: any;
  accepted?: boolean;
  sourceKind?: any;
  transient?: boolean;
  derivableFromCode?: boolean;
  skillOrToolDefinition?: boolean;
}) {
  const content = String(input.content || "").trim();
  if (!content || input.accepted !== true) return false;
  if (input.transient === true || input.derivableFromCode === true || input.skillOrToolDefinition === true) return false;
  if (/^(?:已)?(?:完成|成功|通过|失败|阻塞|处理中|运行中)(?:本次)?(?:任务|测试|构建|工作)?[。.!！]?$/i.test(content)) return false;
  const sourceKind = String(input.sourceKind || "").toLowerCase();
  if (/(?:raw_tool_result|process_output|temporary_status|skill_definition|mcp_definition)/.test(sourceKind)) return false;
  return true;
}

export function ccDurableMemoryTaxonomyReceipt(type: any, input: any = {}) {
  return {
    schema: "ccm-cc-durable-memory-taxonomy-v1",
    type: ccDurableMemoryType(type),
    admitted: isCcDurableMemoryCandidate(input),
    excludesTransientProcessState: true,
    excludesDerivableCodeFacts: true,
    excludesSkillAndToolDefinitions: true,
  };
}

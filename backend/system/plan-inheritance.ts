import * as crypto from "crypto";

export const PLAN_INHERITANCE_SCHEMA = "ccm-plan-inheritance-v1" as const;

function text(value: any, max = 500) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max); }
function list(value: any) { return [...new Set((Array.isArray(value) ? value : []).map(item => text(item, 400)).filter(Boolean))]; }
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }

export type PlanInheritanceRow = {
  oldWorkItemId: string;
  newWorkItemId: string;
  inheritance: "completed" | "partially_valid" | "invalidated" | "replaced";
  inheritedCriterionIds: string[];
  invalidatedEvidenceIds: string[];
  reason: string;
};

export function buildPlanInheritance(previousPlan: any, nextPlan: any, evidenceByWorkItem: Record<string, any[]> = {}): PlanInheritanceRow[] {
  const previous = Array.isArray(previousPlan?.workItems) ? previousPlan.workItems : Array.isArray(previousPlan) ? previousPlan : [];
  const next = Array.isArray(nextPlan?.workItems) ? nextPlan.workItems : Array.isArray(nextPlan) ? nextPlan : [];
  const rows: PlanInheritanceRow[] = [];
  for (const oldItem of previous) {
    const oldId = text(oldItem?.id, 160);
    if (!oldId) continue;
    const oldCriteria = list(oldItem?.acceptanceCriteria || oldItem?.acceptance_criteria);
    const candidates = next.filter((item: any) => {
      const title = `${item?.title || ""} ${item?.objective || ""}`.toLowerCase();
      const oldText = `${oldItem?.title || ""} ${oldItem?.objective || ""}`.toLowerCase();
      const criteriaOverlap = oldCriteria.some(criteria => title.includes(criteria.toLowerCase()) || oldText.includes(criteria.toLowerCase()));
      return text(item?.id, 160) === oldId || criteriaOverlap || (oldItem?.target && item?.target && String(oldItem.target) === String(item.target));
    });
    if (!candidates.length) {
      rows.push({ oldWorkItemId: oldId, newWorkItemId: "", inheritance: "invalidated", inheritedCriterionIds: [], invalidatedEvidenceIds: (evidenceByWorkItem[oldId] || []).map(item => text(item?.evidenceId || item, 160)).filter(Boolean), reason: "新计划中不存在可安全映射的工作项" });
      continue;
    }
    const nextItem = candidates[0];
    const newId = text(nextItem?.id, 160);
    const nextCriteria = list(nextItem?.acceptanceCriteria || nextItem?.acceptance_criteria);
    const inherited = oldCriteria.filter(criteria => nextCriteria.includes(criteria) || nextCriteria.some(item => item.toLowerCase() === criteria.toLowerCase()));
    const oldCompleted = ["completed", "done", "accepted"].includes(String(oldItem?.status || "").toLowerCase());
    const evidence = evidenceByWorkItem[oldId] || [];
    const invalidatedEvidenceIds = evidence.filter(item => item?.status === "stale" || item?.status === "invalid").map(item => text(item?.evidenceId || item, 160)).filter(Boolean);
    const inheritance = oldCompleted && invalidatedEvidenceIds.length === 0 && inherited.length >= oldCriteria.length
      ? "completed"
      : inherited.length > 0 ? "partially_valid" : "replaced";
    rows.push({ oldWorkItemId: oldId, newWorkItemId: newId, inheritance, inheritedCriterionIds: inherited, invalidatedEvidenceIds, reason: inheritance === "completed" ? "原工作项已完成且证据仍有效" : inheritance === "partially_valid" ? "保留已满足验收条件，仅重开剩余差异" : "新计划已替换原工作项" });
  }
  return rows;
}

export function planInheritanceChecksum(rows: PlanInheritanceRow[]) { return hash({ schema: PLAN_INHERITANCE_SCHEMA, rows }); }

export function runPlanInheritanceSelfTest() {
  const rows = buildPlanInheritance({ workItems: [{ id: "w1", title: "接口", status: "completed", acceptanceCriteria: ["接口可用"] }] }, { workItems: [{ id: "w1", title: "接口", acceptanceCriteria: ["接口可用"] }] });
  return { pass: rows[0]?.inheritance === "completed" && !!planInheritanceChecksum(rows), rows };
}

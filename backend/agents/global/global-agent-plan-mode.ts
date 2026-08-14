import type { GlobalAgentToolRisk } from "./loop";

type ToolDecision = { name?: string; arguments?: any } | null | undefined;
type ToolSpec = { name: string; risk: GlobalAgentToolRisk | ((args: any) => GlobalAgentToolRisk) };

export function globalPlanModeWouldCauseSideEffect(input: {
  tool?: ToolDecision;
  workflowActionRequired?: boolean;
  toolSpecs: ToolSpec[];
}) {
  if (!input.tool) return input.workflowActionRequired === true;
  const spec = input.toolSpecs.find(item => item.name === String(input.tool?.name || ""));
  if (!spec) return true;
  const risk = typeof spec.risk === "function" ? spec.risk(input.tool.arguments || {}) : spec.risk;
  return risk !== "read";
}

export function runGlobalAgentPlanModeSelfTest() {
  const toolSpecs: ToolSpec[] = [
    { name: "inspect_system", risk: "read" },
    { name: "send_project_cmd", risk: "write" },
  ];
  const checks = {
    readToolAllowed: globalPlanModeWouldCauseSideEffect({ tool: { name: "inspect_system" }, workflowActionRequired: true, toolSpecs }) === false,
    writeToolBlocked: globalPlanModeWouldCauseSideEffect({ tool: { name: "send_project_cmd" }, toolSpecs }) === true,
    unknownToolClosed: globalPlanModeWouldCauseSideEffect({ tool: { name: "unknown" }, toolSpecs }) === true,
    directActionBlocked: globalPlanModeWouldCauseSideEffect({ workflowActionRequired: true, toolSpecs }) === true,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

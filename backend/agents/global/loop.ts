import type { AgentDecisionIntent } from "../quality-center";
import type { AgentReasoningState } from "../reasoning-loop";
import type { WorkflowDecision } from "../workflow-decision";

export type GlobalAgentRunStatus = "running" | "supervising" | "paused" | "waiting_confirmation" | "waiting_clarification" | "completed" | "failed" | "cancelled";
export type GlobalAgentDecisionState = "answer" | "investigate" | "plan" | "execute" | "needs_confirmation" | "complete";
export type GlobalAgentToolRisk = "read" | "write" | "high";
export type GlobalAgentUserSteerKind = "supplement" | "revise_goal";
export type GlobalAgentUserSteerStatus = "queued" | "applied";

export interface GlobalAgentUserSteer {
  id: string;
  message: string;
  kind: GlobalAgentUserSteerKind;
  source: string;
  request_id?: string;
  at: string;
  status: GlobalAgentUserSteerStatus;
  applied_at?: string;
  authorization_preserved: boolean;
}

export interface GlobalAgentToolSpec {
  name: string;
  description: string;
  required?: string[];
  risk: GlobalAgentToolRisk | ((args: any) => GlobalAgentToolRisk);
}

export interface GlobalAgentDecision {
  state: GlobalAgentDecisionState;
  message?: string;
  plan?: string[];
  tool?: { name: string; arguments?: any } | null;
  intent?: Partial<AgentDecisionIntent>;
  workflowDecision?: WorkflowDecision;
  completion?: { summary?: string; evidence?: string[]; risks?: string[]; next_action?: string };
}

export interface GlobalAgentRunStep {
  index: number;
  at: string;
  state: GlobalAgentDecisionState;
  message: string;
  plan: string[];
  tool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string };
  observation?: any;
  error?: string;
  duration_ms?: number;
  decision?: any;
}

export interface GlobalAgentRun {
  version: 1;
  id: string;
  trace_id: string;
  session_id: string;
  source: string;
  user_message: string;
  history: Array<{ role: string; content: string }>;
  status: GlobalAgentRunStatus;
  phase: GlobalAgentDecisionState;
  explicit_write_authorization: boolean;
  created_at: string;
  updated_at: string;
  started_at: string;
  completed_at?: string;
  metrics_recorded?: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    reported?: boolean;
    directInputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    totalCostUsd?: number;
  } | null;
  input_tokens?: number;
  output_tokens?: number;
  total_cost_usd?: number;
  deadline_at: string;
  max_steps: number;
  steps: GlobalAgentRunStep[];
  pending_tool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string } | null;
  approved_tool_signatures: string[];
  final_reply: string;
  error: string;
  resume_count: number;
  model_calls: number;
  tool_calls: number;
  consecutive_failures: number;
  client_effects: any[];
  /** 用户可见结果档位：reply=轻量气泡，plan=计划书/步骤，delivery=完整任务卡 */
  presentation?: "reply" | "plan" | "delivery";
  mission_id?: string;
  supervisor_id?: string;
  supervision_state?: string;
  final_delivery_report?: any;
  final_report?: any;
  display_stream?: any;
  workchain?: any;
  todo_plan?: any;
  todoPlan?: any;
  test_agent_execution_plan?: any;
  testAgentExecutionPlan?: any;
  test_agent_execution_plan_summary?: any;
  testAgentExecutionPlanSummary?: any;
  test_agent_execution_plan_detail?: string;
  testAgentExecutionPlanDetail?: string;
  test_agent_review_summary?: any;
  testAgentReviewSummary?: any;
  independent_review_summary?: any;
  independentReviewSummary?: any;
  independent_review?: any[];
  independentReview?: any[];
  test_agent_report?: any;
  testAgentReport?: any;
  decision_summary?: any;
  workflow_decision?: WorkflowDecision;
  workflowDecision?: WorkflowDecision;
  clarification_question?: string;
  clarification_summary?: any;
  confirmation_summary?: any;
  plan_mode?: any;
  plan_accept_feedback?: string;
  last_plan_accept_feedback?: string;
  last_plan_accept_feedback_at?: string;
  resume_feedback?: string;
  resumeFeedback?: string;
  last_resume_feedback?: string;
  lastResumeFeedback?: string;
  last_resume_feedback_at?: string;
  lastResumeFeedbackAt?: string;
  resume_feedback_history?: Array<{ feedback: string; at: string; status: string }>;
  resumeFeedbackHistory?: Array<{ feedback: string; at: string; status: string }>;
  pending_user_messages?: GlobalAgentUserSteer[];
  pendingUserMessages?: GlobalAgentUserSteer[];
  user_steer_history?: GlobalAgentUserSteer[];
  userSteerHistory?: GlobalAgentUserSteer[];
  last_user_steer?: GlobalAgentUserSteer | null;
  lastUserSteer?: GlobalAgentUserSteer | null;
  shadow_mode?: boolean;
  original_user_message?: string;
  reasoning_loop: AgentReasoningState;
}

export interface GlobalAgentLoopRuntime {
  callModel: (messages: Array<{ role: string; content: string }>, run: GlobalAgentRun) => Promise<string | GlobalAgentDecision>;
  executeTool: (name: string, args: any, run: GlobalAgentRun) => Promise<any>;
  getContext?: (run: GlobalAgentRun) => Promise<any> | any;
  verifyContextBoundary?: (context: any, run: GlobalAgentRun) => { valid: boolean; issues?: string[] } | boolean;
  fallbackDecision?: (run: GlobalAgentRun, error: any) => Promise<GlobalAgentDecision | null> | GlobalAgentDecision | null;
  onEvent?: (event: any, run: GlobalAgentRun) => void;
  persist?: boolean;
  now?: () => number;
  qualityPolicyOverride?: any;
}

export * from "./global-agent-loop-engine";
export * from "./global-agent-run-store";
export * from "./global-agent-run-replies";
export * from "./global-agent-run-projection";
export { createGlobalAgentRunSupervision } from "./global-agent-run-supervision";

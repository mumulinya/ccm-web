// Behavior-freeze facade — implementation split into focused modules.
export {
  attachGlobalAgentRunSupervision,
  completeGlobalAgentSupervision,
  globalSupervisionStateVisibleSummary,
  updateGlobalAgentSupervisionState,
  classifyGlobalAgentUserSteer,
  steerGlobalAgentRun,
  applyGlobalAgentSupervisionSteer,
} from "./global-agent-loop-engine-part-01";
export {
  startGlobalAgentRun,
  resumeGlobalAgentRun,
  continueGlobalAgentRunWithClarification,
  pauseGlobalAgentRun,
  cancelGlobalAgentRun,
  recoverInterruptedGlobalAgentRuns,
  runGlobalAgentLoopSelfTest,
} from "./global-agent-loop-engine-part-02";

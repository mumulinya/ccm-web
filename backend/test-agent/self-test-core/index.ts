// Barrel for self-test-core/ parts.
export {
  runTestAgentSelfTest,
  runTestAgentMcpProviderSelfTest,
  runTestAgentClaudeChromeMcpSelfTest,
  runTestAgentComputerUseMcpSelfTest,
  runTestAgentWorkOrderNormalizationSelfTest,
  runTestAgentSelfTestMatrixSelfTest,
  runTestAgentHandoffBuilderSelfTest,
  runTestAgentHandoffContractSelfTest,
  runTestAgentArtifactSelfTest,
  runTestAgentVerdictSelfTest,
  runTestAgentFailureSummarySelfTest,
  runTestAgentBrowserProviderGapSummarySelfTest,
  runTestAgentBrowserSessionComparisonSelfTest,
  runTestAgentBrowserFlowSummarySelfTest,
  runTestAgentBrowserMultiSessionSummarySelfTest
} from "./part-01";
export {
  runTestAgentBrowserStabilitySummarySelfTest,
  runTestAgentAcceptanceSummarySelfTest,
  runTestAgentArtifactManifestSelfTest,
  runTestAgentArtifactVerifierSelfTest,
  runTestAgentMcpScreenshotArtifactSelfTest,
  runTestAgentMcpFailureScreenshotSelfTest,
  runTestAgentBrowserEvidenceArtifactSelfTest,
  runTestAgentCoverageSelfTest,
  runTestAgentCommandPlannerSelfTest,
  runTestAgentExecutionPlanSelfTest,
  runTestAgentHttpApiSelfTest,
  runTestAgentAdversarialHttpSelfTest,
  runTestAgentAdversarialBrowserSelfTest,
  runTestAgentBrowserProbeTemplateSelfTest
} from "./part-02";
export {
  runTestAgentAutoBrowserSmokeSelfTest
} from "./part-03";

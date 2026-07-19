// Public compatibility facade. Implementations live in ./self-test-core/.
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
} from "./self-test-core/part-01";
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
} from "./self-test-core/part-02";
export {
  runTestAgentAutoBrowserSmokeSelfTest
} from "./self-test-core/part-03";

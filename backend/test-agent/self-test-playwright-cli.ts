// Public compatibility facade. Implementations live in ./self-test-playwright-cli/.
export {
  runTestAgentPlaywrightFileUploadSelfTest,
  runTestAgentPlaywrightMultiFileUploadSelfTest,
  runTestAgentPlaywrightViewportSelfTest,
  runTestAgentPlaywrightContextOptionsSelfTest,
  runTestAgentPlaywrightInViewportSelfTest,
  runTestAgentPlaywrightNoHorizontalOverflowSelfTest,
  runTestAgentBrowserPreflightSelfTest,
  runTestAgentPlaywrightRealBrowserSelfTest,
  runTestAgentPlaywrightResourceErrorSelfTest,
  runTestAgentStandaloneCliRealWebSelfTest
} from "./self-test-playwright-cli/part-01";
export {
  runTestAgentStandaloneHandoffRealWebSelfTest,
  runTestAgentPlaywrightAvailabilitySelfTest
} from "./self-test-playwright-cli/part-02";
export {
  runTestAgentRequiredCheckCoverageSelfTest
} from "./self-test-playwright-cli/part-03";
export {
  runTestAgentCliSelfTest,
  runTestAgentContractSelfTest
} from "./self-test-playwright-cli/part-04";

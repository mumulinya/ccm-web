import { NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "./types";
import { runBrowserVerificationWithProviders } from "./browser/registry";

export async function runBrowserVerification(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions = {}) {
  return runBrowserVerificationWithProviders(workOrder, runtime);
}

import type { VerificationFailureObservation } from "./failure-observation";
/** Inspect only files/programs explicitly named by this invocation. No package
 * execution, dependency installation, stderr guessing or repository scan. */
export declare function commandDependencyPreflight(command: string, root: string): VerificationFailureObservation | null;

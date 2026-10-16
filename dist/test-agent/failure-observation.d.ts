export type VerificationFailureKind = "implementation" | "environment" | "permission" | "criteria_conflict" | "evidence" | "reconciliation" | "unknown";
export interface VerificationFailureObservation {
    failure_code?: string;
    failure_stage?: "program_start" | "service_ready" | "authentication" | "operation" | "assertion" | "timeout" | "safety_gate" | "evidence_write" | "cleanup";
    failure_kind?: VerificationFailureKind;
}
/** Only executor facts belong here. Error prose is never a routing input. */
export declare function processStartFailure(code: string): VerificationFailureObservation;
export declare function browserFailureObservation(result: any): VerificationFailureObservation;

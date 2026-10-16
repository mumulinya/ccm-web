/** Only the server ledger supplies passed observations and their source state.
 * Reused evidence gets a current observation with explicit provenance, never
 * an old Attempt receipt inserted as this Attempt's result. */
export declare function prepareAcceptanceReverification(context: {
    taskId: string;
    executionId: string;
    contractChecksum: string;
}, configurationChecksum: string): {
    mode: "full";
    fallbackReasons: string[];
    selectedCheckIds: any[];
    reusedEvidence: any[];
} | {
    mode: "incremental";
    fallbackReasons: any[];
    selectedCheckIds: string[];
    reusedEvidence: {
        checkId: any;
        evidenceId: any;
        originEvidenceId: any;
    }[];
};

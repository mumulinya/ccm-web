/** Lightweight project delivery uses observed changes and real commands, never
 * an additional model assertion or a fabricated self-verification receipt. */
export declare function runDispatchQuickVerification(input: {
    task: any;
    project: string;
    workDir: string;
    changedFiles: any[];
    verificationCommands: string[];
}): Promise<{
    mode: string;
    canAccept: boolean;
    checksum: string;
    status: string;
    quick_check_receipt: {
        checksum: string;
        schema: string;
        version: number;
        task_id: string;
        scope: string;
        scope_id: string;
        exact_session_id: string;
        attempt: number;
        project: string;
        work_dir_checksum: string;
        changed_files: string[];
        verification_results: {
            id: string;
            command: string;
            status: "failed" | "blocked" | "timed_out" | "passed";
            exit_code: number;
            duration_ms: number;
            error: string;
        }[];
        canAccept: boolean;
        status: string;
        completed_at: string;
    };
    deterministic_gate: {
        pass: boolean;
        checks: {
            id: string;
            pass: boolean;
        }[];
    };
    report: {
        summary: string;
        verification: string[];
        risks: string[];
    };
}>;

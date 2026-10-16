export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';
export type ReviewFindingState = 'unverified' | 'confirmed' | 'awaiting_recheck' | 'resolved' | 'false_positive' | 'waived';
export interface ReviewSettings {
    version: 1;
    revision: number;
    enabled: boolean;
    taskMode: 'auto' | 'warn' | 'off';
    commitMode: 'block' | 'warn' | 'off';
    model: {
        format: 'openai-compatible' | 'anthropic';
        apiUrl: string;
        model: string;
        keyRef: string;
    };
    timeoutMs: number;
    ocrTimeoutMs: number;
    ocrTokenBudget: number;
    maxCalls: number;
    maxReads: number;
    semgrep: {
        enabled: boolean;
        executable: string;
        rules: string;
    };
    osv: {
        enabled: boolean;
        executable: string;
        database: string;
        maxAgeDays: number;
    };
    rules: Array<{
        pattern: string;
        instruction: string;
        project?: string;
    }>;
    updatedAt: string;
}
export interface ReviewPolicySnapshot {
    schema: 'ccm-code-review-policy-v1';
    settings: ReviewSettings;
    level: 'light' | 'standard' | 'strict' | 'commit';
    required: boolean;
    resources?: Record<string, string>;
    checksum: string;
}
export interface ReviewFile {
    path: string;
    before: string | null;
    after: string | null;
    beforeHash: string;
    afterHash: string;
    afterBlobHash?: string;
    binary?: boolean;
}
export interface ReviewSubjectSnapshot {
    kind: 'task' | 'git';
    project: string;
    root: string;
    taskId: string;
    workItemId: string;
    traceId: string;
    attemptId: string;
    generation: number;
    exactSessionId: string;
    planChecksum: string;
    goal: string;
    plan: any;
    head: string;
    workspaceChecksum: string;
    files: ReviewFile[];
    contextFingerprint: string;
    baselineDir: string;
    targetDir: string;
    checksum: string;
    requestedFiles?: string[];
    dispatchScope?: any;
}
export interface ReviewFinding {
    id: string;
    path: string;
    startLine: number;
    endLine: number;
    side: 'before' | 'after';
    symbol: string;
    category: string;
    severity: ReviewSeverity;
    state: ReviewFindingState;
    title: string;
    trigger: string;
    impact: string;
    evidence: string[];
    suggestion: string;
    sources: string[];
    firstSeen: string;
    lastSeen: string;
    decision?: {
        actor: string;
        role: string;
        reason: string;
        at: string;
        subjectChecksum: string;
    };
}
export interface ReviewCoverage {
    tool: string;
    status: 'complete' | 'partial' | 'failed' | 'skipped';
    selected: string[];
    completed: string[];
    skipped: Array<{
        path: string;
        reason: string;
    }>;
    reason?: string;
}
export interface ReviewJob {
    id: string;
    runId: string;
    revision: number;
    key: string;
    policy: ReviewPolicySnapshot;
    subject: ReviewSubjectSnapshot;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'recovery_required';
    stage: string;
    findings: ReviewFinding[];
    coverage: ReviewCoverage[];
    conclusion: 'pending' | 'passed' | 'blocked' | 'incomplete' | 'not_required';
    error: string;
    ownerPid: number;
    leaseUntil: number;
    createdAt: string;
    updatedAt: string;
    elapsedMs: number;
    usage: any[];
    history: Array<{
        type: string;
        at: string;
        findingId?: string;
        reason?: string;
    }>;
}

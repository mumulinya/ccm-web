import { acceptanceHash } from '../agents/acceptance-contract';
import type { ReviewSettings, ReviewPolicySnapshot } from './types';
export declare const reviewHash: typeof acceptanceHash;
export declare function loadReviewSettings(): ReviewSettings;
export declare function publicReviewSettings(settings?: ReviewSettings): {
    model: {
        hasKey: boolean;
        format: "openai-compatible" | "anthropic";
        apiUrl: string;
        model: string;
    };
    ocrVersion: string;
    secretlintVersion: string;
    version: 1;
    revision: number;
    enabled: boolean;
    taskMode: "auto" | "warn" | "off";
    commitMode: "block" | "warn" | "off";
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
};
export declare function saveReviewSettings(input: any): ReviewSettings;
export declare function freezeReviewPolicy(level: ReviewPolicySnapshot['level'], settings?: ReviewSettings): ReviewPolicySnapshot;
export declare function reviewResourceFingerprints(settings: ReviewSettings): Record<string, string>;
export declare function validateReviewPolicy(value: any): value is ReviewPolicySnapshot;
export declare function reviewModelConfig(policy: ReviewPolicySnapshot): {
    format: "anthropic" | "openai-compatible";
    apiUrl: string;
    apiKey: string;
    model: string;
};

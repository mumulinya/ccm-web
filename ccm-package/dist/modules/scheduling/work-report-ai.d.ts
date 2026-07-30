import { type SemanticDecisionReceiptV1 } from "../../system/semantic-decision-runtime";
import type { WorkJournalEvent } from "./work-journal";
export type WorkReportKind = "daily" | "weekly";
export interface WorkReportEvidenceSnapshotV3 {
    schema: "ccm-work-report-evidence-snapshot-v3";
    version: 3;
    kind: WorkReportKind;
    reportId: string;
    timezone: string;
    period: {
        start: string;
        end: string;
        label: string;
    };
    eventIds: string[];
    events: Array<{
        id: string;
        at: string;
        type: string;
        state: string;
        actorType: string;
        actorLabel: string;
        source: string;
        title: string;
        detail: string;
        taskId: string;
        project: string;
        groupId: string;
        evidenceLevel: string;
    }>;
    summary: any;
    ownership: any;
    changedFiles: string[];
    verificationCount: number;
    checksum: string;
}
export interface WorkReportSummaryItemV3 {
    text: string;
    evidence_event_ids: string[];
}
export interface WorkReportSummaryV3 {
    schema: "ccm-work-report-summary-v3";
    version: 3;
    headline: string;
    overview: WorkReportSummaryItemV3;
    completed: WorkReportSummaryItemV3[];
    highlights: WorkReportSummaryItemV3[];
    quality: WorkReportSummaryItemV3[];
    risks: WorkReportSummaryItemV3[];
    next_actions: WorkReportSummaryItemV3[];
    confidence: number;
}
export interface WorkReportGenerationReceiptV3 {
    schema: "ccm-work-report-generation-receipt-v3";
    version: 3;
    report_id: string;
    report_kind: WorkReportKind;
    evidence_checksum: string;
    event_count: number;
    chunk_count: number;
    covered_event_ids: string[];
    semantic_receipts: SemanticDecisionReceiptV1[];
    provider: string;
    model: string;
    generated_at: string;
    summary_checksum: string;
    checksum: string;
}
type ModelCall = (request: {
    config: any;
    messages: any[];
    maxTokens: number;
}) => Promise<any>;
export declare function validateWorkReportSummaryV3(value: any, snapshot: WorkReportEvidenceSnapshotV3): WorkReportSummaryV3;
export declare function buildWorkReportEvidenceSnapshotV3(report: any, allEvents: WorkJournalEvent[], timezone: string): WorkReportEvidenceSnapshotV3;
export declare function generateWorkReportSummaryV3(snapshot: WorkReportEvidenceSnapshotV3, options?: {
    modelCall?: ModelCall;
    config?: any;
}): Promise<{
    summary: WorkReportSummaryV3;
    receipt: WorkReportGenerationReceiptV3;
}>;
export declare function renderWorkReportSummaryMarkdownV3(summary: WorkReportSummaryV3, snapshot: WorkReportEvidenceSnapshotV3): string;
export {};

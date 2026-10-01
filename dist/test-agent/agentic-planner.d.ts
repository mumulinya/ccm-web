import { BrowserCheckSpec, BrowserCheckResult, CommandRunResult, HttpCheckResult, HttpCheckSpec, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions, WorkOrderIssue } from "./types";
import { TestAgentSemanticPlanV2 } from "../system/semantic-decision-runtime";
import { type TestAgentPlanningReceiptV2 } from "./planning-fallback";
export interface AgenticTestProjectPlan {
    name: string;
    rationale?: string;
    commands?: string[];
    httpChecks?: HttpCheckSpec[];
    browserChecks?: BrowserCheckSpec[];
}
export interface AgenticTestPlan {
    summary?: string;
    inspectedFiles?: string[];
    projects?: AgenticTestProjectPlan[];
    criterionCoverage?: TestAgentSemanticPlanV2["criterionCoverage"];
    semanticDecisionReceipt?: any;
    semanticRepairApplied?: boolean;
}
export interface AgenticTestPlanningInput {
    workOrder: NormalizedTestAgentWorkOrder;
    /** Current-Loop-only signed read-only Skill/MCP projection. */
    readonlyCapabilityPrompt?: string;
    /** Exact evidence names semantic coverage rows may bind to. */
    allowedCriterionCheckNames: string[];
    /** Present only for the single fail-closed semantic repair attempt. */
    repairReason?: string;
    authoritativeEvidence: {
        surfaceAudit: null | {
            status: string;
            declaredFiles: string[];
            actualFiles: Array<{
                path: string;
                state: string;
            }>;
            undeclaredChanges: string[];
            missingDeclaredChanges: string[];
            criterionStatuses: Array<{
                criterionId: string;
                status: string;
            }>;
            canAccept: boolean;
            checksum: string;
            contentStored: false;
        };
    };
    sourceContext: Array<{
        project: string;
        files: string[];
        packageScripts: Record<string, string>;
        gitMetadataAvailable: boolean;
        excerpts: Array<{
            file: string;
            content: string;
        }>;
    }>;
}
export interface AgenticTestFollowupInput {
    workOrder: NormalizedTestAgentWorkOrder;
    commandResults: CommandRunResult[];
    httpResults: HttpCheckResult[];
    browserResults: BrowserCheckResult[];
}
export interface AgenticTestFollowupPlan {
    summary?: string;
    projects?: Array<{
        name: string;
        rationale?: string;
        commands?: string[];
        browserChecks?: BrowserCheckSpec[];
    }>;
}
export declare function applyAgenticTestPlanning(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions, preexistingIssues?: WorkOrderIssue[]): Promise<{
    workOrder: NormalizedTestAgentWorkOrder;
    issues: WorkOrderIssue[];
    planningReceipt?: TestAgentPlanningReceiptV2;
}>;
export declare function planAgenticTestFollowup(input: AgenticTestFollowupInput, runtime: TestAgentRuntimeOptions): Promise<{
    workOrder: NormalizedTestAgentWorkOrder | null;
    metadata: any;
    issue?: WorkOrderIssue;
}>;

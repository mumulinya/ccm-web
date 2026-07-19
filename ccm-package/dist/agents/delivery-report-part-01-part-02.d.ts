import type { MainAgentDeliveryStatus, MainAgentDeliveryReportInput } from "./delivery-report-part-01-part-01";
export declare function collectDeliveryIndependentReview(input: MainAgentDeliveryReportInput, status: MainAgentDeliveryStatus): string[];
export declare function collectDeliveryPostReviewSpotCheck(input: MainAgentDeliveryReportInput): string[];
export declare function collectDeliveryRisks(input: MainAgentDeliveryReportInput): string[];
export declare function deliveryPlanStepText(item: any): string;
export declare function collectDeliveryPlanAcceptedFeedback(input: MainAgentDeliveryReportInput, plan: any): string[];
export declare function collectDeliveryAcceptedFeedbackForQuality(input: MainAgentDeliveryReportInput): string[];
export declare function collectDeliveryPlanAlignmentGaps(planAlignment: any): string[];

type DeliveryStatus = "done" | "waiting" | "failed";
export declare function formatDeliveryMissingVerification(item: any): string;
export declare function formatDeliveryReworkItem(item: any): string;
export declare function formatDeliveryAssignmentItem(item: any): string;
export declare function buildUserDeliveryReport(task: any, summary: any, status: DeliveryStatus, detail?: string): string;
export declare function buildTaskGroupReportMessage(task: any, status: DeliveryStatus, detail?: string): string;
export {};

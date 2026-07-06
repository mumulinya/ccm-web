export declare function extractTaskNotificationTag(text: string, tag: string): string;
export declare function parseTaskNotificationsFromText(text: string): {
    task_id: string;
    status: string;
    receipt_status: string;
    summary: string;
    result: string;
}[];
export declare function getCollectedOutputAgent(output: string): string;
export declare function getCollectedOutputReceiptStatus(output: string): string;
export declare function formatCollectedAgentOutput(agent: string, text: string, receipt?: any): string;

/** Report missing/raw-source boundaries while keeping the independent task
 * archive authoritative. Never silently substitute another conversation. */
export declare function readTaskSessionSourceHistory(task: any): {
    messages: any[];
    state: {
        status: string;
        reason: string;
        archive_retained: boolean;
        summarized_message_count?: undefined;
    };
} | {
    messages: any[];
    state: {
        status: string;
        reason: string;
        summarized_message_count: number;
        archive_retained: boolean;
    };
};

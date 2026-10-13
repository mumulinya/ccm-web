/** Bound only the model projection. Original task records remain queryable,
 * including large receipts and every revision of the related messages. */
export declare function projectTaskSessionModelHistory(messages: any[], maxCharacters?: number): {
    messages: any[];
    state: {
        complete: boolean;
        archived_message_count: number;
        projected_message_count: number;
        omitted_message_count: number;
        truncated_message_count: number;
        archive_checksum?: undefined;
    };
} | {
    messages: any[];
    state: {
        complete: boolean;
        archived_message_count: number;
        projected_message_count: number;
        omitted_message_count: number;
        truncated_message_count: number;
        archive_checksum: string;
    };
};

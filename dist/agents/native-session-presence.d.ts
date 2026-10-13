/** Read only bounded session metadata. Provider transcripts are never returned
 * or copied into CCM persistence. Unknown storage contracts fail closed. */
export declare function inspectNativeSessionPresence(runtimeId: string, input: any): {
    valid: boolean;
    reason: string;
    storageRef?: undefined;
} | {
    valid: boolean;
    reason: string;
    storageRef: string;
};

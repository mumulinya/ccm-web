/** Replay ties retain stage order. A cursor into that sequence must resume
 * after its actual row, rather than reordering equal timestamps by ID. */
export declare function replayCursorOffset(events: Array<{
    at: string;
    id: string;
}>, at: string, id: string): number;

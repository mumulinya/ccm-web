/** Read one complete JSON object, respecting braces inside JSON strings.
 * Trailing verification records or narration are separate protocol records. */
export declare function readReceiptJsonObject(text: string): any;

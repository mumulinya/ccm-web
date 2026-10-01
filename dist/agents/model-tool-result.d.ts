import type { NativeToolResult } from "./native-query-messages";
export declare function modelToolBody(row: any): any;
export declare function modelToolTokens(row: any): number;
export declare function toModelToolResult(row: any, callId: string, name?: any): NativeToolResult;
/** The outer observation/error pair belongs to the execution ledger, not the tool. */
export declare function executionModelToolResult(event: any): NativeToolResult;
/** Global tools also return business observations, not just runtime rows. */
export declare function globalModelToolObservation(observation: any): any;

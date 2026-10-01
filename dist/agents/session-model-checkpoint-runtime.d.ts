import { type NativeToolResult } from './native-query-messages';
import type { NativeQueryLoopInput } from './native-query-loop';
import type { ProviderAgentTurn, ProviderToolCall } from '../system/provider-native-tools';
export declare function createModelCheckpointRuntime(input: NativeQueryLoopInput, family: string): {
    forJson(next: any[]): any[];
    resume(execute: NativeQueryLoopInput["executeTools"]): Promise<any[]>;
    request(next: any[], index: number): any[];
    declared(call: ProviderToolCall): void;
    turn(turn: ProviderAgentTurn, index: number): void;
    results(rows: NativeToolResult[]): void;
    adopt(next: any[]): any[];
    complete(next: any[], text: string, finalTurn?: ProviderAgentTurn): any[];
};

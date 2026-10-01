export type ResponsesOutputReplay = {
    version: 1;
    items: any[];
    requestIdentity?: string;
};
export declare function responsesReplayIdentity(config: any): string;
export declare function captureResponsesOutput(output: any): ResponsesOutputReplay | undefined;
export declare function bindResponsesReplay<T extends {
    responsesOutput?: ResponsesOutputReplay;
}>(turn: T, config: any): T;
export declare function attachResponsesReplay(message: any, replay?: ResponsesOutputReplay): any;
export declare function replayResponsesMessage(message: any, requestIdentity?: string): any[] | undefined;
export declare function stripResponsesReplay(message: any): any;
export declare function createResponsesOutputCollector(): {
    push(event: any): void;
    finish(response: any): ResponsesOutputReplay;
};

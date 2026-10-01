import type { CcmProviderStreamActivityV1 } from "./provider-stream-activity";
type ProjectionInput = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    generation: number;
    attempt: number;
    anchorMessageId?: string;
    taskId?: string;
    title: string;
    keyProgress: {
        modelPreamble(text: string, modelCallIndex?: number, round?: number, toolCallIds?: string[], eventId?: string): any;
    };
    markVisible?: (at?: number) => void;
    onProjectedEvent?: (event: any) => void;
};
/**
 * Projects only Provider-declared safe summaries. Raw thinking, encrypted
 * reasoning and signatures never enter this adapter.
 */
export declare function createProviderStreamVisibleProjection(input: ProjectionInput): {
    handle(activity: CcmProviderStreamActivityV1): any;
    flush(): void;
};
export {};

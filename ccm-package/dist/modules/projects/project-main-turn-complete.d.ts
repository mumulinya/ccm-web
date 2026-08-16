export type ProjectFirstTurnVisiblePresentation = {
    present: boolean;
    messageMode: "conversation" | "project_analysis";
    reply: string;
    presentedPlan: any | null;
    responseKind: string;
};
export declare function presentedPlanFromProjectFirstTurn(firstTurn: any): any;
export declare function projectFirstTurnShouldEnterTask(firstTurn: any, options?: {
    treatAsTask?: boolean;
}): boolean;
export declare function projectFirstTurnMessageMode(firstTurn: any): "conversation" | "project_analysis";
export declare function projectFirstTurnVisiblePresentation(firstTurn: any, options?: {
    treatAsTask?: boolean;
}): ProjectFirstTurnVisiblePresentation;
/** @deprecated use projectFirstTurnVisiblePresentation */
export declare function projectFirstTurnVisibleCompletion(firstTurn: any, options?: {
    treatAsTask?: boolean;
}): {
    complete: boolean;
    mode: string;
    reply: string;
    presentedPlan: any;
    responseKind: string;
};
export declare function runProjectMainTurnCompleteSelfTest(): {
    pass: boolean;
    checks: {
        replyPresents: boolean;
        clarifyPresents: boolean;
        planCardPresents: boolean;
        emptyAnalysisPresentsFallback: boolean;
        developmentTaskDoesNotPresent: boolean;
        parentTaskPlanDoesNotPresent: boolean;
    };
};

export declare function recommendationFollowup(input: any): {
    batch: any;
    model: {
        batchId: any;
        sourceMode: any;
        mood: any;
        feeling: any;
        constraints: any;
        items: any;
        action: any;
        index: any;
    };
} | {
    batch: any;
    model: {
        batchId: any;
        sourceMode: any;
        mood: any;
        feeling: any;
        constraints: any;
        items: any;
        action?: undefined;
        index?: undefined;
    };
} | {
    batch?: undefined;
    model?: undefined;
};
export declare function applyRecommendationControl(action: any, followup: any): any;
export declare function resolveRecommendation(input: any, makeDecision: (value: any) => any): Promise<any>;
export declare function publicBatch(batch: any): {
    batchId: any;
    sourceMode: any;
    mood: any;
    feeling: any;
    count: any;
    warnings: any;
    createdAt: any;
    expiresAt: any;
};

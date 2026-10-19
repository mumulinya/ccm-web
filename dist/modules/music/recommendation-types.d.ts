export type RecommendationIntent = {
    mood: string;
    feeling: string;
    constraints: string[];
    operation: 'new' | 'refresh' | 'adjust' | 'select' | 'less';
    selectionIndex?: number;
    replaceConstraints?: boolean;
};
export type PopularityEvidence = {
    provider: string;
    chartId: string;
    chartName: string;
    rank: number;
    fetchedAt: string;
    updatedAt?: string;
};
export declare const recommendationPolicy = "Music recommendations must be grounded in real candidates, never invented titles.\nA mood/activity expression alone (including feeling sad, happy, tired or focused) or asking for recommendations means action=search, strategy=none, recommendation.operation=new. Do NOT play merely because the user expresses emotion. Mere discussion of past feelings or unrelated chitchat need not recommend.\nDefault for low mood is gentle company, not automatically sad songs. Prioritize emotional fit over popularity; respect language, artist, genre and negative constraints. Briefly acknowledge the feeling without asserting a diagnosis.\nOnly an explicit play request means action=play. For \"play the second one\" use recommendation.operation=select and selectionIndex=1 (zero based); \"play one\" may select index 0 of the current batch. Never turn an ordinal into a new search. For refresh or adjustments retain previous requirements unless explicitly changed.\nrecommendation={mood:string,feeling:string,constraints:string[],operation:new|refresh|adjust|select|less,selectionIndex?:number,replaceConstraints?:boolean}. Set replaceConstraints=true only when the current user explicitly changes/removes prior constraints; return the complete new effective constraints then. Search with recommendations may have strategy=none. Explicit emotion-based play uses mood_recommendation. A generic explicit song request does not need recommendation metadata.\nIf recommendationContext supplies an explicit button action, interpret it as the user action on the supplied batch. less is a lasting preference only when the user explicitly requests fewer future recommendations of that song, never inferred from playback/skipping/temporary mood. Typed followups are decided semantically. Video channel stays video unless the current message explicitly asks for music. Do not recommend music for ordinary video search.";
export declare function normalizeRecommendationIntent(value: any): RecommendationIntent | undefined;

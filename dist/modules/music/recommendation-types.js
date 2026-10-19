"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationPolicy = void 0;
exports.normalizeRecommendationIntent = normalizeRecommendationIntent;
exports.recommendationPolicy = `Music recommendations must be grounded in real candidates, never invented titles.
A mood/activity expression alone (including feeling sad, happy, tired or focused) or asking for recommendations means action=search, strategy=none, recommendation.operation=new. Do NOT play merely because the user expresses emotion. Mere discussion of past feelings or unrelated chitchat need not recommend.
Default for low mood is gentle company, not automatically sad songs. Prioritize emotional fit over popularity; respect language, artist, genre and negative constraints. Briefly acknowledge the feeling without asserting a diagnosis.
Only an explicit play request means action=play. For "play the second one" use recommendation.operation=select and selectionIndex=1 (zero based); "play one" may select index 0 of the current batch. Never turn an ordinal into a new search. For refresh or adjustments retain previous requirements unless explicitly changed.
recommendation={mood:string,feeling:string,constraints:string[],operation:new|refresh|adjust|select|less,selectionIndex?:number,replaceConstraints?:boolean}. Set replaceConstraints=true only when the current user explicitly changes/removes prior constraints; return the complete new effective constraints then. Search with recommendations may have strategy=none. Explicit emotion-based play uses mood_recommendation. A generic explicit song request does not need recommendation metadata.
If recommendationContext supplies an explicit button action, interpret it as the user action on the supplied batch. less is a lasting preference only when the user explicitly requests fewer future recommendations of that song, never inferred from playback/skipping/temporary mood. Typed followups are decided semantically. Video channel stays video unless the current message explicitly asks for music. Do not recommend music for ordinary video search.`;
function normalizeRecommendationIntent(value) {
    if (!value || !['new', 'refresh', 'adjust', 'select', 'less'].includes(value.operation))
        return undefined;
    const text = (input) => String(input || '').trim().slice(0, 200);
    const selectionIndex = value.selectionIndex;
    if (value.operation === 'select' && (!Number.isInteger(selectionIndex) || selectionIndex < 0 || selectionIndex > 4))
        throw Error('推荐歌曲序号无效，请选择列表中的歌曲');
    return { mood: text(value.mood), feeling: text(value.feeling), constraints: Array.isArray(value.constraints) ? value.constraints.slice(0, 12).map(text).filter(Boolean) : [], operation: value.operation, ...(Number.isInteger(selectionIndex) ? { selectionIndex } : {}), ...(value.replaceConstraints === true ? { replaceConstraints: true } : {}) };
}
//# sourceMappingURL=recommendation-types.js.map
import { type CcmDelegatedInquiryActionV2 } from "./delegated-inquiry-projections";
export declare function performDelegatedInquiryAction(input: {
    inquiryId: string;
    revision: number;
    action: CcmDelegatedInquiryActionV2;
    clarification?: string;
    signal?: AbortSignal;
}): Promise<{
    navigation?: {
        kind: string;
        tab: string;
        context: {
            sessionId: any;
            draftMessage: string;
        };
    };
    projection: import("./delegated-inquiry-projections").CcmDelegatedInquiryProjectionV2;
    replayed: boolean;
}>;

export type ClarificationAnswerValidationResult = {
    answers: Record<string, string | string[]>;
    otherNotes: Record<string, string>;
    additionalNote: string;
    answerText: string;
    answerChecksum: string;
    completedQuestionIds: string[];
    questionCount: number;
};
export declare function validateClarificationAnswerSubmission(clarification: any, input: any, options?: {
    useDefaults?: boolean;
}): ClarificationAnswerValidationResult;

import { AdversarialEvidenceRelevance } from "./types";
export declare function adversarialContextCriteria(context: Record<string, any> | undefined): string[];
export declare function buildAdversarialEvidenceRelevance(input: {
    name: string;
    target: string;
    probeType?: string;
    context?: Record<string, any>;
    originalUserGoal?: string;
    acceptanceCriteria?: string[];
}): {
    relevance: AdversarialEvidenceRelevance;
    linkedCriteria: string[];
    goalLinked: boolean;
    matchScore: number;
};

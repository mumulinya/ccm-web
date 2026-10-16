import { callNativeAgentTurn } from '../modules/collaboration/group-orchestrator-llm-client';
import { runOcrReview } from './ocr-adapter';
import { scanSecrets } from './local-checks';
import type { ReviewJob } from './types';
type Dependencies = {
    model?: typeof callNativeAgentTurn;
    ocr?: typeof runOcrReview;
    secrets?: typeof scanSecrets;
};
export declare function executeReviewAgent(job: ReviewJob, signal: AbortSignal, event: (stage: string, job: ReviewJob) => void, deps?: Dependencies): Promise<void>;
export {};

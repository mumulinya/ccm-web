import type { ReviewSubjectSnapshot } from './types';
export declare function removeUnusedReviewSubject(subject: ReviewSubjectSnapshot): void;
export declare function purgeTaskCodeReviews(taskId: string): {
    removed: number;
    deferred: number;
};
export declare function pruneStandaloneCodeReviews(): {
    removed: number;
};
/** Finally handles normal completion; this also removes plaintext tool config
 * after a parent crash once its persisted lease is no longer active. */
export declare function eraseExpiredReviewCredentials(): void;

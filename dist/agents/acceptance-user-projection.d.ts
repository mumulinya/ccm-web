/** User projection is an allowlist. Never expose command bodies, output or arbitrary metadata. */
export declare function acceptanceDisplayText(value: unknown): string;
export declare function acceptanceUserProjection(result: any): {
    status: any;
    canComplete: boolean;
    criteria: any;
    blockedReasons: any;
};

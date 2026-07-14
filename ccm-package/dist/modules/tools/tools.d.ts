export declare function runToolChainVerificationSelfTest(): {
    pass: boolean;
    checks: {
        verifiedGatePassesObservedScope: boolean;
        readyUnverifiedRequiresObservation: boolean;
        failedInvocationDoesNotVerifyScope: any;
        incompleteScopeRoutesToRealBusinessTask: boolean;
        blockedGateBlocksDispatch: boolean;
        unconfiguredScopeExcludedFromConfiguredGate: boolean;
        runtimeResyncActionTargetsSnapshot: boolean;
        gateAggregatesNextActions: boolean;
        groupFilterGatesOnlyGroupScope: boolean;
        projectAliasInvocationEvidence: boolean;
        completionAuditCanReachCompleteWithFullEvidence: boolean;
        completionAuditUsesFreshPersistedCliProbeEvidence: boolean;
        completionAuditRejectsStaleCliProbeEvidence: boolean;
        completionAuditKeepsGoalIncompleteWithoutRealCliAndMarketplaceEvidence: boolean;
    };
    reports: {
        verified: {
            schema: string;
            status: string;
            dispatchReady: boolean;
            verified: boolean;
            requiresObservation: boolean;
            counts: {
                configuredScopes: number;
                blockingScopes: number;
                pendingObservationScopes: number;
                verifiedScopes: number;
                unconfiguredScopes: number;
            };
            blockingStatuses: any[];
            blockingScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            pendingObservationScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            verifiedScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            nextActions: any[];
        };
        readyUnverified: {
            schema: string;
            status: string;
            dispatchReady: boolean;
            verified: boolean;
            requiresObservation: boolean;
            counts: {
                configuredScopes: number;
                blockingScopes: number;
                pendingObservationScopes: number;
                verifiedScopes: number;
                unconfiguredScopes: number;
            };
            blockingStatuses: any[];
            blockingScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            pendingObservationScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            verifiedScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            nextActions: any[];
        };
        blocked: {
            schema: string;
            status: string;
            dispatchReady: boolean;
            verified: boolean;
            requiresObservation: boolean;
            counts: {
                configuredScopes: number;
                blockingScopes: number;
                pendingObservationScopes: number;
                verifiedScopes: number;
                unconfiguredScopes: number;
            };
            blockingStatuses: any[];
            blockingScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            pendingObservationScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            verifiedScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            nextActions: any[];
        };
        filteredGroup: {
            schema: string;
            status: string;
            dispatchReady: boolean;
            verified: boolean;
            requiresObservation: boolean;
            counts: {
                configuredScopes: number;
                blockingScopes: number;
                pendingObservationScopes: number;
                verifiedScopes: number;
                unconfiguredScopes: number;
            };
            blockingStatuses: any[];
            blockingScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            pendingObservationScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            verifiedScopes: {
                scope: string;
                id: string;
                name: string;
                status: string;
                statusLabel: string;
                counts: {
                    mcp: number;
                    skill: number;
                };
                nextActionKinds: any;
            }[];
            nextActions: any[];
        };
        completionReady: {
            schema: string;
            success: boolean;
            generatedAt: string;
            status: string;
            complete: boolean;
            summary: {
                requirements: number;
                proven: any;
                partial: any;
                missing: any;
            };
            requirements: {
                id: string;
                label: string;
                status: "missing" | "partial" | "proven";
                proven: boolean;
                evidence: any;
                blockers: any[];
                nextActions: any[];
            }[];
            chainGate: any;
        };
        completionPersistedProbe: {
            schema: string;
            success: boolean;
            generatedAt: string;
            status: string;
            complete: boolean;
            summary: {
                requirements: number;
                proven: any;
                partial: any;
                missing: any;
            };
            requirements: {
                id: string;
                label: string;
                status: "missing" | "partial" | "proven";
                proven: boolean;
                evidence: any;
                blockers: any[];
                nextActions: any[];
            }[];
            chainGate: any;
        };
        completionStaleProbe: {
            schema: string;
            success: boolean;
            generatedAt: string;
            status: string;
            complete: boolean;
            summary: {
                requirements: number;
                proven: any;
                partial: any;
                missing: any;
            };
            requirements: {
                id: string;
                label: string;
                status: "missing" | "partial" | "proven";
                proven: boolean;
                evidence: any;
                blockers: any[];
                nextActions: any[];
            }[];
            chainGate: any;
        };
        completionMissing: {
            schema: string;
            success: boolean;
            generatedAt: string;
            status: string;
            complete: boolean;
            summary: {
                requirements: number;
                proven: any;
                partial: any;
                missing: any;
            };
            requirements: {
                id: string;
                label: string;
                status: "missing" | "partial" | "proven";
                proven: boolean;
                evidence: any;
                blockers: any[];
                nextActions: any[];
            }[];
            chainGate: any;
        };
    };
};
export declare function handleToolsAndMetricsApi(pathname: string, req: any, res: any, parsed: any): boolean;

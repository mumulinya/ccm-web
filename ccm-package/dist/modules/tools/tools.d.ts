export declare function buildLivePerformanceSnapshot(): {
    collectedAt: string;
    process: {
        pid: number;
        uptimeSeconds: number;
        cpuPercent: number;
        rssBytes: number;
        heapUsedBytes: number;
        heapTotalBytes: number;
        externalBytes: number;
    };
    eventLoop: {
        utilization: number;
        activeMs: number;
        idleMs: number;
    };
};
export declare function reloadToolManagerAfterCatalogMutation(entry: any): Promise<{
    authorizationImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            scopeCount: number;
            projects: number;
            groups: number;
            mcpGrants: number;
            skillGrants: number;
        };
        scopes: any;
        truncated: boolean;
    };
    runtimeImpact: {
        schema: string;
        action: string;
        type: string;
        name: string;
        summary: {
            runtimeSnapshots: number;
            catalogStale: number;
            dispatchBlocked: number;
            deliveryBlocked: number;
            affectedProjects: number;
            affectedGroups: number;
        };
        snapshots: any;
        truncated: boolean;
    };
    runtimeResync: {
        schema: string;
        success: boolean;
        requestedAt: string;
        error: string;
        summary: {
            scanned: number;
            selected: number;
            created: number;
            resynced: number;
            skipped: number;
            failed: number;
        };
        items: any;
    };
    schema: string;
    action: any;
    type: any;
    name: any;
    source: any;
    changed: boolean;
    reloaded: boolean;
    status: {
        mcpServers: any;
        mcpTools: any;
        skills: any;
    };
}>;
export declare function rollbackCatalogMutation(type: "mcp" | "skill", name: string, previous: any): Promise<void>;
export declare function selectLatestRuntimeToolAudits(audits: any[]): any[];
export declare function loadLatestRuntimeToolReadiness(limit?: number, options?: {
    businessOnly?: boolean;
}): import("../../tools/runtime-tool-sync").RuntimeToolReadiness[];
export declare function buildToolInvocationAudit(input?: any): {
    schema: string;
    success: boolean;
    limit: number;
    filters: {
        runtime: string;
        project: string;
        projectAliases: string[];
        groupId: string;
        taskId: string;
        category: string;
        source: string;
    };
    files: {
        toolLoop: string;
        skillInvocations: string;
        permissionViolations: string;
    };
    summary: {
        totalReturned: number;
        toolCalls: number;
        successfulToolCalls: number;
        failedToolCalls: number;
        skillInvocations: number;
        unauthorized: number;
        loopsFinished: number;
    };
    items: ({
        category: string;
        skill: string;
        contentHash: string;
        ok: boolean;
        inputBytes: number;
        scope: {
            mcp: any;
            skill: any;
        };
        at: string;
        source: "tool_loop" | "skill_invocation" | "permission_violation";
        type: string;
        runtime: string;
        project: string;
        groupId: string;
        taskId: string;
        executionId: string;
        invocationSource: string;
    } | {
        category: string;
        tool: string;
        server: string;
        rule: string;
        ok: boolean;
        scope: {
            mcp: any;
            skill: any;
        };
        at: string;
        source: "tool_loop" | "skill_invocation" | "permission_violation";
        type: string;
        runtime: string;
        project: string;
        groupId: string;
        taskId: string;
        executionId: string;
        invocationSource: string;
    } | {
        category: string;
        tool: string;
        round: number;
        ok: boolean;
        argumentsHash: string;
        termination: string;
        toolCalls: number;
        durationMs: number;
        nativeSession: boolean;
        error: string;
        at: string;
        source: "tool_loop" | "skill_invocation" | "permission_violation";
        type: string;
        runtime: string;
        project: string;
        groupId: string;
        taskId: string;
        executionId: string;
        invocationSource: string;
    })[];
};
export declare function buildToolChainVerification(input?: any): {
    schema: string;
    success: boolean;
    generatedAt: string;
    filters: {
        scope: string;
        scopeId: string;
        groupId: string;
        project: string;
        status: string;
    };
    summary: {
        totalScopes: any;
        configuredScopes: any;
        verified: number;
        readyNotObserved: number;
        verificationIncomplete: number;
        needsAttention: any;
        authorizationBlocked: number;
        runtimeMissing: number;
        runtimeNeedsResync: number;
        unauthorizedAttempts: any;
        observedInvocations: any;
        statusCounts: any;
    };
    gate: {
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
    rows: any;
};
export declare function normalizeTruthFlag(value: any): boolean;
export declare function buildMcpSkillGoalCompletionAudit(input?: any): {
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
export declare function buildToolChainVerificationSelfTestRow(input?: any): {
    schema: string;
    scope: any;
    id: any;
    name: any;
    tools: any;
    counts: any;
    audit_summary: any;
    authorization_readiness: any;
    runtime: any;
};
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
export declare function runTerminalCommand(command: string, cwd: string, options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
}): Promise<unknown>;
export declare function listSharedFiles(): {
    schema: "ccm-shared-file-manifest-v2";
    id: string;
    scope_type: import("./shared-files-v2").SharedFileScope;
    scope_id: string;
    name: string;
    type: "text" | "image" | "document" | "file";
    mime_type: string;
    size: number;
    checksum: string;
    revision: number;
    readable: boolean;
    parse_state: "ready" | "reference_only" | "failed";
    parse_error?: string;
    chunks: import("./shared-files-v2").SharedFileChunkV2[];
    created_at: string;
    updated_at: string;
    legacy_source?: string;
}[];
export declare function readSharedFile(name: string): {
    content: string;
    schema: "ccm-shared-file-manifest-v2";
    id: string;
    scope_type: import("./shared-files-v2").SharedFileScope;
    scope_id: string;
    name: string;
    type: "text" | "image" | "document" | "file";
    mime_type: string;
    size: number;
    checksum: string;
    revision: number;
    readable: boolean;
    parse_state: "ready" | "reference_only" | "failed";
    parse_error?: string;
    chunks: import("./shared-files-v2").SharedFileChunkV2[];
    created_at: string;
    updated_at: string;
    legacy_source?: string;
};
export declare function writeSharedFile(name: string, content: string): {
    schema: "ccm-shared-file-manifest-v2";
    id: string;
    scope_type: import("./shared-files-v2").SharedFileScope;
    scope_id: string;
    name: string;
    type: "text" | "image" | "document" | "file";
    mime_type: string;
    size: number;
    checksum: string;
    revision: number;
    readable: boolean;
    parse_state: "ready" | "reference_only" | "failed";
    parse_error?: string;
    chunks: import("./shared-files-v2").SharedFileChunkV2[];
    created_at: string;
    updated_at: string;
    legacy_source?: string;
};
export declare function saveSharedUpload(filename: string, buffer: Buffer): {
    schema: "ccm-shared-file-manifest-v2";
    id: string;
    scope_type: import("./shared-files-v2").SharedFileScope;
    scope_id: string;
    name: string;
    type: "text" | "image" | "document" | "file";
    mime_type: string;
    size: number;
    checksum: string;
    revision: number;
    readable: boolean;
    parse_state: "ready" | "reference_only" | "failed";
    parse_error?: string;
    chunks: import("./shared-files-v2").SharedFileChunkV2[];
    created_at: string;
    updated_at: string;
    legacy_source?: string;
};
export declare function deleteSharedFile(name: string): void;
export declare function readSkillManual(name: any): {
    id: string;
    name: string;
    description: string;
    content: string;
    source: string;
    readOnly: boolean;
};
export declare function loadCustomSkills(): any[];
export declare function handleToolsAndMetricsApi(pathname: string, req: any, res: any, parsed: any): boolean;

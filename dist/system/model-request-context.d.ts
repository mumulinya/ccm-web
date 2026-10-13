export interface ModelRequestContext {
    purpose: string;
    requestClass: 'foreground_main' | 'auxiliary' | 'probe';
    executionOrigin: 'business' | 'test' | 'probe' | 'unknown';
    bindingMode: 'session' | 'stateless';
    scope: string;
    scopeId: string;
    sessionId?: string;
    ownerId: string;
    credentialBoundaryChecksum: string;
}
export declare function statelessModelRequestContext(config: any, input: {
    purpose: string;
    scope: string;
    scopeId: string;
}): ModelRequestContext;
/** Normalize trusted caller metadata only. Never infer identity from prompt text. */
export declare function resolveModelRequestContext(config?: any, options?: any): {
    context: ModelRequestContext | null;
    binding: any;
    preserveWire: boolean;
};
export declare function attachModelRequestContext(config: any, options: any): any;
export declare function modelCacheContextProjection(options: any): {
    execution_origin: any;
    binding_mode: any;
    cache_preparation_status: any;
    cache_eligibility: any;
    cache_eligibility_reason: any;
    contentStored: boolean;
};

import { z } from "zod";
export declare const TEST_AGENT_CONTRACT_IDS: {
    readonly workOrder: "ccm-test-agent-work-order-v1";
    readonly report: "ccm-test-agent-report-v1";
};
export declare const TestAgentOptionsContractSchema: z.ZodObject<{
    artifactDir: z.ZodOptional<z.ZodString>;
    commandTimeoutMs: z.ZodOptional<z.ZodNumber>;
    browserTimeoutMs: z.ZodOptional<z.ZodNumber>;
    httpTimeoutMs: z.ZodOptional<z.ZodNumber>;
    startupTimeoutMs: z.ZodOptional<z.ZodNumber>;
    maxOutputChars: z.ZodOptional<z.ZodNumber>;
    maxHttpResourceChecks: z.ZodOptional<z.ZodNumber>;
    failOnConsoleError: z.ZodOptional<z.ZodBoolean>;
    failOnHttpResourceError: z.ZodOptional<z.ZodBoolean>;
    verificationOnly: z.ZodOptional<z.ZodBoolean>;
    browserProvider: z.ZodOptional<z.ZodEnum<["auto", "playwright", "mcp", "none"]>>;
    autoDiscoverVerificationCommands: z.ZodOptional<z.ZodBoolean>;
    collectBrowserArtifacts: z.ZodOptional<z.ZodBoolean>;
    collectBrowserVideo: z.ZodOptional<z.ZodBoolean>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    artifactDir: z.ZodOptional<z.ZodString>;
    commandTimeoutMs: z.ZodOptional<z.ZodNumber>;
    browserTimeoutMs: z.ZodOptional<z.ZodNumber>;
    httpTimeoutMs: z.ZodOptional<z.ZodNumber>;
    startupTimeoutMs: z.ZodOptional<z.ZodNumber>;
    maxOutputChars: z.ZodOptional<z.ZodNumber>;
    maxHttpResourceChecks: z.ZodOptional<z.ZodNumber>;
    failOnConsoleError: z.ZodOptional<z.ZodBoolean>;
    failOnHttpResourceError: z.ZodOptional<z.ZodBoolean>;
    verificationOnly: z.ZodOptional<z.ZodBoolean>;
    browserProvider: z.ZodOptional<z.ZodEnum<["auto", "playwright", "mcp", "none"]>>;
    autoDiscoverVerificationCommands: z.ZodOptional<z.ZodBoolean>;
    collectBrowserArtifacts: z.ZodOptional<z.ZodBoolean>;
    collectBrowserVideo: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    artifactDir: z.ZodOptional<z.ZodString>;
    commandTimeoutMs: z.ZodOptional<z.ZodNumber>;
    browserTimeoutMs: z.ZodOptional<z.ZodNumber>;
    httpTimeoutMs: z.ZodOptional<z.ZodNumber>;
    startupTimeoutMs: z.ZodOptional<z.ZodNumber>;
    maxOutputChars: z.ZodOptional<z.ZodNumber>;
    maxHttpResourceChecks: z.ZodOptional<z.ZodNumber>;
    failOnConsoleError: z.ZodOptional<z.ZodBoolean>;
    failOnHttpResourceError: z.ZodOptional<z.ZodBoolean>;
    verificationOnly: z.ZodOptional<z.ZodBoolean>;
    browserProvider: z.ZodOptional<z.ZodEnum<["auto", "playwright", "mcp", "none"]>>;
    autoDiscoverVerificationCommands: z.ZodOptional<z.ZodBoolean>;
    collectBrowserArtifacts: z.ZodOptional<z.ZodBoolean>;
    collectBrowserVideo: z.ZodOptional<z.ZodBoolean>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentHttpAssertionContractSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    text: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    path: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodOptional<z.ZodString>;
    json_path: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    text: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    path: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodOptional<z.ZodString>;
    json_path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    text: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    path: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodOptional<z.ZodString>;
    json_path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    text: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    path: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodOptional<z.ZodString>;
    json_path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
    text: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodAny>;
    path: z.ZodOptional<z.ZodString>;
    jsonPath: z.ZodOptional<z.ZodString>;
    json_path: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentHttpCheckContractSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    httpMethod: z.ZodOptional<z.ZodString>;
    http_method: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUndefined]>>>;
    body: z.ZodOptional<z.ZodAny>;
    json: z.ZodOptional<z.ZodAny>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    httpMethod: z.ZodOptional<z.ZodString>;
    http_method: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUndefined]>>>;
    body: z.ZodOptional<z.ZodAny>;
    json: z.ZodOptional<z.ZodAny>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    httpMethod: z.ZodOptional<z.ZodString>;
    http_method: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUndefined]>>>;
    body: z.ZodOptional<z.ZodAny>;
    json: z.ZodOptional<z.ZodAny>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    httpMethod: z.ZodOptional<z.ZodString>;
    http_method: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUndefined]>>>;
    body: z.ZodOptional<z.ZodAny>;
    json: z.ZodOptional<z.ZodAny>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    method: z.ZodOptional<z.ZodString>;
    httpMethod: z.ZodOptional<z.ZodString>;
    http_method: z.ZodOptional<z.ZodString>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodUndefined]>>>;
    body: z.ZodOptional<z.ZodAny>;
    json: z.ZodOptional<z.ZodAny>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        statusCode: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        status_code: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodArray<z.ZodNumber, "many">]>>;
        text: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodAny>;
        path: z.ZodOptional<z.ZodString>;
        jsonPath: z.ZodOptional<z.ZodString>;
        json_path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentBrowserActionContractSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keyText: z.ZodOptional<z.ZodString>;
    key_text: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    bundleId: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keyText: z.ZodOptional<z.ZodString>;
    key_text: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    bundleId: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keyText: z.ZodOptional<z.ZodString>;
    key_text: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    bundleId: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keyText: z.ZodOptional<z.ZodString>;
    key_text: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    bundleId: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    url: z.ZodOptional<z.ZodString>;
    href: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    keyText: z.ZodOptional<z.ZodString>;
    key_text: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>]>>;
    direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
    amount: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    bundleId: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        displayName: z.ZodOptional<z.ZodString>;
        display_name: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentBrowserAssertionContractSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    key: z.ZodOptional<z.ZodString>;
    storageKey: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    js: z.ZodOptional<z.ZodString>;
    javascript: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    key: z.ZodOptional<z.ZodString>;
    storageKey: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    js: z.ZodOptional<z.ZodString>;
    javascript: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    key: z.ZodOptional<z.ZodString>;
    storageKey: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    js: z.ZodOptional<z.ZodString>;
    javascript: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    key: z.ZodOptional<z.ZodString>;
    storageKey: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    js: z.ZodOptional<z.ZodString>;
    javascript: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    css: z.ZodOptional<z.ZodString>;
    locator: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodAny>;
    value: z.ZodOptional<z.ZodAny>;
    key: z.ZodOptional<z.ZodString>;
    storageKey: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    js: z.ZodOptional<z.ZodString>;
    javascript: z.ZodOptional<z.ZodString>;
    testId: z.ZodOptional<z.ZodString>;
    test_id: z.ZodOptional<z.ZodString>;
    dataTestId: z.ZodOptional<z.ZodString>;
    data_testid: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    ariaLabel: z.ZodOptional<z.ZodString>;
    aria_label: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    accessibleName: z.ZodOptional<z.ZodString>;
    accessible_name: z.ZodOptional<z.ZodString>;
    altText: z.ZodOptional<z.ZodString>;
    alt_text: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    exact: z.ZodOptional<z.ZodBoolean>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentBrowserCheckContractSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    steps: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    adversarial: z.ZodOptional<z.ZodBoolean>;
    probe: z.ZodOptional<z.ZodBoolean>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentBrowserProbeTemplateContractSchema: z.ZodEffects<z.ZodObject<{
    kind: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    template: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    submit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    target: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    repeat: z.ZodOptional<z.ZodNumber>;
    expectedText: z.ZodOptional<z.ZodString>;
    expected_text: z.ZodOptional<z.ZodString>;
    expectedUrlIncludes: z.ZodOptional<z.ZodString>;
    expected_url_includes: z.ZodOptional<z.ZodString>;
    setupActions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    setup_actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    stateAssertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    state_assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    kind: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    template: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    submit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    target: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    repeat: z.ZodOptional<z.ZodNumber>;
    expectedText: z.ZodOptional<z.ZodString>;
    expected_text: z.ZodOptional<z.ZodString>;
    expectedUrlIncludes: z.ZodOptional<z.ZodString>;
    expected_url_includes: z.ZodOptional<z.ZodString>;
    setupActions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    setup_actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    stateAssertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    state_assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    kind: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    template: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    submit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    target: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    repeat: z.ZodOptional<z.ZodNumber>;
    expectedText: z.ZodOptional<z.ZodString>;
    expected_text: z.ZodOptional<z.ZodString>;
    expectedUrlIncludes: z.ZodOptional<z.ZodString>;
    expected_url_includes: z.ZodOptional<z.ZodString>;
    setupActions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    setup_actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    stateAssertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    state_assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
    kind: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    template: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    submit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    target: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    repeat: z.ZodOptional<z.ZodNumber>;
    expectedText: z.ZodOptional<z.ZodString>;
    expected_text: z.ZodOptional<z.ZodString>;
    expectedUrlIncludes: z.ZodOptional<z.ZodString>;
    expected_url_includes: z.ZodOptional<z.ZodString>;
    setupActions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    setup_actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    stateAssertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    state_assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    kind: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    template: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    targetUrl: z.ZodOptional<z.ZodString>;
    target_url: z.ZodOptional<z.ZodString>;
    probeType: z.ZodOptional<z.ZodString>;
    probe_type: z.ZodOptional<z.ZodString>;
    screenshot: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        selector: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        exact: z.ZodOptional<z.ZodBoolean>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    submit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    target: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    repeat: z.ZodOptional<z.ZodNumber>;
    expectedText: z.ZodOptional<z.ZodString>;
    expected_text: z.ZodOptional<z.ZodString>;
    expectedUrlIncludes: z.ZodOptional<z.ZodString>;
    expected_url_includes: z.ZodOptional<z.ZodString>;
    setupActions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    setup_actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    actions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        url: z.ZodOptional<z.ZodString>;
        href: z.ZodOptional<z.ZodString>;
        key: z.ZodOptional<z.ZodString>;
        keyText: z.ZodOptional<z.ZodString>;
        key_text: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        coords: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        point: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        startCoordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        start_coordinate: z.ZodOptional<z.ZodUnion<[z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.ZodTypeAny, "passthrough">>]>>;
        direction: z.ZodOptional<z.ZodEnum<["up", "down", "left", "right"]>>;
        amount: z.ZodOptional<z.ZodNumber>;
        duration: z.ZodOptional<z.ZodNumber>;
        region: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        bundleId: z.ZodOptional<z.ZodString>;
        bundle_id: z.ZodOptional<z.ZodString>;
        apps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            displayName: z.ZodOptional<z.ZodString>;
            display_name: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            bundleId: z.ZodOptional<z.ZodString>;
            bundle_id: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
        waitUntil: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
        wait_until: z.ZodOptional<z.ZodEnum<["load", "domcontentloaded", "networkidle"]>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    expectations: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    stateAssertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    state_assertions: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, z.objectOutputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        css: z.ZodOptional<z.ZodString>;
        locator: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodAny>;
        value: z.ZodOptional<z.ZodAny>;
        key: z.ZodOptional<z.ZodString>;
        storageKey: z.ZodOptional<z.ZodString>;
        storage_key: z.ZodOptional<z.ZodString>;
        expression: z.ZodOptional<z.ZodString>;
        js: z.ZodOptional<z.ZodString>;
        javascript: z.ZodOptional<z.ZodString>;
        testId: z.ZodOptional<z.ZodString>;
        test_id: z.ZodOptional<z.ZodString>;
        dataTestId: z.ZodOptional<z.ZodString>;
        data_testid: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        ariaLabel: z.ZodOptional<z.ZodString>;
        aria_label: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        accessibleName: z.ZodOptional<z.ZodString>;
        accessible_name: z.ZodOptional<z.ZodString>;
        altText: z.ZodOptional<z.ZodString>;
        alt_text: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        timeoutMs: z.ZodOptional<z.ZodNumber>;
        timeout_ms: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export declare const TestAgentProjectTargetContractSchema: z.ZodTypeAny;
export declare const TestAgentWorkOrderContractSchema: z.ZodTypeAny;
export declare const TestAgentReportContractSchema: z.ZodObject<{
    schema: z.ZodLiteral<"ccm-test-agent-report-v1">;
    agent: z.ZodLiteral<"test-agent">;
    id: z.ZodString;
    workOrderId: z.ZodString;
    taskId: z.ZodString;
    groupId: z.ZodString;
    status: z.ZodEnum<["passed", "failed", "blocked", "partial"]>;
    recommendation: z.ZodEnum<["accept", "rework", "need_human"]>;
    summary: z.ZodString;
    startedAt: z.ZodString;
    finishedAt: z.ZodString;
    durationMs: z.ZodNumber;
    artifactDir: z.ZodString;
    requiredChecks: z.ZodArray<z.ZodString, "many">;
    commandResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    devServerResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    httpResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserToolCalls: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    requiredCheckCoverage: z.ZodArray<z.ZodObject<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    acceptanceCoverage: z.ZodArray<z.ZodObject<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    evidence: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    risks: z.ZodArray<z.ZodString, "many">;
    blockedReasons: z.ZodArray<z.ZodString, "many">;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    schema: z.ZodLiteral<"ccm-test-agent-report-v1">;
    agent: z.ZodLiteral<"test-agent">;
    id: z.ZodString;
    workOrderId: z.ZodString;
    taskId: z.ZodString;
    groupId: z.ZodString;
    status: z.ZodEnum<["passed", "failed", "blocked", "partial"]>;
    recommendation: z.ZodEnum<["accept", "rework", "need_human"]>;
    summary: z.ZodString;
    startedAt: z.ZodString;
    finishedAt: z.ZodString;
    durationMs: z.ZodNumber;
    artifactDir: z.ZodString;
    requiredChecks: z.ZodArray<z.ZodString, "many">;
    commandResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    devServerResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    httpResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserToolCalls: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    requiredCheckCoverage: z.ZodArray<z.ZodObject<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    acceptanceCoverage: z.ZodArray<z.ZodObject<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    evidence: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    risks: z.ZodArray<z.ZodString, "many">;
    blockedReasons: z.ZodArray<z.ZodString, "many">;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    schema: z.ZodLiteral<"ccm-test-agent-report-v1">;
    agent: z.ZodLiteral<"test-agent">;
    id: z.ZodString;
    workOrderId: z.ZodString;
    taskId: z.ZodString;
    groupId: z.ZodString;
    status: z.ZodEnum<["passed", "failed", "blocked", "partial"]>;
    recommendation: z.ZodEnum<["accept", "rework", "need_human"]>;
    summary: z.ZodString;
    startedAt: z.ZodString;
    finishedAt: z.ZodString;
    durationMs: z.ZodNumber;
    artifactDir: z.ZodString;
    requiredChecks: z.ZodArray<z.ZodString, "many">;
    commandResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    devServerResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    httpResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserResults: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed", "blocked", "skipped", "timed_out", "started", "already_running"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    browserToolCalls: z.ZodArray<z.ZodObject<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        status: z.ZodEnum<["passed", "failed"]>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    requiredCheckCoverage: z.ZodArray<z.ZodObject<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        check: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        missingReason: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    acceptanceCoverage: z.ZodArray<z.ZodObject<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        criterion: z.ZodString;
        status: z.ZodEnum<["verified", "not_verified", "unknown"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    evidence: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        status: z.ZodString;
        detail: z.ZodOptional<z.ZodString>;
        path: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    risks: z.ZodArray<z.ZodString, "many">;
    blockedReasons: z.ZodArray<z.ZodString, "many">;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        severity: z.ZodEnum<["error", "warning"]>;
        code: z.ZodString;
        message: z.ZodString;
        project: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
}, z.ZodTypeAny, "passthrough">>;
export type TestAgentWorkOrderContract = z.infer<typeof TestAgentWorkOrderContractSchema>;
export type TestAgentReportContract = z.infer<typeof TestAgentReportContractSchema>;

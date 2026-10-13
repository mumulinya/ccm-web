export declare function createGroupSourceInquiryContext(run: any, principal: any, projectIds: string[]): {
    run: any;
    principal: any;
    projectIds: string[];
};
export declare function groupDelegatedSourceTools(context: any): {
    definitions: {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: any;
        };
    }[];
    execute(requests: any[], signal?: AbortSignal): Promise<any[]>;
};

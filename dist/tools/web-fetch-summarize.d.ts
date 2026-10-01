export declare function assertWebFetchSummarizerConfigured(config?: any): any;
export declare function summarizeWebFetchPage(input: {
    title?: string;
    url: string;
    markdown: string;
    prompt: string;
}): Promise<string>;

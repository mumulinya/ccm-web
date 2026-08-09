export declare function configuredWebSearchProviders(): string[];
export declare function isWebSearchAvailable(): boolean;
export declare function inspectNotebook(root: string, args: any): {
    schema: string;
    path: string;
    notebookChecksum: string;
    metadata: {
        nbformat: any;
        nbformatMinor: any;
        kernel: any;
        language: any;
    };
    cells: any;
    totalCells: any;
    nextCursor: string;
    truncated: boolean;
    contentStored: boolean;
};
export declare function webFetch(args: any, allowBrowserFallback?: boolean): Promise<{
    schema: string;
    title: string;
    requestedUrl: string;
    finalUrl: string;
    contentType: string;
    text: string;
    citation: string;
    contentChecksum: string;
    truncated: boolean;
    contentStored: boolean;
}>;
export declare function webSearch(args: any): Promise<{
    schema: string;
    provider: any;
    queryChecksum: string;
    results: {
        title: string;
        finalUrl: string;
        publishedAt: string;
        excerpt: string;
        citation: string;
        contentChecksum: string;
        contentStored: boolean;
    }[];
    resultChecksum: string;
    contentStored: boolean;
}>;

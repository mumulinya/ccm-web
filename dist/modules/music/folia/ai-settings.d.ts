export declare const defaultAiEndpoint = "https://api.openai.com/v1/chat/completions";
export declare function normalizeFoliaAiEndpoint(input: string): string;
export declare function readFoliaAiConfig(owner: string): {
    mode: any;
    apiUrl: any;
    model: any;
    temperature: any;
    hasOpenAiKey: boolean;
    hasGeminiKey: boolean;
    revision: number;
};
export declare function saveFoliaAiConfig(owner: string, input: any): {
    mode: any;
    apiUrl: any;
    model: any;
    temperature: any;
    hasOpenAiKey: boolean;
    hasGeminiKey: boolean;
    revision: number;
};
export declare function foliaAiRuntimeConfig(owner: string, draft?: any): {
    apiKey: string;
    mode: any;
    apiUrl: any;
    model: any;
    temperature: any;
    hasOpenAiKey: boolean;
    hasGeminiKey: boolean;
    revision: number;
};

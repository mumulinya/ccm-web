export declare function account(owner: string, provider: string): any;
export declare function setAccount(owner: string, provider: string, fields: any): any;
export declare function hideProviderSecrets(owner: string, provider: string, input: any, cookieHint?: string): any;
export declare function foliaSessionReferences(owner: string): {
    [k: string]: {
        [k: string]: string;
    };
};
export declare function redactFoliaResponse(input: any): any;
export declare function revealProviderValue(owner: string, provider: string, value: any): any;

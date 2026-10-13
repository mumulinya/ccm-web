export declare function mergeTranscriptIngestion(existing: any[], incoming: any[], normalize: (raw: any) => any, onNew: (raw: any, message: any) => void): {
    messages: any[];
    changed: boolean;
    assistantAdded: boolean;
};

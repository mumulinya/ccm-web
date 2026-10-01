export declare const GROUP_SESSION_MEMORY_MODEL_TEMPLATE: string;
export declare function parseGroupSessionMemoryTemplate(content: any): {
    template: string;
    sections: (readonly [string, string])[];
    sectionCount: number;
    checksum: string;
};
export declare function validateGroupSessionMemoryCustomPrompt(content: any): string;
export declare function readGroupSessionMemoryCustomPromptProfile(scopeId?: string): {
    schema: string;
    scopeId: string;
    maxChars: number;
    source: string;
    configured: boolean;
    content: string;
    checksum: string;
    file: string;
    global: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error: string;
    };
    exactSession: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error: string;
    };
};
export declare function saveGroupSessionMemoryCustomPrompt(scopeId: string, content: any, options?: any): {
    schema: string;
    scopeId: string;
    maxChars: number;
    source: string;
    configured: boolean;
    content: string;
    checksum: string;
    file: string;
    global: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error: string;
    };
    exactSession: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        error: string;
    };
};
export declare function readGroupSessionMemoryCustomTemplateProfile(scopeId?: string): {
    schema: string;
    scopeId: string;
    maxChars: number;
    source: string;
    configured: boolean;
    content: string;
    checksum: string;
    sectionCount: number;
    file: string;
    global: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error: string;
    };
    exactSession: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error: string;
    };
};
export declare function saveGroupSessionMemoryCustomTemplate(scopeId: string, content: any, options?: any): {
    schema: string;
    scopeId: string;
    maxChars: number;
    source: string;
    configured: boolean;
    content: string;
    checksum: string;
    sectionCount: number;
    file: string;
    global: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error: string;
    };
    exactSession: {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error?: undefined;
    } | {
        present: boolean;
        content: string;
        file: string;
        checksum: string;
        sectionCount: number;
        error: string;
    };
};
export declare function inspectGroupSessionMemoryTemplateState(scopeId: string, content: any): {
    schema: string;
    scopeId: string;
    checked: boolean;
    templateOnly: boolean;
    source: string;
    checksum: string;
    sectionCount: number;
};

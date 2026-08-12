export type TransientModelBlock = {
    type: "image";
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: Buffer;
    label?: string;
} | {
    type: "text";
    text: string;
};
export declare const CCM_TRANSIENT_MODEL_BLOCKS: unique symbol;
export declare function attachTransientModelBlocks<T extends object>(value: T, blocks: TransientModelBlock[]): T;
export declare function transientModelBlocks(value: any): TransientModelBlock[];
export declare function collectTransientModelBlocks(values: any[]): TransientModelBlock[];

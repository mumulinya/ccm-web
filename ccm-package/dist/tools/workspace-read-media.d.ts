import { type TransientModelBlock } from "../system/transient-model-content";
export type TransientWorkspaceBlock = TransientModelBlock;
export declare function transientWorkspaceBlocks(value: any): TransientWorkspaceBlock[];
export declare function readWorkspaceImage(file: string, relativePath: string): Promise<{
    schema: string;
    toolContractVersion: number;
    type: string;
    path: string;
    mime_type: "image/gif" | "image/jpeg" | "image/png" | "image/webp";
    original_size: number;
    display_size: number;
    dimensions: {
        originalWidth: number;
        originalHeight: number;
        displayWidth: number;
        displayHeight: number;
    };
    checksum: string;
    truncated: boolean;
    safeReceipt: {
        kind: string;
        path: string;
        checksum: string;
        itemCount: number;
        truncated: boolean;
        contentStored: boolean;
    };
}>;
export declare function readWorkspacePdf(file: string, relativePath: string, pagesValue: any): Promise<{
    schema: string;
    toolContractVersion: number;
    type: string;
    path: string;
    total_pages: any;
    selected_pages: number[];
    pages: {
        page: number;
        text: string;
        imageAvailable: boolean;
    }[];
    checksum: string;
    truncated: boolean;
    safeReceipt: {
        kind: string;
        path: string;
        checksum: string;
        pageCount: number;
        truncated: boolean;
        contentStored: boolean;
    };
}>;
export declare function readWorkspaceNotebook(file: string, relativePath: string, args: any): Promise<{
    schema: string;
    toolContractVersion: number;
    type: string;
    path: string;
    metadata: {
        nbformat: any;
        nbformat_minor: any;
        kernel: any;
        language: any;
    };
    total_cells: any;
    offset: number;
    cells: any;
    next_cursor: string;
    truncated: boolean;
    checksum: string;
    safeReceipt: {
        kind: string;
        path: string;
        checksum: string;
        itemCount: any;
        truncated: boolean;
        contentStored: boolean;
    };
}>;

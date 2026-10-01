/** Maps explicit CCM prompt metadata to cache-stability classes. This keeps
 * scope-specific catalogs and loaded skills out of the shared public prefix;
 * no keyword inference is used for these explicit tags. */
export declare function explicitPromptBlockKind(message: any): string | null;

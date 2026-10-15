// The untyped authoring API: config builders that take any names, with references checked
// only at runtime by `defineConfig`. Import from here to opt out of `typed()` explicitly; the
// nodes and specs are the same, so both mix freely.
export * from "./define";
export * from "./path";
export type * from "./types";

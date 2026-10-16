// Package root. The config and spec builders plus path resolution live here; the node types
// and helper constructors are under the `./ast` entry point, and the schema types under
// `./types`.
export * from "./define";
export { inlineStyles, mergeStyles } from "./inline";
export * from "./motion";
export * from "./path";
export * from "./state-attributes";
export * from "./typed";
export type * from "./types";

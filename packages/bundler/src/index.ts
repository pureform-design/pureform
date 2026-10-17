// The pureform bundler plugin over `@pureform/generate`. Each bundler has its own subpath
// (`@pureform/bundler/vite`, `/rollup`, `/rolldown`, `/esbuild`, `/metro`); this entry has the
// unplugin instance and what they share.

export {
    describeResult,
    generateOptions,
    pruneOptions,
    REGISTRY_ID,
} from "./options";
export type { PruneOptions, PureformPluginOptions } from "./options";
export { describePruning, findUsage, scanUsage } from "./prune";
export type { Pruning, ScanOptions, ScanResult } from "./prune";
export { pureform, unpluginFactory } from "./plugin";

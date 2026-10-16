// The pureform bundler plugin over `@pureform/generate`. Each bundler has its own subpath
// (`@pureform/bundler/vite`, `/rollup`, `/rolldown`, `/esbuild`, `/metro`); this entry has the
// unplugin instance and what they share.

export { describeResult, generateOptions, REGISTRY_ID } from "./options";
export type { PureformPluginOptions } from "./options";
export { pureform, unpluginFactory } from "./plugin";

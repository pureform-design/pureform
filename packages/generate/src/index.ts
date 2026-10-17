// The build step the bundler plugin and the CLI share: load `pureform.config.ts`, ask the target's
// adapter for its factory modules, and write `.pureform/`. Adapters implement the codegen
// interface in their `/codegen` subpath.

export { defineCodegen, TARGET_PACKAGES } from "./adapter";
export type {
    CodegenAdapter,
    CodegenContext,
    CodegenOutput,
    CodegenVars,
    ComponentModule,
    ComponentShape,
    GeneratedFile,
    Platform,
    Target,
} from "./adapter";
export { loadConfig } from "./config";
export type { LoadConfigOptions, LoadedConfig } from "./config";
export { GenerateError, isGenerateError } from "./errors";
export type { GenerateErrorCode } from "./errors";
export { DEFAULT_OUT_DIR, generate } from "./generate";
export type { GenerateOptions, GenerateResult } from "./generate";
export {
    DECLARATIONS_FILE,
    INDEX_FILE,
    moduleSpecifier,
    registryDeclarations,
    registryIndex,
} from "./glue";
export type { GlueEntry } from "./glue";
export {
    GENERATED_MARK,
    hashOf,
    headerHash,
    isGenerated,
    stableStringify,
} from "./hash";
export {
    formatImportViolations,
    resolveRelative,
    scanConfigImports,
} from "./imports";
export type {
    ConfigImports,
    ImportRule,
    ImportRuleOptions,
    ImportViolation,
} from "./imports";
export { loadAdapter } from "./load-adapter";
export { assertGlue, missingGlueMessage } from "./missing";
export { VERSION } from "./package-version";
export { CONFIG_FILES, createGlueRunner, findConfigFile } from "./runner";
export type { GlueRunner } from "./runner";
export { compareVersions, satisfies } from "./semver";
export { componentShape } from "./shape";
export {
    BINDING_PACKAGES,
    checkTrain,
    CORE_TRAIN_PACKAGES,
    findInstalled,
} from "./train";
export type { InstalledPackage, TrainCheck, TrainProblem } from "./train";
export { keepsValue, narrowConfig, normalizeVariants } from "./usage";
export type { Usage, VariantUsage } from "./usage";
export { watchGlue } from "./watch";
export type { GlueWatcher, WatchGlueOptions } from "./watch";
export type { FileResult, FileStatus } from "./write";

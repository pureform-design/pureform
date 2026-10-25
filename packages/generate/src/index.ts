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
export { entryFile, generateTargets, OUTPUT_ENV, targetsOf } from "./targets";
export type {
    CodegenTargets,
    EntryTarget,
    GenerateTargetsOptions,
    GenerateTargetsResult,
    OutputKind,
    TargetOptions,
    TargetResult,
} from "./targets";
export type { GenerateOptions, GenerateResult } from "./generate";
export {
    DECLARATIONS_FILE,
    INDEX_FILE,
    moduleSpecifier,
    registryDeclarations,
    registryIndex,
} from "./registry-index";
export type { GeneratedEntry } from "./registry-index";
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
export { assertGenerated, missingOutputMessage } from "./missing";
export { VERSION } from "./package-version";
export { CONFIG_FILES, createGenerateRunner, findConfigFile } from "./runner";
export type { GenerateRunner } from "./runner";
export { compareVersions, satisfies } from "./semver";
export { componentShape } from "./shape";
export {
    BINDING_PACKAGES,
    checkVersions as checkTrain,
    CORE_PACKAGES as CORE_TRAIN_PACKAGES,
    findInstalled,
} from "./version-check";
export type {
    InstalledPackage,
    VersionCheck,
    VersionProblem,
} from "./version-check";
export { keepsValue, narrowConfig, normalizeVariants } from "./usage";
export type { Usage, VariantUsage } from "./usage";
export { watchGenerate } from "./watch";
export type { GenerateWatcher, WatchGenerateOptions } from "./watch";
export type { FileResult, FileStatus } from "./write";

// The `pureform` command (its bin is `src/cli/index.ts`), and its parts for tools that run it
// in-process.

export { CliError } from "./errors";
export { describeError, runGenerate } from "./generate";
export type { CliIO } from "./generate";
export { gitignoreHint } from "./gitignore";
export {
    findCodegenFile,
    CODEGEN_FILES,
    loadCodegenOptions,
    resolveCodegenOptions,
    TARGETS,
} from "./codegen-file";
export type {
    GenerateFlags,
    CodegenFileOptions,
    ResolvedCodegenOptions,
} from "./codegen-file";
export { VERSION } from "./package-version";
export { GENERATE_USAGE, main, parseGenerateFlags, USAGE } from "./program";

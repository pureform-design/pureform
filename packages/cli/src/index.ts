// The `pureform` command (its bin is `src/cli/index.ts`), and its parts for tools that run it
// in-process.

export { CliError } from "./errors";
export { describeError, runGenerate } from "./generate";
export type { CliIO } from "./generate";
export { gitignoreHint } from "./gitignore";
export {
    findGlueFile,
    GLUE_FILES,
    loadGlue,
    resolveGlue,
    TARGETS,
} from "./glue";
export type { GenerateFlags, GlueOptions, ResolvedGlue } from "./glue";
export { VERSION } from "./package-version";
export { GENERATE_USAGE, main, parseGenerateFlags, USAGE } from "./program";

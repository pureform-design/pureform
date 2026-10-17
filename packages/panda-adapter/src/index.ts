// Public entry point for the Panda adapter: compile a pureform CoreConfig to a Panda preset.
export { compilePreset } from "./preset";
export { pandaContext, THEME_ATTRIBUTE } from "./options";
export type { CompileOptions } from "./options";
// The lowering the preset is built on, re-exported for existing imports.
export {
    compileConditional,
    compileNodeToCSS,
    compileStyleMap,
    compileValue,
    conditionKey,
    themeVars,
} from "@pureform/css-lowering";
export type { ThemeVarsOptions, VarPrefix } from "@pureform/css-lowering";

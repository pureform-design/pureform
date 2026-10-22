// Target-neutral CSS lowering shared by pureform's adapters: value nodes to CSS, conditions to
// selectors and at-rules, style maps to nested style objects, and runtime theme vars.
export { compileNodeToCSS } from "./compile-node";
export { compileConditional, compileValue, conditionKey } from "./conditions";
export type { CondObject } from "./conditions";
export {
    componentTokenVars,
    instanceSpringVars,
    instanceTokenVars,
    registeredProperties,
    slotAncestors,
    usesColorScheme,
} from "./config";
export type { RegisteredProperty } from "./config";
export type { LowerCtx, VarPrefix } from "./context";
export {
    KEYWORD_CSS,
    aliasTarget,
    formatColor,
    hyphenate,
    tokenVarName,
    varName,
    varTokenRef,
} from "./css";
export type { AliasTarget } from "./css";
export { REDUCED_MOTION_RULES, ROOT_REDUCED_MOTION_RULES } from "./motion";
export { themeVars } from "./runtime";
export {
    compileSpring,
    isSpringValue,
    springTokenVars,
    springVarNames,
    springTokenEntries,
    springTokenGroups,
    springVars,
} from "./spring";
export type { SpringVars } from "./spring";
export type { ThemeVarsOptions } from "./runtime";
export { compileStyleMap } from "./style-map";
export { compileTemplate, substituteArgs } from "./utilities";

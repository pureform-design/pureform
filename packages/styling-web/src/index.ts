// The web half of the style runtime that bindings and generated web factory modules use: the
// class factory's output types, instance tokens as CSS vars, the CSS adapter's class function,
// runtime CSS themes, and the registry with the target's theme attribute and var prefixes.
// Lowering a config's tokens to CSS vars is on the `@pureform/styling-web/theme-vars` subpath.
export { componentClasses } from "./component-classes";
export type {
    Choice,
    ComponentClasses,
    ComponentManifest,
} from "./component-classes";
export { createWebRegistry, webRegistry } from "./registry";
export type {
    AnyWebRegistry,
    ThemeAttributes,
    VarOptions,
    WebOptions,
    WebRegistry,
    WebRegistryOptions,
} from "./registry";
export {
    defineRuntimeTheme,
    isRuntimeTheme,
    preloadTheme,
    themeScope,
} from "./runtime-theme";
export type {
    AnyRuntimeTheme,
    CssVars,
    RuntimeTheme,
    ThemeGenerator,
    ThemeInput,
    ThemeSchemeVars,
    ThemeSource,
} from "./runtime-theme";
export { joinClasses, tokenStyle, withTokenStyle } from "./tokens";
export type { SpringVars, TokenVars } from "./tokens";
export type {
    ClassFactory,
    ClassSlots,
    SlotClasses,
    TokenStyle,
} from "./types";

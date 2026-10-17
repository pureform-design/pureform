// Public entry point for the CSS adapter: compile a pureform CoreConfig to plain CSS, and its
// components to class name functions.
export { compileCss } from "./stylesheet";
export { DEFAULT_THEME_ATTRIBUTE, themeAttributeOf } from "./options";
export type { CssOptions } from "./options";
export { manifestOf, classesFor } from "./classes";
export type { ClassesFor, SlotsOf, VariantsOf } from "./classes";
export { componentClasses } from "./runtime";
export type { Choice, ComponentClasses, ComponentManifest } from "./runtime";

// Public entry point for the CSS adapter: compile a pureform CoreConfig to plain CSS, and its
// components to class name functions.
export { compileCss } from "./stylesheet";
export type { CssOptions } from "./options";
export { manifestOf, recipes } from "./recipes";
export type { Recipes, SlotsOf, VariantsOf } from "./recipes";
export { recipe } from "./runtime";
export type { Choice, RecipeFn, RecipeManifest } from "./runtime";

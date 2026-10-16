// Runtime theming: a config's tokens as the CSS vars the components read. The lowering lives in
// `@pureform/css-lowering`; this subpath gives bindings one runtime package to import it from,
// and keeps it out of the root entry, which React Native shares.
export { themeVars } from "@pureform/css-lowering";
export type { ThemeVarsOptions } from "@pureform/css-lowering";

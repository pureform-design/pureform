// Runtime theming: a config's tokens as the CSS vars the components read, and a token's var by
// its path. The lowering lives in `@pureform/css-lowering`; this subpath gives bindings and theme
// generators one runtime package to import it from, and keeps the config lowering out of the
// root entry, which generated factory modules import.

import { aliasTarget, tokenVarName, varName } from "@pureform/css-lowering";

import type { VarOptions } from "./registry";

export { themeVars } from "@pureform/css-lowering";
export type { ThemeVarsOptions } from "@pureform/css-lowering";

const FLAT = new Set(["fonts", "durations", "easings", "zIndices"]);

/** The CSS var a token path names, under the target's prefixes: `"colors.primary"` is
 *  `--colors-primary`, `"components.button.container"` is `--pf-components-button-container`
 *  with `prefix: "pf"`, and `"fonts.plain"` is `--fonts-plain`. Paths are React Native's override
 *  keys: a token's group and name, `components.<component>.<token>`, or a flat tier and name. A
 *  name that's already a var (`--brand`) comes back as is; a path with one segment gives
 *  `undefined`. */
export const tokenVar = (
    path: string,
    vars: VarOptions = {},
): `--${string}` | undefined => {
    if (path.startsWith("--")) return path as `--${string}`;
    const [head, ...rest] = path.split(".");
    if (!head || rest.length === 0) return undefined;
    if (head === "components") {
        return varName(["components", ...rest], vars.prefix) as `--${string}`;
    }
    const target = aliasTarget(
        FLAT.has(head) ? [head, ...rest] : ["tokens", head, ...rest],
    );
    return target.kind === "token"
        ? (tokenVarName(target.ref, vars.tokenPrefix) as `--${string}`)
        : undefined;
};

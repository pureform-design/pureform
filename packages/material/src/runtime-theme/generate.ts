// The seed theme's generator, loaded on demand: Material's palette from the seed, lowered to the
// CSS vars the stylesheet's color tokens use, per scheme.

import type { CoreConfig } from "@pureform/core/types";
import type { CssVars, ThemeGenerator } from "@pureform/styling";
import { themeVars } from "@pureform/styling/theme-vars";
import { resolveTheme } from "@pureform/theme";

import {
    materialColor,
    materialElevation,
    materialLayout,
    materialMotion,
    materialShape,
    materialState,
    materialTypescale,
} from "../providers";
import type { SeedThemeInput } from "./index";

// Numbers in a value, rounded to 10 significant digits. The color math gives slightly different
// last digits in different engines (Node and Chromium), and the server's block and the client's
// must match; 10 digits are still far finer than a color can show.
const NUMBER = /-?\d*\.\d+(?:e[-+]?\d+)?/gi;

const rounded = (vars: CssVars): CssVars =>
    Object.fromEntries(
        Object.entries(vars).map(([name, value]) => [
            name,
            value.replace(NUMBER, (n) =>
                String(Number(Number(n).toPrecision(10))),
            ),
        ]),
    );

// The entries of `dark` whose value differs from `light`'s.
const darkOnly = (light: CssVars, dark: CssVars): CssVars =>
    Object.fromEntries(
        Object.entries(dark).filter(
            ([name, value]) => light[name as `--${string}`] !== value,
        ),
    );

/** Material's palette for a seed: every color token, and every color role (elevation tints
 *  too, which read the roles), so the roles declared at the root are declared again inside the
 *  theme and follow it. */
export const generateSeedTheme: ThemeGenerator<SeedThemeInput> = (
    input,
    vars,
) => {
    const theme = resolveTheme({
        color: materialColor({ ...input, space: "oklch" }),
        typography: materialTypescale(),
        shape: materialShape(),
        layout: materialLayout(),
        state: materialState(),
        motion: materialMotion(),
        elevation: materialElevation(),
    });
    const config: CoreConfig = {
        tokens: { colors: theme.config.tokens?.colors ?? {} },
        semanticTokens: { colors: theme.config.semanticTokens?.colors ?? {} },
        components: {},
    } as CoreConfig;
    const light = rounded(
        themeVars(config, { ...vars, scheme: "light" }) as CssVars,
    );
    const dark = rounded(
        themeVars(config, { ...vars, scheme: "dark" }) as CssVars,
    );
    return { light, dark: darkOnly(light, dark) };
};

export default generateSeedTheme;

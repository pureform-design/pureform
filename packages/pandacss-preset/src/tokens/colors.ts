import { defineSemanticTokens } from "@pandacss/dev";
import {
    ColorScheme,
    type BaseColorGroup,
    type ColorSchemeArgs,
} from "@repo/ui-utils";

export function defineColorSemanticTokens<
    TCustomColorGroups extends string = BaseColorGroup,
>(args: ColorSchemeArgs<TCustomColorGroups>) {
    const cs = ColorScheme.create(args);
    const light = cs.getAllHex("light");
    const dark = cs.getAllHex("dark");

    const tokens: Record<string, { value: { base: string; _dark: string } }> =
        {};

    for (const name of Object.keys(light) as (keyof typeof light)[]) {
        tokens[name] = {
            value: {
                base: light[name],
                _dark: dark[name],
            },
        };
    }

    return defineSemanticTokens.colors(tokens);
}

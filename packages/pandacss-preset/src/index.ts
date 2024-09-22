import { definePreset } from "@pandacss/dev";
import type {
    BaseColorGroup,
    BaseTextStyleName,
    ColorSchemeArgs,
    TextStyleArgs,
} from "@repo/ui-utils";
import { defineColorSemanticTokens } from "./colors";
import { type DefineTextStylesArgs, defineTextStyles } from "./text-styles";

type PresetArgs<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyles extends string = BaseTextStyleName,
> = {
    prefix?: string;
    colors: ColorSchemeArgs<TCustomColorGroups>;
    textStyles?: DefineTextStylesArgs<TCustomTextStyles>["custom"];
};

export function pureformPreset<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyleNames extends string = BaseTextStyleName,
>(args: PresetArgs<TCustomColorGroups, TCustomTextStyleNames>) {
    const semanticTokenColors = args.prefix
        ? {
              [args.prefix]: defineColorSemanticTokens(args.colors),
          }
        : defineColorSemanticTokens(args.colors);

    const textStyleArgs: DefineTextStylesArgs<
        TCustomTextStyleNames | BaseTextStyleName
    > = {};

    if (args.prefix) {
        textStyleArgs.prefix = args.prefix;
    }

    if (args.textStyles) {
        textStyleArgs.custom = args.textStyles as TextStyleArgs<
            TCustomTextStyleNames | BaseTextStyleName
        >["custom"];
    }

    return definePreset({
        presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
        name: "@pureform/pandacss-preset",
        theme: {
            extend: {
                textStyles: defineTextStyles(textStyleArgs),
                semanticTokens: {
                    colors: semanticTokenColors,
                },
            },
        },
    });
}

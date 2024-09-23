import { definePreset } from "@pandacss/dev";
import {
    ColorScheme,
    type BaseColorGroup,
    type BaseElevation,
    type BaseElevationArgs,
    type BaseTextStyleName,
    type ColorSchemeArgs,
    type TextStyleArgs,
} from "@repo/ui-utils";
import { defineColorSemanticTokens } from "./colors";
import { type DefineTextStylesArgs, defineTextStyles } from "./text-styles";
import {
    defineShadowElevationUtility,
    defineSurfaceElevationUtility,
    type DefineShadowElevationUtilityArgs,
    type DefineSurfaceElevationUtilityArgs,
} from "./utilities";
import { normalizePrefix } from "./helpers";

type PresetArgs<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyles extends string = BaseTextStyleName,
    TCustomElevation extends string = BaseElevation,
> = {
    prefix?: string;
    colors: ColorSchemeArgs<TCustomColorGroups>;
    textStyles?: DefineTextStylesArgs<TCustomTextStyles>["custom"];
    elevations?: BaseElevationArgs<TCustomElevation>["elevations"];
};

export function pureformPreset<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyleNames extends string = BaseTextStyleName,
    TCustomElevation extends string = BaseElevation,
>(
    args: PresetArgs<
        TCustomColorGroups,
        TCustomTextStyleNames,
        TCustomElevation
    >,
) {
    const normalPrefix = normalizePrefix(args.prefix);
    const semanticTokenColors = normalPrefix.tokenPrefix
        ? {
              [normalPrefix.tokenPrefix]: defineColorSemanticTokens(
                  args.colors,
              ),
          }
        : defineColorSemanticTokens(args.colors);

    const textStyleArgs: DefineTextStylesArgs<
        TCustomTextStyleNames | BaseTextStyleName
    > = {};

    if (args.textStyles) {
        textStyleArgs.custom = args.textStyles as TextStyleArgs<
            TCustomTextStyleNames | BaseTextStyleName
        >["custom"];
    }

    const colorScheme = ColorScheme.create(args.colors);

    const elevationConfig: Record<string, unknown> = {
        colorScheme,
    };

    const prefix = args.prefix;

    const utilPrefix = normalPrefix.utilityPrefix;

    if (prefix) {
        textStyleArgs.prefix = prefix;
        elevationConfig.prefix = prefix;
    }

    const elevations = args.elevations;
    if (elevations) {
        elevationConfig.elevations = elevations;
    }

    const elConfTyped = elevationConfig as DefineShadowElevationUtilityArgs<
        TCustomElevation,
        TCustomColorGroups
    >;

    return definePreset({
        presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
        name: "@pureform/pandacss-preset",
        utilities: {
            extend: {
                [utilPrefix
                    ? `${utilPrefix}ShadowElevation`
                    : "shadowElevation"]:
                    defineShadowElevationUtility(elConfTyped),

                [utilPrefix
                    ? `${utilPrefix}SurfaceElevation`
                    : "surfaceElevation"]:
                    defineSurfaceElevationUtility(elConfTyped),
            },
        },
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

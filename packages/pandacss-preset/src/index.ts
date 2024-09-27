import { definePreset } from "@pandacss/dev";
import {
    type BaseColorGroup,
    type BaseElevation,
    type BaseElevationArgs,
    type BaseTextStyleName,
    ColorScheme,
    type ColorSchemeArgs,
    type TextStyleArgs,
    Typography,
} from "@repo/ui-utils";
import { defineColorSemanticTokens } from "./tokens/colors";
import { normalizePrefix, prefix } from "./helpers";
import { type DefineTextStylesArgs, defineTextStyles } from "./text-styles";
import {
    type DefineShadowElevationUtilityArgs,
    defineShadowElevationUtility,
    defineSurfaceElevationUtility,
} from "./utilities";
import { defineButton, type DefineButtonArgs } from "./components";
import type { Prefix } from "./types";
import {
    defineStateContainer,
    type DefineStateContainerArgs,
} from "./components/state-container";
import { defineScrim, type DefineScrimArgs } from "./components/scrim";

type PresetArgs<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyles extends string = BaseTextStyleName,
    TCustomElevation extends string = BaseElevation,
> = {
    prefix?: Prefix;
    colors: ColorSchemeArgs<TCustomColorGroups>;
    textStyles?: DefineTextStylesArgs<TCustomTextStyles>["custom"];
    elevations?: BaseElevationArgs<TCustomElevation>["elevations"];
    components?: {
        button?: Omit<
            DefineButtonArgs<TCustomColorGroups, TCustomTextStyles>,
            "prefix" | "colorScheme" | "typography"
        >;
        state?: Omit<
            DefineStateContainerArgs<TCustomColorGroups>,
            "prefix" | "colorScheme"
        >;
        scrim?: Omit<
            DefineScrimArgs<TCustomColorGroups>,
            "prefix" | "colorScheme"
        >;
    };
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

    const pref = args.prefix;

    const utilPrefix = normalPrefix.utilityPrefix;

    const typography = Typography.create({
        custom: textStyleArgs.custom ?? {},
    });

    const buttonArgs = {
        ...(args?.components?.button ?? {}),
        colorScheme,
        typography,
    } as DefineButtonArgs<TCustomColorGroups, TCustomTextStyleNames>;

    const stateLayerArgs = {
        ...(args?.components?.state ?? {}),
        colorScheme,
    } as DefineStateContainerArgs<TCustomColorGroups>;

    const scrimArgs = {
        ...(args?.components?.scrim ?? {}),
        colorScheme,
    } as DefineScrimArgs<TCustomColorGroups>;

    if (pref) {
        textStyleArgs.prefix = pref;
        elevationConfig.prefix = pref;
        buttonArgs.prefix = pref;
        stateLayerArgs.prefix = pref;
        scrimArgs.prefix = pref;
    }

    const elevations = args.elevations;
    if (elevations) {
        elevationConfig.elevations = elevations;
    }

    const elConfTyped = elevationConfig as DefineShadowElevationUtilityArgs<
        TCustomElevation,
        TCustomColorGroups
    >;

    function getComponentName(name: string) {
        return prefix("camel", normalPrefix, name, "component");
    }

    const buttonName = getComponentName("button");
    const stateContainerName = getComponentName("stateContainer");
    const scrimName = getComponentName("scrim");

    return definePreset({
        presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
        name: "@pureform/pandacss-preset",
        globalCss: {
            "html, body": {
                fontSize: "16px",
            },
        },
        utilities: {
            [utilPrefix ? `${utilPrefix}ShadowElevation` : "shadowElevation"]:
                defineShadowElevationUtility(elConfTyped),

            [utilPrefix ? `${utilPrefix}SurfaceElevation` : "surfaceElevation"]:
                defineSurfaceElevationUtility(elConfTyped),
        },
        theme: {
            slotRecipes: {
                [buttonName]: defineButton(buttonArgs),
                [stateContainerName]: defineStateContainer(buttonArgs),
                [scrimName]: defineScrim(scrimArgs),
            },
            textStyles: defineTextStyles(textStyleArgs),
            semanticTokens: {
                colors: semanticTokenColors,
            },
        },
    });
}

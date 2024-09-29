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
} from "@pureform/ui-utils";
import { defineColorSemanticTokens } from "./tokens/colors";
import { normalizePrefix, prefix } from "./helpers";
import { type DefineTextStylesArgs, defineTextStyles } from "./text-styles";
import {
    type DefineShadowElevationUtilityArgs,
    defineShadowElevationUtility,
    defineSurfaceElevationUtility,
} from "./utilities";
import {
    defineButton,
    defineRippleLayer,
    type DefineButtonArgs,
    type DefineRippleLayerArgs,
} from "./components";
import type { Prefix } from "./types";
import {
    defineStateContainer,
    type DefineStateContainerArgs,
} from "./components/state-container";
import { defineScrim, type DefineScrimArgs } from "./components/scrim";
import {
    defineIconButton,
    type DefineIconButtonArgs,
} from "./components/icon-button";

type PresetArgs<
    TCustomColorGroups extends string = BaseColorGroup,
    TCustomTextStyles extends string = BaseTextStyleName,
    TCustomElevation extends string = BaseElevation,
> = {
    prefix?: Prefix;
    colors: ColorSchemeArgs<TCustomColorGroups>;
    typography?: DefineTextStylesArgs<TCustomTextStyles>["custom"];
    elevations?: BaseElevationArgs<TCustomElevation>["elevations"];
    components?: {
        button?: Omit<
            DefineButtonArgs<TCustomColorGroups, TCustomTextStyles>,
            "prefix" | "colorScheme" | "typography"
        >;
        iconButton?: Omit<
            DefineIconButtonArgs<TCustomColorGroups>,
            "prefix" | "colorScheme"
        >;
        stateContainer?: Omit<
            DefineStateContainerArgs<TCustomColorGroups>,
            "prefix" | "colorScheme"
        >;
        scrim?: Omit<
            DefineScrimArgs<TCustomColorGroups>,
            "prefix" | "colorScheme"
        >;
        ripple?: Omit<
            DefineRippleLayerArgs<TCustomColorGroups>,
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
    const np = normalizePrefix(args.prefix);
    const semanticTokenColors = np.tokenPrefix
        ? {
              [np.tokenPrefix]: defineColorSemanticTokens(args.colors),
          }
        : defineColorSemanticTokens(args.colors);

    const colorScheme = ColorScheme.create(args.colors);

    const elevationConfig: Record<string, unknown> = {
        colorScheme,
        prefix: np,
    };

    const utilPrefix = np.utilityPrefix;

    const textStyleArgs: DefineTextStylesArgs<
        TCustomTextStyleNames | BaseTextStyleName
    > = {
        prefix: np,
        custom: (args.typography ?? {}) as TextStyleArgs<
            TCustomTextStyleNames | BaseTextStyleName
        >["custom"],
    };

    const typography = Typography.create({
        custom: textStyleArgs.custom ?? {},
    });

    const buttonArgs = {
        ...(args?.components?.button ?? {}),
        colorScheme,
        typography,
        prefix: np,
    } as DefineButtonArgs<TCustomColorGroups, TCustomTextStyleNames>;

    const stateLayerArgs = {
        ...(args?.components?.stateContainer ?? {}),
        colorScheme,
        prefix: np,
    } as DefineStateContainerArgs<TCustomColorGroups>;

    const scrimArgs = {
        ...(args?.components?.scrim ?? {}),
        colorScheme,
        prefix: np,
    } as DefineScrimArgs<TCustomColorGroups>;

    const rippleArgs = {
        ...(args?.components?.ripple ?? {}),
        colorScheme,
        prefix: np,
    } as DefineRippleLayerArgs<TCustomColorGroups>;

    const elevations = args.elevations;
    if (elevations) {
        elevationConfig.elevations = elevations;
    }

    const elConfTyped = elevationConfig as DefineShadowElevationUtilityArgs<
        TCustomElevation,
        TCustomColorGroups
    >;

    function getRecipeName(name: string) {
        return prefix("camel", np, name, "component");
    }

    const buttonName = getRecipeName("button");
    const stateContainerName = getRecipeName("stateContainer");
    const iconButtonName = getRecipeName("iconButton");
    const scrimName = getRecipeName("scrim");
    const rippleLayerName = getRecipeName("rippleLayer");

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
                [stateContainerName]: defineStateContainer(stateLayerArgs),
                [scrimName]: defineScrim(scrimArgs),
                [iconButtonName]: defineIconButton(buttonArgs),
                [rippleLayerName]: defineRippleLayer(rippleArgs),
            },
            textStyles: defineTextStyles(textStyleArgs),
            semanticTokens: {
                colors: semanticTokenColors,
            },
        },
    });
}

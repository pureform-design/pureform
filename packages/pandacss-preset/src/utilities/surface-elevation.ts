import { defineUtility } from "@pandacss/dev";
import {
    type BaseColorGroup,
    type BaseElevation,
    type BaseElevationArgs,
    type ColorScheme,
    SurfaceElevations,
} from "@repo/ui-utils";
import { normalizePrefix } from "../helpers";
import type { Prefix } from "../types";

export type DefineSurfaceElevationUtilityArgs<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
> = BaseElevationArgs<TCustomElevation> & {
    colorScheme: ColorScheme<TCustomColorGroups>;
    prefix?: Prefix;
};

export function defineSurfaceElevationUtility<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
>(
    args: DefineSurfaceElevationUtilityArgs<
        TCustomElevation,
        TCustomColorGroups
    >,
) {
    const surface = SurfaceElevations.create(args.colorScheme, args);

    const values = Object.fromEntries(
        Object.entries(surface.allConfigs()).map(([key, value]) => [
            key,
            typeof value.pixel === "string" ? value.pixel : `${value.pixel}px`,
        ]),
    );

    const normalPrefix = normalizePrefix(args.prefix);

    return defineUtility({
        className: "surface-elevation",
        property: "backgroundColor",
        values,
        transform(value, { token }) {
            const primaryTokenKey = normalPrefix.tokenPrefix
                ? `colors.${normalPrefix.tokenPrefix}.primary`
                : "colors.primary";
            const surfaceTokenKey = normalPrefix.tokenPrefix
                ? `colors.${normalPrefix.tokenPrefix}.surface`
                : "colors.surface";

            const surfaceColor = token(surfaceTokenKey);
            const primaryColor = token(primaryTokenKey);
            const tintOverlayAlpha = surface.getTintAlphaAtPixel(value);

            const tintColorMix = `color-mix(in srgb, transparent ${100 - tintOverlayAlpha}%, ${primaryColor} ${tintOverlayAlpha}%)`;
            const tintImg = `linear-gradient(to bottom, ${tintColorMix}, ${tintColorMix})`;
            const surfaceImg = `linear-gradient(to bottom, ${surfaceColor}, ${surfaceColor})`;

            const background = `${tintImg}, ${surfaceImg}`;

            return {
                background,
            };
        },
    });
}

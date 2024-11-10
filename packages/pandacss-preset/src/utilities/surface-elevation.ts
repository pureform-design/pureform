import { defineUtility } from "@pandacss/dev";
import {
    type BaseColorGroup,
    type BaseElevation,
    type BaseElevationArgs,
    type ColorScheme,
    SurfaceElevations,
} from "@pureform/ui-utils";
import type { NormalPrefix } from "../types";
import { getToken } from "../helpers";

export type DefineSurfaceElevationUtilityArgs<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
> = BaseElevationArgs<TCustomElevation> & {
    colorScheme: ColorScheme<TCustomColorGroups>;
    prefix: NormalPrefix;
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

    const normalPrefix = args.prefix;

    return defineUtility({
        className: "surface-elevation",
        property: "backgroundColor",
        values,
        transform(value, { token }) {
            const primaryTokenKey = `colors.${getToken(normalPrefix, "primary")}`;
            const surfaceTokenKey = `colors.${getToken(normalPrefix, "surface")}`;

            const surfaceColor = token(surfaceTokenKey);
            const primaryColor = token(primaryTokenKey);
            const tintOverlayAlpha = surface.getTintAlphaAtPixel(value);

            const tintColorMix = `color-mix(in srgb, transparent ${100 - tintOverlayAlpha}%, ${primaryColor} ${tintOverlayAlpha}%)`;

            const backgroundColor = `color-mix(in srgb, ${surfaceColor}, ${tintColorMix})`;

            return {
                // backgroundColor: surface.getHexAtPixel(value, "light"),
                backgroundColor,
            };
        },
    });
}

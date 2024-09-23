import { defineUtility } from "@pandacss/dev";
import {
    type BaseColorGroup,
    type BaseElevation,
    type BaseElevationArgs,
    type ColorScheme,
    type ShadowElevation,
    ShadowElevations,
} from "@repo/ui-utils";
import { normalizePrefix } from "../helpers";
import type { Prefix } from "../types";

export type DefineShadowElevationUtilityArgs<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
> = BaseElevationArgs<TCustomElevation> & {
    colorScheme: ColorScheme<TCustomColorGroups>;
    prefix?: Prefix;
};

function boxShadow(
    se: ShadowElevation,
    umbraColor: string,
    penumbraColor: string,
    ambientColor: string,
) {
    const { umbra, penumbra, ambient } = se;

    const umbraBs = `${umbra.offsetX} ${umbra.offsetY} ${umbra.blurRadius} ${umbra.spreadRadius} ${umbraColor}`;
    const penumbraBs = `${penumbra.offsetX} ${penumbra.offsetY} ${penumbra.blurRadius} ${penumbra.spreadRadius} ${penumbraColor}`;
    const ambientBs = `${ambient.offsetX} ${ambient.offsetY} ${ambient.blurRadius} ${ambient.spreadRadius} ${ambientColor}`;

    return `${umbraBs}, ${penumbraBs}, ${ambientBs}`;
}

export function defineShadowElevationUtility<
    TCustomElevation extends string = BaseElevation,
    TCustomColorGroups extends string = BaseColorGroup,
>(
    args: DefineShadowElevationUtilityArgs<
        TCustomElevation,
        TCustomColorGroups
    >,
) {
    const shadow = ShadowElevations.create(args);

    const values = Object.fromEntries(
        Object.entries(shadow.allConfigs()).map(([key, value]) => [
            key,
            typeof value.pixel === "string" ? value.pixel : `${value.pixel}px`,
        ]),
    );

    const prefix = normalizePrefix(args.prefix);

    return defineUtility({
        className: "shadow-elevation",
        property: "boxShadow",
        values,
        transform(value, { utils }) {
            const px =
                typeof value === "number" ? value : Number.parseInt(value);

            const shadowColorKey = prefix.tokenPrefix
                ? `${prefix.tokenPrefix}.shadow`
                : "shadow";

            const shadowElevation = shadow.getAtPixel(px);
            const umbraColor = utils.colorMix(`${shadowColorKey}/20`);
            const penumbraColor = utils.colorMix(`${shadowColorKey}/14`);
            const ambientColor = utils.colorMix(`${shadowColorKey}/12`);
            const bs = boxShadow(
                shadowElevation,
                umbraColor.value,
                penumbraColor.value,
                ambientColor.value,
            );

            return {
                boxShadow: bs,
            };
        },
    });
}

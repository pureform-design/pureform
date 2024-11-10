import type { BaseColorGroup, ColorScheme } from "@pureform/ui-utils";
import type { NormalPrefix } from "../../types";
import { keyOf } from "@repo/utils";
import { getToken } from "../../helpers";

type ColorInfo = {
    name: string;
    token: string;
};

export function mapColors<
    TColorGroups extends string = BaseColorGroup,
    TMapped = unknown,
>(
    prefix: NormalPrefix,
    colorScheme: ColorScheme<TColorGroups>,
    mapper: (colorInfo: ColorInfo) => TMapped,
) {
    const info = colorScheme.getAllInfo();
    const keys = keyOf(info);

    return keys.map((key) =>
        mapper({
            name: key,
            token: getToken(prefix, key),
        }),
    );
}

export function opacityMix(color: string, opacity: number | `${number}%`) {
    if (typeof opacity === "number" && (opacity > 1 || opacity < 0)) {
        throw new Error(
            "Opacity must be between 0 and 1 or a percentage string",
        );
    }

    const pct = typeof opacity === "number" ? `${opacity * 100}%` : opacity;

    return `color-mix(in srgb, ${color} ${pct}, transparent)`;
}

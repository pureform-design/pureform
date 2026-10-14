// A hand-authored theme that fills every contract, for tests.

import {
    cubicBezier,
    fontFamily,
    hex,
    none,
    numeric,
    pct,
    px,
    rem,
    unitless,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";

import { NEUTRAL_ROLES, groupRoles } from "../contracts/color";
import type { ColorContract } from "../contracts/color";
import {
    DURATION_ROLES,
    EASING_ROLES,
    ELEVATION_LEVELS,
    SHAPE_ROLES,
    STATE_ROLES,
} from "../contracts/foundations";
import { BASE_TEXT_STYLES } from "../contracts/typography";
import type { TextStyleNode } from "../contracts/typography";
import {
    colorFromTokens,
    elevationFromTokens,
    motionFromTokens,
    shapeFromTokens,
    stateFromTokens,
    typographyFromTokens,
} from "../provider";

export const fill = <K extends string, V>(
    names: readonly K[],
    value: (name: K) => V,
) =>
    Object.fromEntries(names.map((name) => [name, value(name)])) as Record<
        K,
        V
    >;

export const GROUPS = ["primary", "danger"] as const;

export const colorRoles = fill(
    [...NEUTRAL_ROLES, ...GROUPS.flatMap(groupRoles)],
    (): ColorValue => hex("#808080"),
) as ColorContract<(typeof GROUPS)[number]>["roles"];

export const label: TextStyleNode = {
    font: "plain",
    fontSize: rem(0.875),
    lineHeight: rem(1.25),
    letterSpacing: rem(0),
    fontWeight: unitless(500),
};

export const providers = () => ({
    color: colorFromTokens({ groups: GROUPS, roles: colorRoles }),
    typography: typographyFromTokens({
        fonts: {
            brand: fontFamily(["Fraunces"], "serif"),
            plain: fontFamily(["Inter"], "sans-serif"),
        },
        styles: fill(BASE_TEXT_STYLES, () => label),
    }),
    shape: shapeFromTokens({ radii: fill(SHAPE_ROLES, () => px(4)) }),
    state: stateFromTokens({ opacities: fill(STATE_ROLES, () => pct(10)) }),
    motion: motionFromTokens({
        durations: fill(DURATION_ROLES, () => numeric(200, "ms")),
        easings: fill(EASING_ROLES, () => cubicBezier([0.2, 0, 0, 1])),
    }),
    elevation: elevationFromTokens({
        levels: fill(ELEVATION_LEVELS, () => ({ boxShadow: none })),
    }),
});

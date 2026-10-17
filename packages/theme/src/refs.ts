// References to contract names. Each resolves to the token the theme lowers that name to, so
// components never spell token paths themselves. The contract names autocomplete, and any other
// string is allowed for roles a provider adds.

import { alias } from "@pureform/core/ast";
import type { AliasNode } from "@pureform/core/ast";

import type { BaseColorGroup, ColorRole } from "./contracts/color";
import type {
    DurationRole,
    EasingRole,
    FocusIndicatorRole,
    ShapeRole,
    SizeRole,
    SpacingStep,
    StateRole,
} from "./contracts/foundations";
import type { BaseFontRole, BaseTextStyle } from "./contracts/typography";

/** Token paths per domain. The lowering and these references share them. */
export const PATHS = {
    color: ["semanticTokens", "colors"],
    primitive: ["tokens", "colors"],
    font: ["fonts"],
    textStyle: ["textStyles"],
    radius: ["tokens", "radii"],
    spacing: ["tokens", "spacing"],
    size: ["tokens", "sizes"],
    opacity: ["tokens", "opacity"],
    duration: ["durations"],
    easing: ["easings"],
    fontSize: ["tokens", "fontSize"],
    lineHeight: ["tokens", "lineHeight"],
    letterSpacing: ["tokens", "letterSpacing"],
    fontWeight: ["tokens", "fontWeight"],
    shadow: ["semanticTokens", "shadows"],
} as const;

/** The semantic color an elevation level's tint lowers to, for example `elevationTintLevel2`. */
export const elevationTintName = (level: string): string =>
    `elevationTint${level.charAt(0).toUpperCase()}${level.slice(1)}`;

/** An elevation level's tint color, which the elevation utilities draw over a surface. */
export const elevationTint = (level: string): AliasNode =>
    alias(...PATHS.color, elevationTintName(level));

/** The utility that applies an elevation level. */
export const ELEVATION_UTILITY = "shadowElevation";

/** The utility that applies an elevation level as drop shadows, which follow a clipped shape
 *  where a box shadow follows the box. It draws no tint. */
export const ELEVATION_FILTER_UTILITY = "filterElevation";

const ref =
    <N extends string>(path: readonly string[]) =>
    (name: N): AliasNode =>
        alias(...path, name);

/** A semantic color role, for example `colorRole("onSurface")`. */
export const colorRole = ref<ColorRole<BaseColorGroup> | (string & {})>(
    PATHS.color,
);
export const fontRole = ref<BaseFontRole | (string & {})>(PATHS.font);
export const textStyle = ref<BaseTextStyle | (string & {})>(PATHS.textStyle);
export const radius = ref<ShapeRole | (string & {})>(PATHS.radius);
export const spacing = ref<SpacingStep | (string & {})>(PATHS.spacing);
export const size = ref<SizeRole | (string & {})>(PATHS.size);
export const opacity = ref<StateRole | (string & {})>(PATHS.opacity);
/** One of the focus indicator's lengths: `focusIndicator("focusIndicatorThickness")`. The state
 *  contract declares them, and they lower beside the sizes. */
export const focusIndicator = ref<FocusIndicatorRole>(PATHS.size);
export const duration = ref<DurationRole | (string & {})>(PATHS.duration);
export const easing = ref<EasingRole | (string & {})>(PATHS.easing);

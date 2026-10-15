// The elevation, shape, state, and motion contracts.
//
// Each lists the names components read and the kind of value each must hold. A provider may
// add names beyond these, and they pass through as extra tokens.

import type {
    ColorValue,
    EasingNode,
    KeywordNode,
    NumericScalarNode,
    ShadowNode,
} from "@pureform/core/ast";

export const ELEVATION_LEVELS = [
    "level0",
    "level1",
    "level2",
    "level3",
    "level4",
    "level5",
] as const;

export type ElevationLevel = (typeof ELEVATION_LEVELS)[number];

/** One elevation level: a shadow and a tint over the surface. Every level sets both, so the
 *  CSS always has a rule for each and a theme can switch between shadow and tonal elevation
 *  at runtime. Use `none` for no shadow and `transparent` for no tint. */
export interface ElevationStyle {
    shadow: ShadowNode | KeywordNode<"none">;
    tint: ColorValue;
}

export interface ElevationContract {
    /** What `shadowElevation: "<level>"` applies. */
    levels: Record<ElevationLevel, ElevationStyle> &
        Record<string, ElevationStyle>;
}

export const SHAPE_ROLES = [
    "none",
    "extraSmall",
    "small",
    "medium",
    "large",
    "extraLarge",
    "full",
] as const;

export type ShapeRole = (typeof SHAPE_ROLES)[number];

export interface ShapeContract {
    /** Corner radii, as lengths. */
    radii: Record<ShapeRole, NumericScalarNode> &
        Record<string, NumericScalarNode>;
}

/** Spacing steps on a grid, keyed by multiple: `"4"` is four grid units. */
export const SPACING_STEPS = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "8",
    "10",
    "12",
    "16",
] as const;

export type SpacingStep = (typeof SPACING_STEPS)[number];

/** Component dimensions. `touchTarget` is the minimum interactive area, whatever the visible
 *  size. `densityOffset` is what density takes off a dense component's height: zero at the
 *  default density, negative when denser. */
export const SIZE_ROLES = [
    "iconSmall",
    "iconMedium",
    "controlSmall",
    "controlMedium",
    "controlLarge",
    "touchTarget",
    "densityOffset",
] as const;

export type SizeRole = (typeof SIZE_ROLES)[number];

/** Material's density steps: 0 is the default, and each step down takes one grid unit off a
 *  dense component's height. */
export const DENSITY_STEPS = [0, -1, -2, -3] as const;

export type DensityStep = (typeof DENSITY_STEPS)[number];

export interface LayoutContract {
    spacing: Record<SpacingStep, NumericScalarNode> &
        Record<string, NumericScalarNode>;
    sizes: Record<SizeRole, NumericScalarNode> &
        Record<string, NumericScalarNode>;
}

export const STATE_ROLES = [
    "stateHover",
    "stateFocus",
    "statePressed",
    "stateDragged",
    "disabledContainer",
    "disabledContent",
    "scrim",
] as const;

export type StateRole = (typeof STATE_ROLES)[number];

export interface StateContract {
    /** Opacities, as percentages: the state layer tints, the disabled strengths, and the
     *  scrim. */
    opacities: Record<StateRole, NumericScalarNode> &
        Record<string, NumericScalarNode>;
}

export const DURATION_ROLES = [
    "short1",
    "short2",
    "short3",
    "short4",
    "medium1",
    "medium2",
    "medium3",
    "medium4",
    "long1",
    "long2",
    "long3",
    "long4",
    "extraLong1",
    "extraLong2",
    "extraLong3",
    "extraLong4",
] as const;

export type DurationRole = (typeof DURATION_ROLES)[number];

export const EASING_ROLES = [
    "standard",
    "standardAccelerate",
    "standardDecelerate",
    "emphasized",
    "emphasizedAccelerate",
    "emphasizedDecelerate",
    "linear",
] as const;

export type EasingRole = (typeof EASING_ROLES)[number];

export interface MotionContract {
    /** Durations, in `ms` or `s`. */
    durations: Record<DurationRole, NumericScalarNode> &
        Record<string, NumericScalarNode>;
    easings: Record<EasingRole, EasingNode> & Record<string, EasingNode>;
}

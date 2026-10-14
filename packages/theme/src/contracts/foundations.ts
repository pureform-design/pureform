// The elevation, shape, state, and motion contracts.
//
// Each lists the names components read and the kind of value each must hold. A provider may
// add names beyond these, and they pass through as extra tokens.

import type {
    EasingNode,
    NumericScalarNode,
    StyleMap,
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

export interface ElevationContract {
    /** The styles `shadowElevation: "<level>"` applies: shadows, a tint, or both. */
    levels: Record<ElevationLevel, StyleMap> & Record<string, StyleMap>;
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

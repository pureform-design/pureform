// The color contract: the system colors components read, in Material's vocabulary.
//
// Every surface role is required, and each color group brings the four roles a tinted
// component needs. A provider may emit more roles (Material's fixed colors, `brand` aliases),
// and those pass through as extra semantic colors.

import type {
    ColorNode,
    ColorValue,
    ConditionalNode,
} from "@pureform/core/ast";

/** The surface and outline roles every color provider must fill. */
export const NEUTRAL_ROLES = [
    "surface",
    "surfaceDim",
    "surfaceBright",
    "surfaceContainerLowest",
    "surfaceContainerLow",
    "surfaceContainer",
    "surfaceContainerHigh",
    "surfaceContainerHighest",
    "onSurface",
    "surfaceVariant",
    "onSurfaceVariant",
    "inverseSurface",
    "inverseOnSurface",
    "outline",
    "outlineVariant",
    "scrim",
    "shadow",
] as const;

export type NeutralRole = (typeof NEUTRAL_ROLES)[number];

/** Material's color groups, which the Material color provider always fills. */
export const BASE_COLOR_GROUPS = [
    "primary",
    "secondary",
    "tertiary",
    "positive",
    "notice",
    "negative",
    "info",
] as const;

export type BaseColorGroup = (typeof BASE_COLOR_GROUPS)[number];

/** The four roles every color group fills. */
export type GroupRole<G extends string> =
    | G
    | `on${Capitalize<G>}`
    | `${G}Container`
    | `on${Capitalize<G>}Container`;

export type ColorRole<G extends string> = NeutralRole | GroupRole<G>;

/** A role's value: a color, or a conditional one such as `when("dark", dark, light)`. A role
 *  with a single value looks the same in both schemes. */
export type ColorRoleValue = ColorValue | ConditionalNode;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The role names of one color group, for example `primary`, `onPrimary`,
 *  `primaryContainer`, and `onPrimaryContainer`. */
export const groupRoles = <G extends string>(group: G): GroupRole<G>[] =>
    [
        group,
        `on${capitalize(group)}`,
        `${group}Container`,
        `on${capitalize(group)}Container`,
    ] as GroupRole<G>[];

export interface ColorContract<G extends string> {
    /** The color groups components offer through their `color` variant. */
    groups: readonly G[];
    /** Every role as a semantic color, plus any extra roles the provider adds. */
    roles: Record<ColorRole<NoInfer<G>>, ColorRoleValue> &
        Record<string, ColorRoleValue>;
    /** Primitive colors the roles alias, such as `primaryLight`. */
    primitives?: Record<string, ColorNode>;
}

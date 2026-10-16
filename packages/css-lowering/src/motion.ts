// Where the `reducedMotion` condition holds on the web: under the system's
// `prefers-reduced-motion` unless a provider around the element asks for full motion, or under
// a provider asking for reduced motion whatever the system says. Each rule is a path of
// at-rules and selectors from the styled element, as the color schemes' are, so an adapter
// expands the condition into every path.

import { MOTION_ATTRIBUTE } from "@pureform/core";

const REDUCE = `[${MOTION_ATTRIBUTE}=reduce]`;
const FULL = `[${MOTION_ATTRIBUTE}=full]`;
const SYSTEM = "@media (prefers-reduced-motion: reduce)";

/** The paths under which an element's motion is reduced. The nearer of two nested providers
 *  wins: a `full` provider inside a `reduce` one turns motion back on. */
export const REDUCED_MOTION_RULES: readonly (readonly string[])[] = [
    [SYSTEM, `&:not(${FULL} *)`],
    [`${REDUCE} &:not(${REDUCE} ${FULL} *)`],
];

/** The same paths for the root element's own rule, where the attribute sits on the root
 *  itself. */
export const ROOT_REDUCED_MOTION_RULES: readonly (readonly string[])[] = [
    [SYSTEM, `&:not(${FULL})`],
    [`&${REDUCE}`],
];

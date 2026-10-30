// Motion is inherited as a setting, not as the OS-resolved boolean: an explicit `system`
// provider resets an outer override without client JS, on the server too.
import {
    MOTION_ATTRIBUTE,
    MOTION_PROPERTY,
    REDUCED_MOTION_QUERY,
} from "@pureform/web-contracts";

const PROVIDER = `[${MOTION_ATTRIBUTE}]`;
const SYSTEM = `@media ${REDUCED_MOTION_QUERY}`;
const SAFE = "@media (prefers-reduced-motion: no-preference)";

/** Global CSS shared by the adapters. Reserved contract var, independent of token prefixes. */
export const MOTION_STYLES = Object.fromEntries(
    ["reduce", "full", "system"].map((setting) => [
        `[${MOTION_ATTRIBUTE}=${setting}]`,
        { [MOTION_PROPERTY]: setting },
    ]),
);

// Every ancestor is a style container by default, including display:contents providers.
// Its inherited setting is the nearest provider's, through arbitrary intervening elements.
// An element cannot query itself, so own-attribute paths take precedence over ancestor queries.
const motionRules = (
    setting: "reduce" | "full",
    media: string,
): readonly (readonly string[])[] => [
    [media, `&:not(${PROVIDER}, ${PROVIDER} *)`],
    [`@container style(${MOTION_PROPERTY}: ${setting})`, `&:not(${PROVIDER})`],
    [
        media,
        `@container style(${MOTION_PROPERTY}: system)`,
        `&:not(${PROVIDER})`,
    ],
    // Safari 18 cannot use the document element as a style container. Its direct children
    // need the same explicit-setting paths as providers themselves; deeper nodes inherit normally.
    [
        `&[${MOTION_ATTRIBUTE}=${setting}], :root[${MOTION_ATTRIBUTE}=${setting}] > &:not(${PROVIDER})`,
    ],
    [
        media,
        `&[${MOTION_ATTRIBUTE}=system], :root[${MOTION_ATTRIBUTE}=system] > &:not(${PROVIDER})`,
    ],
];

/** Where the nearest provider/OS requests reduced motion, at any nesting depth. */
export const REDUCED_MOTION_RULES = motionRules("reduce", SYSTEM);

/** The complementary effective setting for application motion-safe utilities. */
export const MOTION_SAFE_RULES = motionRules("full", SAFE);

/** The document root has no ancestor container: its own setting or the OS decides. */
export const ROOT_REDUCED_MOTION_RULES: readonly (readonly string[])[] = [
    [SYSTEM, `&:not([${MOTION_ATTRIBUTE}=full])`],
    [`&[${MOTION_ATTRIBUTE}=reduce]`],
];

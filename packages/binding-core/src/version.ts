// The development check that the runtime `@pureform/styling` matches the version the generated
// registry was made with: a mismatch means the registry is stale, or two copies of
// `@pureform/styling` are installed.

import { VERSION } from "@pureform/styling";

/** A warning when the registry's recorded train version differs from the running
 *  `@pureform/styling`'s, else `undefined`. A registry that recorded no version (a hand-made
 *  one, as in tests) passes. */
export const trainVersionMismatch = (
    registry: unknown,
    runtime: string = VERSION,
): string | undefined => {
    const recorded =
        typeof registry === "object" && registry !== null
            ? (registry as { version?: unknown }).version
            : undefined;
    if (typeof recorded !== "string" || recorded === runtime) return undefined;
    return `pureform: the generated registry in .pureform/ was made for core-train ${recorded}, but @pureform/styling ${runtime} is running. Run \`pureform generate\` (or restart the dev server with the pureform bundler plugin) to update it; if that doesn't help, two copies of @pureform/styling are installed.`;
};

// The development check that the runtime `@pureform/styling` matches the version the generated
// glue was made with: a mismatch means the glue is stale, or two copies of `@pureform/styling`
// are installed.

import { VERSION } from "@pureform/styling";

/** A warning when the registry's recorded train version differs from the running
 *  `@pureform/styling`'s, else `undefined`. A registry that recorded no version (a hand-made
 *  one, as in tests) passes. */
export const trainVersionMismatch = (
    registry: unknown,
    runtime: string = VERSION,
): string | undefined => {
    const glue =
        typeof registry === "object" && registry !== null
            ? (registry as { version?: unknown }).version
            : undefined;
    if (typeof glue !== "string" || glue === runtime) return undefined;
    return `pureform: the generated glue in .pureform/ was made for core-train ${glue}, but @pureform/styling ${runtime} is running. Run \`pureform generate\` (or restart the dev server with the pureform bundler plugin) to update the glue; if that doesn't help, two copies of @pureform/styling are installed.`;
};

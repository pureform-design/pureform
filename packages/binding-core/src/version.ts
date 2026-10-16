// The development check that the runtime `@pureform/styling` matches the version the generated
// glue was made with. Stub: nothing records that version yet; `@pureform/generate` (p4a) will
// write it into the glue, and this will compare.

/** A warning when the glue's recorded train version differs from the runtime's, else
 *  `undefined`. Always `undefined` until the generate phase (p4a) records the version. */
export const trainVersionMismatch = (registry: unknown): string | undefined => {
    void registry;
    return undefined;
};

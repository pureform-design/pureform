declare module "virtual:pureform-rn" {
    import type {
        PrecomputedStyles,
        RuntimeStyles,
    } from "@pureform/rn-adapter";

    export const precomputed: PrecomputedStyles;
    export const runtime: RuntimeStyles;
    /** Each brand's primary family, per scheme. */
    export const brands: Record<string, Overrides>;
}

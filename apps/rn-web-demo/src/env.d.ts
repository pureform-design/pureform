declare module "virtual:pureform-rn" {
    import type { Overrides, RuntimeStyles } from "@pureform/rn-adapter";

    /** Every component's styles, resolved at runtime. */
    export const runtime: RuntimeStyles;
    /** Each component's instance tokens by theme key. */
    export const runtimeTokens: Record<string, Record<string, string>>;
    /** Each brand's primary family, per scheme. */
    export const brands: Record<string, Overrides>;
}

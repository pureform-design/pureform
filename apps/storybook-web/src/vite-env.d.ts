declare module "virtual:pureform-rn" {
    import type { RuntimeStyles } from "@pureform/rn-adapter";
    export const runtime: RuntimeStyles;
    export const runtimeTokens: Record<
        string,
        Readonly<Record<string, string>>
    >;
}

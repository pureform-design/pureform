// Commands the browser tests run in Node: the preset's React Native styles, which the lowering
// computes in Node, and each component's instance token keys, as the generated registry holds
// them. The themed config adds named themes that each change one domain, as an app nests them.

import { materialColor, materialLayout } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { precompute } from "@pureform/rn-adapter";
import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { instanceTokenKeys } from "@pureform/rn-adapter/codegen";
import { roundedShape } from "@pureform/theme";
import type { BrowserCommand } from "vitest/node";

const DENSITIES = { default: 0, compact: -1 };

const CONFIGS = {
    default: pureform(),
    themed: pureform({
        layout: materialLayout({ densities: DENSITIES }),
        themes: {
            teal: { color: materialColor({ seed: "#006A60" }) },
            sharp: { shape: roundedShape({ base: 0 }) },
            compact: {
                layout: materialLayout({
                    densities: DENSITIES,
                    density: "compact",
                }),
            },
        },
    }),
};

/** The configs the tests' registries are generated from. */
export type TestConfig = keyof typeof CONFIGS;

const nativeStyles: BrowserCommand<
    [components: string[], config?: TestConfig]
> = (_context, components, config = "default") =>
    precompute(CONFIGS[config], { components, fontStack: "all" });

const tokenKeys: BrowserCommand<[components: string[], config?: TestConfig]> = (
    _context,
    components,
    config = "default",
) =>
    Object.fromEntries(
        components.map((name) => [
            name,
            instanceTokenKeys(
                name,
                (
                    CONFIGS[config].components as unknown as Record<
                        string,
                        never
                    >
                )[name]!,
            ),
        ]),
    );

// Emulated on the whole page.
const emulateReducedMotion: BrowserCommand<
    [value: "reduce" | "no-preference"]
> = (context, value) => context.page.emulateMedia({ reducedMotion: value });

export const commands = { nativeStyles, tokenKeys, emulateReducedMotion };

declare module "vitest/browser" {
    interface BrowserCommands {
        /** The preset's precomputed React Native styles for these components. */
        nativeStyles: (
            components: string[],
            config?: TestConfig,
        ) => Promise<PrecomputedStyles>;
        /** Each component's instance tokens by theme key. */
        tokenKeys: (
            components: string[],
            config?: TestConfig,
        ) => Promise<Record<string, Record<string, string>>>;
        /** Emulates `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
    }
}

// Commands the browser tests run in Node: the preset's React Native styles, which the lowering
// computes in Node, and each component's instance token keys, as the generated glue holds them.

import { pureform } from "@pureform/preset";
import { precompute } from "@pureform/rn-adapter";
import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { instanceTokenKeys } from "@pureform/rn-adapter/codegen";
import type { BrowserCommand } from "vitest/node";

const config = pureform();

const nativeStyles: BrowserCommand<[components: string[]]> = (
    _context,
    components,
) => precompute(config, { components, fontStack: "all" });

const tokenKeys: BrowserCommand<[components: string[]]> = (
    _context,
    components,
) =>
    Object.fromEntries(
        components.map((name) => [
            name,
            instanceTokenKeys(
                name,
                (config.components as unknown as Record<string, never>)[name]!,
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
        nativeStyles: (components: string[]) => Promise<PrecomputedStyles>;
        /** Each component's instance tokens by theme key. */
        tokenKeys: (
            components: string[],
        ) => Promise<Record<string, Record<string, string>>>;
        /** Emulates `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
    }
}

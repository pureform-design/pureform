// Commands the browser tests run in Node: compiling the adapters' stylesheets, since
// Tailwind's compiler needs Node.

import { compileCss } from "@pureform/css-adapter";
import type { CssOptions } from "@pureform/css-adapter";
import { precompute } from "@pureform/rn-adapter";
import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { compileTailwind } from "@pureform/tailwind-adapter";
import { compile } from "@tailwindcss/node";
import type { BrowserCommand } from "vitest/node";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import { RN_COMPONENTS } from "./rn-components";

/** The options both adapters take here. */
export type AdapterOptions = Pick<CssOptions, "prefix" | "themeAttribute">;

// Tailwind's own preflight is left out, so only its theme and the adapter's components apply
// over the page's reset.
const tailwind = async (options: AdapterOptions): Promise<string> => {
    const compiler = await compile(
        `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
${compileTailwind(pureformConfig, options)}`,
        { base: import.meta.dirname, onDependency: () => {} },
    );
    return compiler.build([]);
};

const ADAPTERS = {
    CSS: async (options: AdapterOptions) => compileCss(pureformConfig, options),
    Tailwind: tailwind,
};

export type Adapter = keyof typeof ADAPTERS;

const adapterCss: BrowserCommand<
    [adapter: Adapter, options: AdapterOptions]
> = (_context, adapter, options) => ADAPTERS[adapter](options);

const rnStyles: BrowserCommand<[]> = () =>
    precompute(pureformConfig, { components: RN_COMPONENTS, fontStack: "all" });

// Emulated on the whole page, so every frame in it follows.
const emulateReducedMotion: BrowserCommand<
    [value: "reduce" | "no-preference"]
> = (context, value) => context.page.emulateMedia({ reducedMotion: value });

export const commands = { adapterCss, rnStyles, emulateReducedMotion };

declare module "vitest/browser" {
    interface BrowserCommands {
        /** An adapter's stylesheet for the Panda fixture's config. */
        adapterCss: (
            adapter: Adapter,
            options: AdapterOptions,
        ) => Promise<string>;
        /** The React Native adapter's precomputed styles for the Panda fixture's config. */
        rnStyles: () => Promise<PrecomputedStyles>;
        /** Emulate `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
    }
}

// Commands the browser tests run in Node: compiling the adapters' stylesheets, since
// Tailwind's compiler needs Node.

import { compileCss } from "@pureform/css-adapter";
import type { CssOptions } from "@pureform/css-adapter";
import { compileTailwind } from "@pureform/tailwind-adapter";
import { compile } from "@tailwindcss/node";
import type { BrowserCommand } from "vitest/node";

import { pureformConfig } from "../../../apps/solid-demo/panda.pureform";

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

export const commands = { adapterCss };

declare module "vitest/browser" {
    interface BrowserCommands {
        /** An adapter's stylesheet for the demo's config. */
        adapterCss: (
            adapter: Adapter,
            options: AdapterOptions,
        ) => Promise<string>;
    }
}

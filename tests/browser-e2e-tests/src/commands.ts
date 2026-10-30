// Commands the browser tests run in Node: compiling the adapters' stylesheets, since
// Tailwind's compiler needs Node.

import { compileCss } from "@pureform/css-adapter";
import type { CssOptions } from "@pureform/css-adapter";
import { precompute } from "@pureform/rn-adapter";
import type { PrecomputedStyles } from "@pureform/rn-adapter";
import { instanceTokenKeys } from "@pureform/rn-adapter/codegen";
import { compileTailwind } from "@pureform/tailwind-adapter";
import { compile } from "@tailwindcss/node";
import type { BrowserCommand } from "vitest/node";

import pureformConfig from "../../panda-fixture/pureform.config";
import { RN_COMPONENTS } from "./rn-components";

/** The options both adapters take here. */
export type AdapterOptions = Pick<CssOptions, "prefix" | "themeAttribute">;

// Tailwind's own preflight is left out, so only its theme and the adapter's components apply
// over the page's reset.
const tailwind = async (
    options: AdapterOptions,
    candidates: string[] = [],
): Promise<string> => {
    const compiler = await compile(
        `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
${compileTailwind(pureformConfig, options)}`,
        { base: import.meta.dirname, onDependency: () => {} },
    );
    return compiler.build(candidates);
};

const ADAPTERS = {
    CSS: async (options: AdapterOptions) => compileCss(pureformConfig, options),
    Tailwind: tailwind,
};

export type Adapter = keyof typeof ADAPTERS;

const adapterCss: BrowserCommand<
    [adapter: Adapter, options: AdapterOptions, candidates?: string[]]
> = (_context, adapter, options, candidates) =>
    ADAPTERS[adapter](options, candidates);

const rnStyles: BrowserCommand<[components?: string[]]> = (
    _context,
    components = RN_COMPONENTS,
) => precompute(pureformConfig, { components, fontStack: "all" });

// Each component's instance tokens by theme key, as the generated registry holds them.
const rnTokenKeys: BrowserCommand<[components: string[]]> = (
    _context,
    components,
) =>
    Object.fromEntries(
        components.map((name) => [
            name,
            instanceTokenKeys(
                name,
                (pureformConfig.components as unknown as Record<string, never>)[
                    name
                ]!,
            ),
        ]),
    );

/** What the mouse does: moves to a point, goes down there, or comes up there. */
export type MouseAction = "move" | "down" | "up";

// The test's frame may sit anywhere in the page, and be scaled: a point in its viewport is
// placed in the page's.
const mouse: BrowserCommand<
    [action: MouseAction, x: number, y: number]
> = async (context, action, x, y) => {
    const box = await context.iframe.owner().boundingBox();
    const frame = await context.frame();
    const width = await frame.evaluate(() => window.innerWidth);
    if (!box) throw new Error("the test's frame has no box");
    const scale = box.width / width;
    await context.page.mouse.move(box.x + x * scale, box.y + y * scale);
    if (action === "down") await context.page.mouse.down();
    if (action === "up") await context.page.mouse.up();
};

// Emulated on the whole page, so every frame in it follows.
const emulateReducedMotion: BrowserCommand<
    [value: "reduce" | "no-preference"]
> = (context, value) => context.page.emulateMedia({ reducedMotion: value });

export const commands = {
    adapterCss,
    rnStyles,
    rnTokenKeys,
    emulateReducedMotion,
    mouse,
};

declare module "vitest/browser" {
    interface BrowserCommands {
        /** An adapter's stylesheet for the Panda fixture's config. */
        adapterCss: (
            adapter: Adapter,
            options: AdapterOptions,
            candidates?: string[],
        ) => Promise<string>;
        /** The React Native adapter's precomputed styles for the Panda fixture's config: the
         *  components the adapter covers, or these. */
        rnStyles: (components?: string[]) => Promise<PrecomputedStyles>;
        /** Each React Native component's instance tokens by theme key. */
        rnTokenKeys: (
            components: string[],
        ) => Promise<Record<string, Record<string, string>>>;
        /** The real mouse at a point in the test's viewport: it moves there, then goes down or
         *  up, as a user's would. */
        mouse: (action: MouseAction, x: number, y: number) => Promise<void>;
        /** Emulate `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
    }
}

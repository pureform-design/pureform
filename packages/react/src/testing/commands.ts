// Commands the browser tests run in Node, through Playwright.

import type { BrowserCommand } from "vitest/node";

// Emulated on the whole page.
const emulateReducedMotion: BrowserCommand<
    [value: "reduce" | "no-preference"]
> = (context, value) => context.page.emulateMedia({ reducedMotion: value });

export const commands = { emulateReducedMotion };

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Emulates `prefers-reduced-motion` on the page. */
        emulateReducedMotion: (
            value: "reduce" | "no-preference",
        ) => Promise<void>;
    }
}

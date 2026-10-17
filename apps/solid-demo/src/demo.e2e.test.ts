// A smoke test of the demo: its dev server renders the home page on the server, with Panda's
// styles, and the page hydrates in Chromium without an error.

import { chromium } from "playwright";
import type { Browser } from "playwright";
import { afterAll, beforeAll, expect, inject, it } from "vitest";

declare module "vitest" {
    interface ProvidedContext {
        /** The demo's dev server, started by `vitest-e2e-server.ts`. */
        demoUrl: string;
        /** A system Chromium to use instead of Playwright's download, or "". */
        chromiumPath: string;
    }
}

let browser: Browser | undefined;

beforeAll(async () => {
    const executablePath = inject("chromiumPath");
    browser = await chromium.launch(executablePath ? { executablePath } : {});
});

afterAll(() => browser?.close());

it("renders the home page on the server, styled, and hydrates it without errors", async () => {
    const page = await browser!.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });

    const response = await page.goto(inject("demoUrl"), {
        waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(200);
    // In the server's HTML, before any script runs.
    expect(await response!.text()).toContain('data-section="buttons"');
    const filled = page.locator('[data-section="buttons"] button').first();
    await filled.waitFor();
    // Transparent unless Panda's stylesheet applies.
    expect(
        await filled.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        ),
    ).not.toBe("rgba(0, 0, 0, 0)");
    expect(errors).toEqual([]);
});

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

it("switches the components page's indication, and shows a press on every component sharing a source", async () => {
    const page = await browser!.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(new URL("/components", inject("demoUrl")).href, {
        waitUntil: "networkidle",
    });
    const layers = () => page.locator("[data-ripple-layer]").count();
    expect(await layers()).toBeGreaterThan(0);

    const button = page.getByRole("button", { name: "Press me", exact: true });
    const chip = page.getByRole("button", { name: "Or me", exact: true });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect
        .poll(() =>
            chip.evaluate((element) => element.hasAttribute("data-pf-active")),
        )
        .toBe(true);
    await expect.poll(() => page.getByText("Pressed").count()).toBe(1);
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await page.getByRole("button", { name: "None", exact: true }).click();
    await expect.poll(layers).toBe(0);
    await page.getByRole("button", { name: "Material", exact: true }).click();
    await expect.poll(layers).toBeGreaterThan(0);
    expect(errors).toEqual([]);
});

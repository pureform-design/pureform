// A smoke test of the demo: its dev server renders the launcher and the budget app on the server,
// with Panda's styles, the pages hydrate in Chromium without an error, and the floating button's
// panel changes the settings, keeps them in a cookie the server renders from, and switches apps.

import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, expect, inject, it } from "vitest";

let browser: Browser | undefined;

const url = (path: string) => new URL(path, inject("demoUrl")).href;

beforeAll(async () => {
    const executablePath = inject("chromiumPath");
    // The global setup has compiled the pages, so each visit starts on a warm server.
    browser = await chromium.launch(executablePath ? { executablePath } : {});
});

afterAll(() => browser?.close());

/** A page that records every console error and uncaught exception. */
async function open(path: string): Promise<{ page: Page; errors: string[] }> {
    const page = await browser!.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url(path), { waitUntil: "networkidle" });
    return { page, errors };
}

const background = (page: Page, selector: string) =>
    page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor);

it("renders the launcher on the server, styled, and hydrates it without errors", async () => {
    // The server's HTML, before any script runs.
    const html = await (await fetch(url("/"))).text();
    expect(html).toContain('data-testid="launcher"');
    expect(html).toContain('href="/budget"');

    const { page, errors } = await open("/");
    // Transparent unless Panda's stylesheet applies.
    expect(await background(page, '[data-testid="launcher"]')).not.toBe(
        "rgba(0, 0, 0, 0)",
    );
    expect(
        await page.getByRole("link", { name: /Budget/ }).getAttribute("href"),
    ).toBe("/budget");
    expect(errors).toEqual([]);
    await page.close();
});

it("opens the budget app from the launcher, in its own layout", async () => {
    const { page, errors } = await open("/");
    await page.getByRole("link", { name: /Budget/ }).click();
    await page.waitForURL(url("/budget"));
    await expect
        .poll(() => page.getByRole("heading", { name: "Overview" }).count())
        .toBe(1);
    await expect.poll(() => page.getByTestId("balance").count()).toBe(1);
    // The navigation rail on a wide screen; the bar takes its place on a compact one.
    expect(
        await page.getByRole("navigation", { name: "Budget" }).count(),
    ).toBeGreaterThan(0);
    expect(
        await background(page, '[data-app-fab] [data-pf-part="container"]'),
    ).not.toBe("rgba(0, 0, 0, 0)");

    // Its pages are client routes under the same layout.
    await page
        .getByRole("navigation", { name: "Budget" })
        .getByRole("link", { name: "Transactions" })
        .first()
        .click();
    await page.waitForURL(url("/budget/transactions"));
    await expect
        .poll(() => page.getByRole("heading", { name: "Transactions" }).count())
        .toBe(1);
    expect(errors).toEqual([]);
    await page.close();
});

it("renders the transactions' first rows with the page and the rest after it, and filters hide them", async () => {
    // The count the summary line gives: "126 transactions, +$1,234.56 net".
    const counted = (text: string) =>
        Number(/(\d+)\u2069? transactions?/.exec(text)?.[1]);

    // The server renders the first screenful of rows, and says how many there are in all.
    const html = await (await fetch(url("/budget/transactions"))).text();
    const total = counted(html);
    const served =
        html.match(/data-scope="list-item" data-pf-part="root"/g)?.length ?? 0;
    expect(total).toBeGreaterThan(served);
    expect(served).toBeGreaterThan(0);

    const { page, errors } = await open("/budget");
    await page
        .getByRole("navigation", { name: "Budget" })
        .getByRole("link", { name: "Transactions" })
        .first()
        .click();
    await page.waitForURL(url("/budget/transactions"));
    const rows = page.locator("main section li");
    // Every row, and the list no longer busy.
    await expect.poll(() => rows.count()).toBe(total);
    await expect.poll(() => page.locator("main [aria-busy]").count()).toBe(0);
    expect(await page.locator("main li[aria-setsize]").count()).toBe(0);

    // A filter hides the rows it leaves out rather than removing them.
    const summary = page.getByText(/ transactions?, /);
    await page
        .getByRole("group", { name: "Show" })
        .getByText("Income", { exact: true })
        .click();
    await expect
        .poll(async () => counted(await summary.innerText()))
        .toBeLessThan(total);
    const income = counted(await summary.innerText());
    await expect
        .poll(() => rows.filter({ visible: true }).count())
        .toBe(income);
    expect(await rows.count()).toBe(total);
    await page
        .getByRole("group", { name: "Show" })
        .getByText("All", { exact: true })
        .click();
    await expect.poll(() => rows.filter({ visible: true }).count()).toBe(total);
    expect(errors).toEqual([]);
    await page.close();
});

it("changes the settings from the floating button, keeps them across a reload, and switches apps", async () => {
    const { page, errors } = await open("/budget");
    const html = page.locator("html");
    const layers = () => page.locator("[data-ripple-layer]").count();
    // The top app bar is drawn on the theme's surface.
    const canvas = () => background(page, "header");
    const light = await canvas();
    expect(await layers()).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Settings and apps" }).click();
    const panel = page.getByRole("dialog", { name: "Settings" });
    await panel.waitFor();
    await panel.getByRole("button", { name: "Dark", exact: true }).click();
    await expect.poll(() => html.getAttribute("class")).toBe("dark");
    await expect.poll(canvas).not.toBe(light);
    await panel.getByRole("button", { name: "None", exact: true }).click();
    await expect.poll(layers).toBe(0);

    // The server renders the stored settings: the scheme on <html>, no ripple layers.
    await page.reload({ waitUntil: "networkidle" });
    expect(await html.getAttribute("class")).toBe("dark");
    expect(await layers()).toBe(0);
    expect(await canvas()).not.toBe(light);

    await page.getByRole("button", { name: "Settings and apps" }).click();
    await panel.waitFor();
    await panel.getByRole("button", { name: "Reset" }).click();
    await expect.poll(() => html.getAttribute("class")).toBe("");
    await expect.poll(layers).toBeGreaterThan(0);

    await panel.getByRole("tab", { name: "Apps" }).click();
    await panel.getByRole("link", { name: /All apps/ }).click();
    await page.waitForURL(url("/"));
    await expect.poll(() => panel.isVisible()).toBe(false);
    await expect.poll(() => page.getByTestId("launcher").count()).toBe(1);
    expect(errors).toEqual([]);
    await page.close();
});

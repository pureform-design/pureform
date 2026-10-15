// Visual checks over the demo: a screenshot per section, plus measured layout rules that
// screenshots alone catch late (icons centered, labels that float without jumping, the focus
// ring on keyboard focus).

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const SECTIONS = [
    "intro",
    "themes",
    "buttons",
    "icon-buttons",
    "disabled-buttons",
    "cards",
    "scrim",
    "controls",
    "color-groups",
    "text-fields",
    "icon-fields-and-areas",
    "icons",
    "fabs",
    "chips",
    "lists",
    "tabs",
    "row-colors",
    "search-and-feedback",
    "progress",
    "navigation",
];

const open = async (page: Page) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // The dev server's toolbar floats over the page; it isn't part of the demo.
    await page.addStyleTag({
        content: "[data-solid-dev-toolbar] { display: none !important; }",
    });
};

test.describe("sections", () => {
    for (const name of SECTIONS) {
        test(`${name} looks the same`, async ({ page }) => {
            await open(page);
            const section = page.locator(`[data-section="${name}"]`);
            await expect(section).toHaveScreenshot(`${name}.png`, {
                animations: "disabled",
                caret: "hide",
            });
        });
    }
});

test("every icon slot centers its glyph", async ({ page }) => {
    await open(page);
    const offsets = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("[class]")]
            .filter((el) =>
                [...el.classList].some((c) =>
                    /^icon$|__(icon|\w+Icon|leading|trailing|itemLeading|itemTrailing)$/.test(
                        c,
                    ),
                ),
            )
            .filter((el) => el.textContent?.trim())
            .map((el) => {
                const box = el.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(el);
                const glyph = range.getBoundingClientRect();
                return {
                    name: el.className.split(" ")[0],
                    x:
                        glyph.left +
                        glyph.width / 2 -
                        (box.left + box.width / 2),
                    y:
                        glyph.top +
                        glyph.height / 2 -
                        (box.top + box.height / 2),
                };
            }),
    );
    expect(offsets.length).toBeGreaterThan(0);
    for (const { name, x, y } of offsets) {
        expect(Math.abs(x), `${name} x`).toBeLessThanOrEqual(1);
        expect(Math.abs(y), `${name} y`).toBeLessThanOrEqual(1);
    }
});

test("a text field's label floats to the same place on focus and with a value", async ({
    page,
}) => {
    await open(page);
    const field = page.locator('[data-section="text-fields"] input').first();
    const label = (await field.getAttribute("id"))!;
    const top = () =>
        page.evaluate((id) => {
            const l = document.querySelector(`label[for="${id}"]`)!;
            const c = l.parentElement!;
            return (
                l.getBoundingClientRect().top - c.getBoundingClientRect().top
            );
        }, label);
    const resting = await top();
    await field.focus();
    const focused = await top();
    await field.fill("value");
    await field.blur();
    const withValue = await top();
    expect(focused).toBeLessThan(resting);
    expect(withValue).toBe(focused);
});

test("keyboard focus shows the focus ring", async ({ page }) => {
    await open(page);
    const button = page.locator('[data-section="buttons"] button').first();
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outline = await button.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth];
    });
    expect(outline).toEqual(["solid", "3px"]);
});

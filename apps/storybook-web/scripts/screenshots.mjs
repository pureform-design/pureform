// Screenshots every component's Default story in every renderer, against a running Storybook:
// `node scripts/screenshots.mjs <url> [dir] [scheme] [theme]` writes `<dir>/sb-web-<component>-<renderer>.png`
// and prints what each canvas holds, with the page's errors.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:6006";
const dir = process.argv[3] ?? "/tmp/opencode";
const scheme = process.argv[4] ?? "light";
const theme = process.argv[5] ?? "default";
const components = ["button", "switch", "textfield"];
const renderers = ["solid", "react", "native"];

const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {},
);
const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
/** @type {string[]} */
const errors = [];
page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

for (const component of components) {
    for (const renderer of renderers) {
        await page.goto(
            `${base}/?path=/story/${component}--default&globals=renderer:${renderer};scheme:${scheme};theme:${theme}`,
        );
        const frame = page.frameLocator("#storybook-preview-iframe");
        await frame
            .locator(`[data-renderer=${renderer}] :is(button, input, [role])`)
            .first()
            .waitFor({ timeout: 60_000 });
        await page.waitForTimeout(500);
        const html = await frame
            .locator(`[data-renderer=${renderer}]`)
            .evaluate((el) => el.textContent ?? "");
        const suffix = `${scheme === "light" ? "" : `-${scheme}`}${theme === "default" ? "" : `-${theme}`}`;
        await page.screenshot({
            path: `${dir}/sb-web-${component}-${renderer}${suffix}.png`,
        });
        console.log(component, renderer, JSON.stringify(html.slice(0, 60)));
    }
}
console.log("errors", JSON.stringify(errors, null, 1));
await browser.close();

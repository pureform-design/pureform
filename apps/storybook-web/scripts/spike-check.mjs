// Spike check: against a running Storybook (`node scripts/spike-check.mjs <url> [screenshot dir]`),
// switches the toolbar renderer, screenshots each, and changes args through the channel.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:6007";
const shots = process.argv[3] ?? "/tmp/opencode";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on(
    "console",
    (m) => m.type() === "error" && errors.push(`console: ${m.text()}`),
);
page.on("frameattached", () => {});
await page.goto(`${base}/?path=/story/button--default`);
const frame = page.frameLocator("#storybook-preview-iframe");
const iframe = () => page.frames().find((f) => f.url().includes("iframe.html"));
await frame
    .locator("[data-renderer] button")
    .first()
    .waitFor({ timeout: 60000 });

const describe = async () =>
    iframe().evaluate(() => {
        const host = document.querySelector("[data-renderer]");
        const b = host?.querySelector("button, [role=button]");
        const cs = b && getComputedStyle(b);
        return {
            renderer: host?.dataset.renderer,
            text: b?.textContent,
            bg: cs?.backgroundColor,
            radius: cs?.borderRadius,
            height: cs?.height,
            stats: { ...globalThis.__sbStats },
        };
    });

const results = {};
for (const [value, title] of [
    ["solid", "Solid"],
    ["react", "React"],
    ["native", "React Native"],
    ["solid", "Solid"],
]) {
    await page
        .locator('[aria-label^="The binding the story renders with"]')
        .click();
    await page
        .locator("[role=listbox] [role=option]")
        .filter({ hasText: new RegExp(`^${title}$`) })
        .click();
    await iframe().waitForFunction(
        (v) =>
            document.querySelector(
                `[data-renderer=${v}] button, [data-renderer=${v}] [role=button]`,
            ),
        value,
    );
    await page.waitForTimeout(500);
    results[value] = await describe();
    await page.screenshot({ path: `${shots}/sb-spike-${value}.png` });
    console.log(value, JSON.stringify(results[value]));
}

// Controls: change the label and variant through the channel, as the Controls panel does, per renderer.
let n = 0;
for (const value of ["solid", "react", "native"]) {
    await iframe().evaluate(
        (v) =>
            globalThis.__STORYBOOK_ADDONS_CHANNEL__.emit("updateGlobals", {
                globals: { renderer: v },
            }),
        value,
    );
    await iframe().waitForFunction(
        (v) => document.querySelector(`[data-renderer=${v}] button`),
        value,
    );
    const before = (await describe()).stats;
    n++;
    await iframe().evaluate(
        (label) =>
            globalThis.__STORYBOOK_ADDONS_CHANNEL__.emit("updateStoryArgs", {
                storyId: "button--default",
                updatedArgs: { label, variant: "outlined" },
            }),
        `Changed ${n}`,
    );
    await page.waitForTimeout(800);
    const after = await describe();
    console.log("args", value, JSON.stringify({ before, after }));
}
console.log("errors", JSON.stringify(errors, null, 1));
await browser.close();

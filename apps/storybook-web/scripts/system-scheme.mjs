// Checks that the System scheme follows the OS live, against a running Storybook:
// `node scripts/system-scheme.mjs <url> [dir]`. For each renderer it flips Playwright's emulated
// `prefers-color-scheme` without reloading and reads the button's and the canvas's colors and the
// manager's sidebar; then forces Light and Dark and goes back to System through the toolbar's
// globals. Screenshots go to `<dir>/sb-web-system-<renderer>-<scheme>.png`. Exits 1 on a failure.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:6006";
const dir = process.argv[3] ?? "/tmp/opencode";
const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {},
);
const page = await browser.newPage({ viewport: { width: 1100, height: 560 } });
/** @type {string[]} */
const failures = [];
const check = (ok, message) => {
    console.log(ok ? "ok  " : "FAIL", message);
    if (!ok) failures.push(message);
};

const iframe = () => page.frames().find((f) => f.url().includes("iframe.html"));
const read = (renderer) =>
    iframe().evaluate((r) => {
        const host = document.querySelector(`[data-renderer=${r}]`);
        const button = host?.querySelector("button, [role=button]");
        return {
            button: button && getComputedStyle(button).backgroundColor,
            canvas: getComputedStyle(document.body).backgroundColor,
            classes: document.documentElement.className,
        };
    }, renderer);
const sidebar = () =>
    page.evaluate(
        () =>
            getComputedStyle(
                document.querySelector(".sidebar-container") ?? document.body,
            ).backgroundColor,
    );
const setGlobals = (globals) =>
    iframe().evaluate(
        (g) =>
            globalThis.__STORYBOOK_ADDONS_CHANNEL__.emit("updateGlobals", {
                globals: g,
            }),
        globals,
    );
/** Reads once the colors stop changing (components animate between schemes), up to 5 s. */
const settled = async (renderer) => {
    let last = await read(renderer);
    for (let i = 0; i < 25; i++) {
        await page.waitForTimeout(200);
        const now = await read(renderer);
        if (JSON.stringify(now) === JSON.stringify(last)) return now;
        last = now;
    }
    return last;
};
/** The manager's sidebar color once it differs from `before`, up to 3 s. */
const sidebarAfter = async (before) => {
    for (let i = 0; i < 30 && (await sidebar()) === before; i++)
        await page.waitForTimeout(100);
    return sidebar();
};

for (const renderer of ["solid", "react", "native"]) {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(
        `${base}/?path=/story/button--default&globals=renderer:${renderer}`,
    );
    await page
        .frameLocator("#storybook-preview-iframe")
        .locator(`[data-renderer=${renderer}] :is(button, [role=button])`)
        .first()
        .waitFor({ timeout: 60_000 });
    await page.waitForTimeout(300);
    const light = await settled(renderer);
    const lightBar = await sidebar();
    await page.screenshot({
        path: `${dir}/sb-web-system-${renderer}-light.png`,
    });
    check(
        light.classes === "",
        `${renderer}: System sets no scheme class (${JSON.stringify(light.classes)})`,
    );

    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await settled(renderer);
    const darkBar = await sidebarAfter(lightBar);
    await page.screenshot({
        path: `${dir}/sb-web-system-${renderer}-dark.png`,
    });
    check(
        dark.button !== light.button,
        `${renderer}: button follows the OS live (${light.button} -> ${dark.button})`,
    );
    check(
        dark.canvas !== light.canvas,
        `${renderer}: canvas follows the OS live (${light.canvas} -> ${dark.canvas})`,
    );
    check(
        darkBar !== lightBar,
        `manager follows the OS live (${lightBar} -> ${darkBar})`,
    );

    // Forced Light under a dark OS, then back to System.
    await setGlobals({ scheme: "light" });
    const forced = await settled(renderer);
    check(
        forced.canvas === light.canvas &&
            forced.button === light.button &&
            forced.classes.includes("light"),
        `${renderer}: Light overrides a dark OS ${JSON.stringify(forced)}`,
    );
    await setGlobals({ scheme: "system" });
    const back = await settled(renderer);
    check(
        back.canvas === dark.canvas &&
            back.button === dark.button &&
            back.classes === "",
        `${renderer}: back to System follows the OS again ${JSON.stringify(back)}`,
    );
    await setGlobals({ scheme: "dark" });
    await page.emulateMedia({ colorScheme: "light" });
    const held = await settled(renderer);
    check(
        held.canvas === dark.canvas && held.button === dark.button,
        `${renderer}: Dark holds under a light OS ${JSON.stringify(held)}`,
    );
    await setGlobals({ scheme: "system" });
    await page.emulateMedia({ colorScheme: "light" });
}
await browser.close();
process.exit(failures.length ? 1 : 0);

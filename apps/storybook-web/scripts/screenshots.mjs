// Screenshots a sample of stories in every renderer, against a running Storybook:
// `node scripts/screenshots.mjs <url> [dir] [scheme] [theme]` writes one overview per renderer,
// `<dir>/sb-web2-<renderer>[-<scheme>][-<theme>].png` (each story's canvas in a grid), and prints
// what each canvas holds, with the page's errors.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:6006";
const dir = process.argv[3] ?? "/tmp/opencode";
const scheme = process.argv[4] ?? "light";
const theme = process.argv[5] ?? "default";
/** Story ids: a sample across the groups, an overlay opened among them. */
const stories = [
    "button--default",
    "switch--default",
    "textfield--default",
    "slider--default",
    "tabs--default",
    "menu--opened-plain",
];
const renderers = ["solid", "react", "native"];

const browser = await chromium.launch(
    process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {},
);
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
/** @type {string[]} */
const errors = [];
page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

const suffix = `${scheme === "light" ? "" : `-${scheme}`}${theme === "default" ? "" : `-${theme}`}`;
for (const renderer of renderers) {
    /** @type {{ story: string, png: string }[]} */
    const shots = [];
    for (const story of stories) {
        // The canvas alone (`iframe.html`), so the shot is the story's.
        await page.goto(
            `${base}/iframe.html?id=${story}&viewMode=story&globals=renderer:${renderer};scheme:${scheme};theme:${theme}`,
        );
        const root = page.locator(`[data-renderer=${renderer}]`);
        await root
            .locator(":is(button, input, [role])")
            .first()
            .waitFor({ timeout: 60_000 });
        await page.waitForTimeout(800);
        const text = await root.evaluate((el) => el.textContent ?? "");
        const png = await page.screenshot({ fullPage: false });
        shots.push({ story, png: png.toString("base64") });
        console.log(renderer, story, JSON.stringify(text.slice(0, 60)));
    }
    await page.setContent(
        `<body style="margin:0;font:14px sans-serif;background:#ddd"><h2 style="margin:8px">${renderer}</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px">${shots
            .map(
                (s) =>
                    `<figure style="margin:0;background:#fff"><figcaption style="padding:4px">${s.story}</figcaption><img style="width:100%" src="data:image/png;base64,${s.png}"></figure>`,
            )
            .join("")}</div></body>`,
    );
    await page.screenshot({
        path: `${dir}/sb-web2-${renderer}${suffix}.png`,
        fullPage: true,
    });
}
console.log("errors", JSON.stringify(errors, null, 1));
await browser.close();

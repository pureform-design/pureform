// Visual checks over the Panda fixture's page of every component, with the fixture's Panda
// styles: a screenshot per section, plus measured layout rules that screenshots alone catch late
// (icons centered, labels that float without jumping, the focus ring on keyboard focus).
//
// The theme's fonts are bundled, so the screenshots don't depend on the machine's fallback fonts.

import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "#/styles.css";
import { render } from "@solidjs/web";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Page } from "#/page";

const SECTIONS = [
    "intro",
    "themes",
    "density",
    "buttons",
    "icon-buttons",
    "button-groups",
    "disabled-buttons",
    "cards",
    "scrim",
    "fullscreen-dialog",
    "sheets",
    "media",
    "carousels",
    "controls",
    "color-groups",
    "text-fields",
    "icon-fields-and-areas",
    "affixes-and-counter",
    "icons",
    "fabs",
    "split-buttons-and-fab-menus",
    "toolbars",
    "shapes",
    "chips",
    "input-chips",
    "lists",
    "tabs",
    "row-colors",
    "toasts",
    "search-and-feedback",
    "select",
    "search-and-autocomplete",
    "progress",
    "loading-and-wavy",
    "navigation",
    "badges",
    "app-bars",
    "date-pickers",
    "time-pickers",
    "tables",
];

let dispose: (() => void) | undefined;

// Load every face up front: `document.fonts.ready` waits only for the faces already in use.
beforeAll(async () => {
    await Promise.all(
        [
            "400 1em Roboto",
            "500 1em Roboto",
            "700 1em Roboto",
            "400 1em 'JetBrains Mono'",
        ].map((font) => document.fonts.load(font)),
    );
});

beforeEach(async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const unmount = render(() => <Page />, root);
    dispose = () => {
        unmount();
        root.remove();
    };
    await document.fonts.ready;
});

afterEach(() => dispose?.());

const section = (name: string) =>
    document.querySelector<HTMLElement>(`[data-section="${name}"]`)!;

describe("sections", () => {
    it.each(SECTIONS)("%s looks the same", async (name) => {
        await expect
            .element(page.elementLocator(section(name)))
            .toMatchScreenshot(name);
    });
});

it("every icon slot centers its glyph", () => {
    const offsets = [...document.querySelectorAll<HTMLElement>("[class]")]
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
                x: glyph.left + glyph.width / 2 - (box.left + box.width / 2),
                y: glyph.top + glyph.height / 2 - (box.top + box.height / 2),
            };
        });
    expect(offsets.length).toBeGreaterThan(0);
    for (const { name, x, y } of offsets) {
        expect(Math.abs(x), `${name} x`).toBeLessThanOrEqual(1);
        expect(Math.abs(y), `${name} y`).toBeLessThanOrEqual(1);
    }
});

it("a text field's label floats to the same place on focus and with a value", async () => {
    const field = section("text-fields").querySelector("input")!;
    const label = document.querySelector(`label[for="${field.id}"]`)!;
    const top = () =>
        label.getBoundingClientRect().top -
        label.parentElement!.getBoundingClientRect().top;
    const resting = top();
    field.focus();
    const focused = top();
    await userEvent.fill(field, "value");
    field.blur();
    const withValue = top();
    expect(focused).toBeLessThan(resting);
    expect(withValue).toBe(focused);
});

it("keyboard focus shows the focus ring", async () => {
    const button = section("buttons").querySelector("button")!;
    button.focus();
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    const style = getComputedStyle(button);
    expect([style.outlineStyle, style.outlineWidth]).toEqual(["solid", "3px"]);
});

it("a standard group's button widens while pressed, and a connected group squares inner corners", () => {
    const [standard, connected] = [
        ...section("button-groups").children,
    ] as HTMLElement[];
    const button = standard!.children[0] as HTMLElement;
    const rest = button.getBoundingClientRect().width;
    button.setAttribute("data-pf-active", "");
    // The width eases; read the target from the padding rather than the box mid-tween.
    const padding = parseFloat(getComputedStyle(button).paddingInlineStart);
    button.removeAttribute("data-pf-active");
    const restPadding = parseFloat(getComputedStyle(button).paddingInlineStart);
    expect(padding - restPadding).toBe(6);
    expect(rest).toBeGreaterThan(0);
    expect(getComputedStyle(standard!).columnGap).toBe("12px");
    expect(getComputedStyle(connected!).columnGap).toBe("2px");
    const [first, , last] = [...connected!.children] as HTMLElement[];
    const corners = (el: HTMLElement) => {
        const cs = getComputedStyle(el);
        return [cs.borderStartStartRadius, cs.borderStartEndRadius];
    };
    expect(corners(first!)).toEqual(["9999px", "8px"]);
    expect(corners(last!)).toEqual(["8px", "9999px"]);
});

it("a floating toolbar is a 64px pill hugging its buttons, a docked one fills its row square", () => {
    const [floating, vibrant, docked] = [
        ...section("toolbars").querySelectorAll<HTMLElement>("[role=toolbar]"),
    ];
    const box = floating!.getBoundingClientRect();
    expect(box.height).toBe(64);
    const style = getComputedStyle(floating!);
    expect(style.borderStartStartRadius).toBe("9999px");
    expect([style.paddingInlineStart, style.columnGap]).toEqual(["8px", "4px"]);
    expect(style.boxShadow).not.toBe("none");
    expect(getComputedStyle(vibrant!).backgroundColor).not.toBe(
        style.backgroundColor,
    );
    const row = docked!.parentElement!.getBoundingClientRect();
    expect(docked!.getBoundingClientRect().width).toBe(row.width);
    const dockedStyle = getComputedStyle(docked!);
    expect(dockedStyle.borderStartStartRadius).toBe("0px");
    expect(dockedStyle.paddingInlineStart).toBe("16px");
    expect(dockedStyle.boxShadow).toBe("none");
});

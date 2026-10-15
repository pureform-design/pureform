// Visual checks over the demo's page, rendered here with the demo's own styles: a screenshot
// per section, plus measured layout rules that screenshots alone catch late (icons centered,
// labels that float without jumping, the focus ring on keyboard focus).

import "#/App.css";
import { render } from "@solidjs/web";
import type { Component } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Route } from "#/routes/index";

const SECTIONS = [
    "intro",
    "themes",
    "density",
    "buttons",
    "icon-buttons",
    "disabled-buttons",
    "cards",
    "scrim",
    "media",
    "controls",
    "color-groups",
    "text-fields",
    "icon-fields-and-areas",
    "icons",
    "fabs",
    "shapes",
    "chips",
    "lists",
    "tabs",
    "row-colors",
    "search-and-feedback",
    "select",
    "progress",
    "navigation",
];

const IndexPage = Route.options.component as Component;

let dispose: (() => void) | undefined;

beforeEach(async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const unmount = render(() => <IndexPage />, root);
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

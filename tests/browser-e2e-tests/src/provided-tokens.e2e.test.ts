// Provided tokens on the web (component-architecture.md §5.5): a vibrant toolbar sets its icon
// buttons' accent on its root, which they inherit, so an icon button inside draws in the
// toolbar's content color on every web target, and an app bar's leading and trailing parts give
// theirs their own colors. An icon button's own color group (its root sets
// the accent) and its instance tokens (inline) still win.

import * as pandaRecipes from "$recipes";
import { classesFor } from "@pureform/css-adapter";
import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type SlotClasses = (selection: object) => Record<string, string>;

const pandaFns = pandaRecipes as unknown as Record<string, SlotClasses>;
const plainFns = classesFor(pureformConfig) as unknown as Record<
    string,
    SlotClasses
>;

const markup = (fns: Record<string, SlotClasses>) => {
    const toolbar = fns.toolbar!({ color: "vibrant", overflow: false });
    const appBar = fns.appBar!({});
    const iconButton = (id: string, selection: object, style = "") =>
        `<button data-id="${id}" class="${fns.iconButton!(selection).root}" style="${style}"></button>`;
    return `<div data-id="toolbar" class="${toolbar.root}">
        ${iconButton("provided", {})}
        ${iconButton("own", { color: "secondary" })}
        ${iconButton("instance", {}, "--pf-components-iconButton-accent: rgb(0, 128, 0)")}
    </div>
    ${iconButton("secondary", { color: "secondary" })}
    ${iconButton("outside", {})}
    <header data-id="appBar" class="${appBar.root}">
        <div data-id="leading" class="${appBar.leading}">${iconButton("leadingButton", {})}</div>
        <div data-id="trailing" class="${appBar.trailing}">${iconButton("trailingButton", {})}</div>
    </header>`;
};

// Each styling in its own frame: Panda's stylesheet, or an adapter's alone.
const colors = async (
    fns: Record<string, SlotClasses>,
    css: string[],
): Promise<Record<string, string>> => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "width: 800px; height: 400px; border: 0";
    document.body.append(frame);
    try {
        const doc = frame.contentDocument!;
        doc.open();
        doc.write(
            `<!doctype html><html><head>${css
                .map((sheet) => `<style>${sheet}</style>`)
                .join("")}</head><body>${markup(fns)}</body></html>`,
        );
        doc.close();
        return Object.fromEntries(
            [...doc.querySelectorAll<HTMLElement>("[data-id]")].map((el) => [
                el.dataset.id!,
                frame.contentWindow!.getComputedStyle(el).color,
            ]),
        );
    } finally {
        frame.remove();
    }
};

const expectProvided = (seen: Record<string, string>) => {
    // The toolbar's own color is its content color, which it gives its icon buttons.
    expect(seen.provided).toBe(seen.toolbar);
    expect(seen.outside).not.toBe(seen.toolbar);
    expect(seen.own).toBe(seen.secondary);
    expect(seen.instance).toBe("rgb(0, 128, 0)");
    // The app bar's leading and trailing parts give theirs their own colors.
    expect(seen.leadingButton).toBe(seen.leading);
    expect(seen.trailingButton).toBe(seen.trailing);
    expect(seen.leading).not.toBe(seen.trailing);
};

describe("a vibrant toolbar's and an app bar's icon buttons", () => {
    it("take its content color on Panda", async () => {
        expectProvided(await colors(pandaFns, [pandaCss]));
    });

    it.each(["CSS", "Tailwind"] as Adapter[])(
        "take its content color on %s",
        async (adapter) => {
            const css = await commands.adapterCss(adapter, OPTIONS);
            expectProvided(await colors(plainFns, [css]));
        },
    );
});

// A tree's rows on each web target (the Panda preset, the CSS adapter, and Tailwind through it):
// a leaf's row is its treeitem and shows its own state; a branch's row sits in the branch's
// treeitem, around it and its group, and shows the treeitem's state (selected, disabled,
// expanded, keyboard focus) while the children in its group don't take it.

import * as pandaRecipes from "$recipes";
import { classesFor } from "@pureform/css-adapter";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { pureformConfig } from "../../panda-fixture/panda.pureform";
import type { Adapter } from "./commands";

import pandaCss from "#/styles.css?inline";

const OPTIONS = { prefix: "pf", themeAttribute: "data-panda-theme" };

type Classes = (
    name: string,
    selection?: Record<string, string | boolean>,
) => Record<string, string>;

const classesOf =
    (fns: Record<string, (selection: object) => unknown>): Classes =>
    (name, selection = {}) => {
        const fn = fns[name];
        if (!fn) throw new Error(`no classes for ${name}`);
        return fn(selection) as Record<string, string>;
    };

const adapterClasses = classesOf(
    classesFor(pureformConfig) as Record<
        string,
        (selection: object) => unknown
    >,
);

const STYLINGS: Record<
    "Panda" | Adapter,
    { classes: Classes; css: () => Promise<string> }
> = {
    Panda: {
        classes: classesOf(
            pandaRecipes as unknown as Record<
                string,
                (selection: object) => unknown
            >,
        ),
        css: async () => pandaCss,
    },
    CSS: {
        classes: adapterClasses,
        css: () => commands.adapterCss("CSS", OPTIONS),
    },
    Tailwind: {
        classes: adapterClasses,
        css: () => commands.adapterCss("Tailwind", OPTIONS),
    },
};

describe.each(Object.keys(STYLINGS) as (keyof typeof STYLINGS)[])(
    "%s: tree rows",
    (styling) => {
        let frame: HTMLIFrameElement;
        const doc = () => frame.contentDocument!;

        beforeAll(async () => {
            frame = document.createElement("iframe");
            frame.style.cssText = "width: 800px; height: 600px; border: 0";
            document.body.append(frame);
            doc().open();
            doc().write(
                `<!doctype html><html><head><style>${await STYLINGS[styling].css()}</style></head><body></body></html>`,
            );
            doc().close();
        });

        afterAll(() => frame.remove());

        const show = () => {
            const c = STYLINGS[styling].classes("tree", {});
            doc().body.innerHTML = `<div class="${c.root}"><div class="${c.tree}" role="tree" aria-label="Files">
                <div data-branch="src" class="${c.branch}" role="treeitem" aria-expanded="true" aria-selected="true" tabindex="0">
                    <div data-row="src" class="${c.node}"><span class="${c.leading}">▤</span><span class="${c.text}">src</span><span data-indicator="src" class="${c.indicator}">⌄</span></div>
                    <div class="${c.group}" role="group">
                        <div data-row="index" class="${c.node}" role="treeitem" aria-selected="false" tabindex="-1"><span class="${c.text}">index.ts</span></div>
                        <div data-branch="lib" class="${c.branch}" role="treeitem" aria-expanded="false" aria-selected="false" tabindex="-1">
                            <div data-row="lib" class="${c.node}"><span class="${c.text}">lib</span><span data-indicator="lib" class="${c.indicator}">⌄</span></div>
                            <div class="${c.group}" role="group" hidden></div>
                        </div>
                    </div>
                </div>
                <div data-branch="docs" class="${c.branch}" role="treeitem" aria-expanded="false" aria-disabled="true" tabindex="-1">
                    <div data-row="docs" class="${c.node}"><span class="${c.text}">docs</span><span data-indicator="docs" class="${c.indicator}">⌄</span></div>
                </div>
                <div data-row="readme" class="${c.node}" role="treeitem" aria-selected="false" tabindex="-1"><span class="${c.text}">README.md</span></div>
            </div></div>`;
            const $ = (selector: string) =>
                doc().querySelector<HTMLElement>(selector)!;
            return {
                row: (name: string) => $(`[data-row="${name}"]`),
                branch: (name: string) => $(`[data-branch="${name}"]`),
                indicator: (name: string) => $(`[data-indicator="${name}"]`),
            };
        };
        const style = (el: Element) => getComputedStyle(el);

        it("shows a selected branch's state on its row only, not on its children's", () => {
            const { row, indicator } = show();
            const rest = style(row("readme")).backgroundColor;
            expect(style(row("src")).backgroundColor).not.toBe(rest);
            expect(style(row("src")).color).not.toBe(
                style(row("readme")).color,
            );
            // Its children, a leaf and a branch, stay at rest.
            expect(style(row("index")).backgroundColor).toBe(rest);
            expect(style(row("lib")).backgroundColor).toBe(rest);
            expect(style(row("lib")).color).toBe(style(row("readme")).color);
            // The expanded branch's indicator is turned over; its collapsed child's isn't.
            expect(style(indicator("src")).transform).not.toBe(
                style(indicator("lib")).transform,
            );
            expect(style(indicator("lib")).transform).toBe(
                style(indicator("docs")).transform,
            );
        });

        it("dims a disabled branch's row", () => {
            const { row } = show();
            expect(style(row("docs")).pointerEvents).toBe("none");
            expect(style(row("docs")).color).not.toBe(
                style(row("readme")).color,
            );
        });

        it("draws the keyboard focus on a branch's row, not around its treeitem", () => {
            const { row, branch } = show();
            expect(style(row("src")).outlineStyle).toBe("none");
            const item = branch("src");
            item.focus({ focusVisible: true } as FocusOptions);
            expect(item.matches(":focus-visible")).toBe(true);
            expect(style(row("src")).outlineStyle).toBe("solid");
            expect(style(item).outlineStyle).toBe("none");
            // Its children's rows don't show it.
            expect(style(row("index")).outlineStyle).toBe("none");
            expect(style(row("lib")).outlineStyle).toBe("none");
        });
    },
);

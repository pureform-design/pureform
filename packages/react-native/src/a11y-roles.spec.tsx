import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { SearchView } from "./search-view";
import { Select } from "./select";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { interact, mount, settle, until } from "./testing/render";
import { nativeTreeRow, Tree } from "./tree/tree";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "select",
        "menu",
        "tree",
        "searchView",
        "searchBar",
        "iconButton",
        "ripple",
    ]);
});

const render = (node: ReactNode, engine: MotionEngine) =>
    mount(
        <PureformProvider registry={registry} engine={engine} motion="reduce">
            {node}
        </PureformProvider>,
    );

const ENGINES = [animated, reanimated];

const SIZES = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

const FILES = [
    {
        value: "src",
        label: "src",
        children: [
            { value: "index", label: "index.ts" },
            { value: "util", label: "util.ts" },
        ],
    },
    { value: "readme", label: "README.md" },
];

const one = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [
    ...document.querySelectorAll<HTMLElement>(selector),
];

describe.each(ENGINES)("with $name", (engine) => {
    describe("the select, a select-only combobox", () => {
        const combobox = () => one('[role="combobox"]')!;

        it("controls a listbox of options, the chosen one selected", async () => {
            await render(
                <Select label="Size" items={SIZES} defaultValue="m" />,
                engine,
            );
            expect(combobox().getAttribute("aria-expanded")).toBe("false");
            expect(combobox().hasAttribute("aria-controls")).toBe(false);
            await interact(() => userEvent.click(combobox()));
            await until(() => expect(one('[role="listbox"]')).not.toBeNull());
            const listbox = one('[role="listbox"]')!;
            expect(listbox.getAttribute("aria-label")).toBe("Size");
            expect(combobox().getAttribute("aria-expanded")).toBe("true");
            expect(combobox().getAttribute("aria-controls")).toBe(listbox.id);
            expect(one('[role="menu"], [role="menuitem"]')).toBeNull();
            const options = all('[role="option"]');
            expect(options.map((option) => option.textContent)).toEqual([
                "Small",
                "Medium",
                "Large",
            ]);
            expect(
                options.map((option) => option.getAttribute("aria-selected")),
            ).toEqual(["false", "true", "false"]);
            // It opens on the chosen option.
            await until(() => expect(document.activeElement).toBe(options[1]));
        });

        it("takes the web's select's keys", async () => {
            const change = vi.fn();
            await render(
                <Select
                    label="Size"
                    items={SIZES}
                    defaultValue="m"
                    onValueChange={change}
                />,
                engine,
            );
            combobox().focus();
            // Sideways chooses without opening.
            await interact(() => userEvent.keyboard("{ArrowRight}"));
            expect(change).toHaveBeenLastCalledWith({ value: "l" });
            await interact(() => userEvent.keyboard("{Home}"));
            expect(change).toHaveBeenLastCalledWith({ value: "s" });
            expect(combobox().getAttribute("aria-expanded")).toBe("false");
            // Space opens it; the arrows move; Space chooses and closes, focus going back.
            await interact(() => userEvent.keyboard(" "));
            await until(() =>
                expect(document.activeElement?.textContent).toBe("Small"),
            );
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            expect(document.activeElement?.textContent).toBe("Medium");
            await interact(() => userEvent.keyboard(" "));
            expect(change).toHaveBeenLastCalledWith({ value: "m" });
            await until(() =>
                expect(combobox().getAttribute("aria-expanded")).toBe("false"),
            );
            await until(() => expect(document.activeElement).toBe(combobox()));
            // The down arrow opens it; Escape closes it.
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            await until(() =>
                expect(document.activeElement?.textContent).toBe("Medium"),
            );
            await interact(() => userEvent.keyboard("{Escape}"));
            await until(() =>
                expect(combobox().getAttribute("aria-expanded")).toBe("false"),
            );
            await until(() => expect(document.activeElement).toBe(combobox()));
        });
    });

    describe("the tree", () => {
        it("puts a branch's group inside its tree item, named from its row", async () => {
            await render(
                <Tree
                    aria-label="Files"
                    items={FILES}
                    defaultExpandedValue={["src"]}
                />,
                engine,
            );
            await settle(50);
            const items = all('[role="treeitem"]');
            expect(items).toHaveLength(4);
            const [src, index, util, readme] = items as [
                HTMLElement,
                HTMLElement,
                HTMLElement,
                HTMLElement,
            ];
            const group = src.querySelector('[role="group"]')!;
            expect(group).not.toBeNull();
            expect(group.contains(index)).toBe(true);
            expect(group.contains(util)).toBe(true);
            expect(src.getAttribute("aria-expanded")).toBe("true");
            const name = (item: HTMLElement) =>
                document.getElementById(item.getAttribute("aria-labelledby")!)
                    ?.textContent;
            expect(items.map(name)).toEqual([
                "src",
                "index.ts",
                "util.ts",
                "README.md",
            ]);
            const aria = (item: HTMLElement) =>
                ["aria-level", "aria-posinset", "aria-setsize"].map((name) =>
                    item.getAttribute(name),
                );
            expect(items.map(aria)).toEqual([
                ["1", "1", "2"],
                ["2", "1", "2"],
                ["2", "2", "2"],
                ["1", "2", "2"],
            ]);
            // The branch's row is the button inside it that toggles it.
            const row = src.querySelector('[role="button"]')!;
            expect(row.textContent).toContain("src");
            expect(readme.querySelector('[role="button"]')).toBeNull();
        });

        it("toggles a branch from its row by Enter and Space", async () => {
            await render(<Tree aria-label="Files" items={FILES} />, engine);
            const src = all('[role="treeitem"]')[0]!;
            const row = src.querySelector<HTMLElement>('[role="button"]')!;
            row.focus();
            await interact(() => userEvent.keyboard(" "));
            expect(src.getAttribute("aria-expanded")).toBe("true");
            await interact(() => userEvent.keyboard("{Enter}"));
            expect(src.getAttribute("aria-expanded")).toBe("false");
        });
    });

    describe("the search view's trigger", () => {
        it("says it opens a dialog and whether it's open", async () => {
            await render(
                <SearchView placeholder="Search mail" items={[]} />,
                engine,
            );
            const trigger = () => one('[aria-haspopup="dialog"]')!;
            expect(trigger().getAttribute("role")).toBe("button");
            expect(trigger().getAttribute("aria-label")).toBe("Search mail");
            expect(trigger().getAttribute("aria-expanded")).toBe("false");
            await interact(() => userEvent.click(trigger()));
            await until(() => expect(one('[role="dialog"]')).not.toBeNull());
            expect(trigger().getAttribute("aria-expanded")).toBe("true");
        });
    });
});

describe("a tree row on iOS and Android", () => {
    it("carries its level in its label, and its expanded state", () => {
        expect(
            nativeTreeRow(FILES[0]!, 1, { expanded: true, selected: false }),
        ).toEqual({
            accessibilityLabel: "src, level 1",
            accessibilityState: {
                selected: false,
                disabled: false,
                expanded: true,
            },
        });
        expect(
            nativeTreeRow(FILES[0]!.children![0]!, 2, {
                expanded: false,
                selected: true,
            }),
        ).toEqual({
            accessibilityLabel: "index.ts, level 2",
            accessibilityState: { selected: true, disabled: false },
        });
    });
});

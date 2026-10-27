import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { ChangeDetails } from ".";
import { PureformProvider } from ".";
import { Autocomplete } from "./autocomplete";
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
        "autocomplete",
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
            const change =
                vi.fn<
                    (details: ChangeDetails<"value", string | null>) => void
                >();
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

    describe("the select's type-to-find", () => {
        const combobox = () => one('[role="combobox"]')!;
        const SHIRTS = [
            { value: "s", label: "Small" },
            { value: "m", label: "Medium" },
            { value: "ml", label: "Medium large" },
            { value: "l", label: "Large" },
            { value: "xl", label: "Extra large" },
        ];

        it("opens on the first option starting with what's typed on the field, and goes on typing in the list", async () => {
            const change =
                vi.fn<
                    (details: ChangeDetails<"value", string | null>) => void
                >();
            await render(
                <Select
                    label="Size"
                    items={SHIRTS}
                    defaultValue="s"
                    onValueChange={change}
                />,
                engine,
            );
            combobox().focus();
            await interact(() => userEvent.keyboard("l"));
            await until(() =>
                expect(document.activeElement?.textContent).toBe("Large"),
            );
            expect(combobox().getAttribute("aria-expanded")).toBe("true");
            // Nothing is chosen by typing.
            expect(change).not.toHaveBeenCalled();
            // The same letter again goes round those starting with it; a word goes to it.
            await interact(() => userEvent.keyboard("m"));
            expect(document.activeElement?.textContent).toBe("Medium");
            await interact(() => userEvent.keyboard("m"));
            expect(document.activeElement?.textContent).toBe("Medium large");
            await new Promise((done) => setTimeout(done, 600));
            await interact(() => userEvent.keyboard("ex"));
            expect(document.activeElement?.textContent).toBe("Extra large");
            await interact(() => userEvent.keyboard("{Enter}"));
            expect(change).toHaveBeenLastCalledWith({ value: "xl" });
        });
    });

    describe("the autocomplete, a combobox with list autocomplete", () => {
        const CITIES = [
            { value: "par", label: "Paris" },
            { value: "pra", label: "Prague" },
            { value: "rom", label: "Rome" },
        ];

        it("lists its suggestions as options of a listbox the input controls", async () => {
            await render(<Autocomplete label="City" items={CITIES} />, engine);
            const input = one('[role="combobox"]') as HTMLInputElement;
            expect(input.getAttribute("aria-autocomplete")).toBe("list");
            await interact(() => userEvent.type(input, "p"));
            await until(() => expect(one('[role="listbox"]')).not.toBeNull());
            const listbox = one('[role="listbox"]')!;
            expect(input.getAttribute("aria-controls")).toBe(listbox.id);
            expect(listbox.getAttribute("aria-label")).toBe("City");
            expect(one('[role="menu"], [role="menuitem"]')).toBeNull();
            expect(all('[role="option"]').map((o) => o.textContent)).toEqual([
                "Paris",
                "Prague",
            ]);
        });

        it("keeps focus in the input, highlighting options with the arrows and choosing with Enter", async () => {
            const change =
                vi.fn<
                    (details: ChangeDetails<"value", string | null>) => void
                >();
            await render(
                <Autocomplete
                    label="City"
                    items={CITIES}
                    onValueChange={change}
                />,
                engine,
            );
            const input = one('[role="combobox"]') as HTMLInputElement;
            input.focus();
            const highlighted = () =>
                document.getElementById(
                    input.getAttribute("aria-activedescendant") ?? "",
                );
            // The down arrow opens the list on its first option.
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            await until(() => expect(highlighted()?.textContent).toBe("Paris"));
            expect(highlighted()!.getAttribute("role")).toBe("option");
            expect(highlighted()!.getAttribute("aria-selected")).toBe("true");
            expect(
                all('[role="option"]').filter(
                    (o) => o.getAttribute("aria-selected") === "true",
                ),
            ).toHaveLength(1);
            expect(document.activeElement).toBe(input);
            await interact(() => userEvent.keyboard("{ArrowDown}{ArrowDown}"));
            expect(highlighted()?.textContent).toBe("Rome");
            // It wraps round.
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            expect(highlighted()?.textContent).toBe("Paris");
            await interact(() => userEvent.keyboard("{ArrowUp}"));
            expect(highlighted()?.textContent).toBe("Rome");
            await interact(() => userEvent.keyboard("{Enter}"));
            expect(change).toHaveBeenCalledExactlyOnceWith({ value: "rom" });
            expect(input.value).toBe("Rome");
            await until(() =>
                expect(input.getAttribute("aria-expanded")).toBe("false"),
            );
            expect(input.hasAttribute("aria-activedescendant")).toBe(false);
            expect(document.activeElement).toBe(input);
            // Alt with the down arrow opens it with nothing highlighted; typing clears it.
            await interact(() => userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}"));
            await until(() =>
                expect(input.getAttribute("aria-expanded")).toBe("true"),
            );
            expect(highlighted()).toBeNull();
        });
    });

    describe("the tree", () => {
        it("makes each node a tree item holding its row and its group, named from its row's text", async () => {
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
            // A branch's tree item is its view, around its row and then its group.
            expect(src.getAttribute("data-testid")).toBe("pf-tree-branch");
            expect(readme.getAttribute("data-testid")).toBe("pf-tree-node");
            const group = src.querySelector<HTMLElement>('[role="group"]')!;
            expect(group.contains(index)).toBe(true);
            expect(group.contains(util)).toBe(true);
            const row = src.querySelector<HTMLElement>(
                '[data-testid="pf-tree-node"]',
            )!;
            expect(row.compareDocumentPosition(group)).toBe(
                Node.DOCUMENT_POSITION_FOLLOWING,
            );
            // The row is plain, out of the tab order.
            for (const attribute of ["role", "aria-expanded", "aria-level"])
                expect(row.hasAttribute(attribute)).toBe(false);
            expect(row.tabIndex).toBe(-1);
            expect(src.getAttribute("aria-expanded")).toBe("true");
            expect(src.hasAttribute("aria-owns")).toBe(false);
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
            // No button inside: the tree item takes focus, one tab stop for the tree.
            expect(document.querySelector('[role="button"]')).toBeNull();
            expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1, -1]);
        });

        it("focuses a branch's tree item when its row is pressed, and shows the focus on the row", async () => {
            await render(<Tree aria-label="Files" items={FILES} />, engine);
            const src = all('[role="treeitem"]')[0]!;
            const row = src.querySelector<HTMLElement>(
                '[data-testid="pf-tree-node"]',
            )!;
            await interact(() => userEvent.click(row));
            expect(document.activeElement).toBe(src);
            expect(src.getAttribute("aria-expanded")).toBe("true");
            // Back to it by the keys, which show the focus.
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            await interact(() => userEvent.keyboard("{ArrowUp}"));
            expect(document.activeElement).toBe(src);
            expect(getComputedStyle(row).outlineStyle).toBe("solid");
            // Only the row draws it, not the tree item around its group.
            const around = getComputedStyle(src);
            expect(
                around.outlineStyle === "none" || around.outlineWidth === "0px",
            ).toBe(true);
        });

        it("toggles a branch from its tree item by Enter and Space", async () => {
            await render(<Tree aria-label="Files" items={FILES} />, engine);
            const src = all('[role="treeitem"]')[0]!;
            src.focus();
            await interact(() => userEvent.keyboard(" "));
            expect(src.getAttribute("aria-expanded")).toBe("true");
            await interact(() => userEvent.keyboard("{Enter}"));
            expect(src.getAttribute("aria-expanded")).toBe("false");
        });

        it("moves between tree items with the keys, into and out of branches", async () => {
            await render(
                <Tree
                    aria-label="Files"
                    items={FILES}
                    defaultSelectedValue={["readme"]}
                />,
                engine,
            );
            const item = (label: string) =>
                all('[role="treeitem"]').find(
                    (each) =>
                        document.getElementById(
                            each.getAttribute("aria-labelledby")!,
                        )?.textContent === label,
                )!;
            const focused = () =>
                document.getElementById(
                    document.activeElement!.getAttribute("aria-labelledby")!,
                )?.textContent;
            // The selected row takes Tab.
            expect(item("README.md").tabIndex).toBe(0);
            item("README.md").focus();
            await interact(() => userEvent.keyboard("{Home}"));
            await until(() => expect(focused()).toBe("src"));
            // Right expands, then goes to the first child; left goes back to the parent, then
            // collapses.
            await interact(() => userEvent.keyboard("{ArrowRight}"));
            expect(item("src").getAttribute("aria-expanded")).toBe("true");
            expect(focused()).toBe("src");
            await interact(() => userEvent.keyboard("{ArrowRight}"));
            await until(() => expect(focused()).toBe("index.ts"));
            expect(item("index.ts").tabIndex).toBe(0);
            expect(item("src").tabIndex).toBe(-1);
            await interact(() => userEvent.keyboard("{ArrowDown}"));
            await until(() => expect(focused()).toBe("util.ts"));
            await interact(() => userEvent.keyboard("{ArrowLeft}"));
            await until(() => expect(focused()).toBe("src"));
            await interact(() => userEvent.keyboard("{ArrowLeft}"));
            expect(item("src").getAttribute("aria-expanded")).toBe("false");
            await interact(() => userEvent.keyboard("{End}"));
            await until(() => expect(focused()).toBe("README.md"));
            // A letter goes to the next row starting with it.
            await interact(() => userEvent.keyboard("s"));
            await until(() => expect(focused()).toBe("src"));
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
    it("says its level in the tree's words", () => {
        expect(
            nativeTreeRow(
                FILES[0]!,
                2,
                { expanded: false, selected: false },
                { level: (label, level) => `${label}, niveau ${level}` },
            ).accessibilityLabel,
        ).toBe("src, niveau 2");
    });

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

describe("type-to-find's typed text", () => {
    it("adds keys within half a second, starts again after, and keeps one letter typed again", async () => {
        const { typeahead } = await import("./menu/menu");
        let now = 0;
        const typed = typeahead(() => now);
        expect(typed("M")).toBe("m");
        now = 100;
        expect(typed("e")).toBe("me");
        now = 700;
        expect(typed("l")).toBe("l");
        now = 800;
        expect(typed("l")).toBe("l");
        now = 900;
        expect(typed("a")).toBe("lla");
    });
});

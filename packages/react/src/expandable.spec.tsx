import { accordionAnatomy, treeAnatomy } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { displayRegistry } from "./__fixtures__/registry";
import { Accordion } from "./accordion";
import { mount, settle } from "./testing/render";
import { Tree } from "./tree";

const withRegistry = (view: () => ReactNode, dir: "ltr" | "rtl" = "ltr") =>
    mount(
        <PureformProvider registry={displayRegistry()} dir={dir}>
            {view()}
        </PureformProvider>,
    );

const all = (testId: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`),
];

const ids = (anatomy: {
    parts: Record<string, { testId: string }>;
}): Record<string, string> =>
    Object.fromEntries(
        Object.entries(anatomy.parts).map(([part, { testId }]) => [
            part,
            testId,
        ]),
    );

const a = ids(accordionAnatomy);
const t = ids(treeAnatomy);

const ITEMS = [
    {
        value: "shipping",
        title: "Shipping",
        description: "2 to 4 days",
        leading: "✈",
        content: "Free over 50",
    },
    { value: "returns", title: "Returns", content: "30 days" },
    { value: "gifts", title: "Gifts", disabled: true, content: "Wrapped" },
];

describe("Accordion", () => {
    it("renders an item per entry, each header a button over its hidden content", async () => {
        withRegistry(() => <Accordion items={ITEMS} />);
        await settle();
        expect(all(a.root!)[0]!.className).toBe("accordion");
        const triggers = all(a.trigger!);
        expect(triggers.map((el) => el.tagName)).toEqual([
            "BUTTON",
            "BUTTON",
            "BUTTON",
        ]);
        expect(triggers[0]!.className).toBe("accordion__trigger");
        expect(
            [...triggers[0]!.children]
                .map((el) => el.getAttribute("data-pf-part"))
                .filter(Boolean),
        ).toEqual(["leading", "text", "indicator"]);
        expect(all(a.description!)).toHaveLength(1);
        expect(all(a.indicator!)[0]!.querySelector("svg")).not.toBeNull();
        expect(triggers.map((el) => el.getAttribute("aria-expanded"))).toEqual([
            "false",
            "false",
            "false",
        ]);
        expect(all(a.content!).map((el) => el.hidden)).toEqual([
            true,
            true,
            true,
        ]);
        expect((triggers[2] as HTMLButtonElement).disabled).toBe(true);
        expect(triggers[0]!.getAttribute("aria-controls")).toBe(
            all(a.content!)[0]!.id,
        );
    });

    it("expands and collapses an item from its header, and moves between headers with the arrow keys", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <Accordion items={ITEMS} onValueChange={onValueChange} />
        ));
        await settle();
        const triggers = all(a.trigger!);
        await userEvent.click(triggers[0]!);
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: ["shipping"] }),
        );
        expect(all(a.content!)[0]!.hidden).toBe(false);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(document.activeElement).toBe(triggers[1]);
        await userEvent.keyboard("{Enter}");
        await settle();
        // One item at a time, unless `multiple`.
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: ["returns"] }),
        );
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ value: [] }),
        );
    });

    it("composes its parts, and passes the density to the registry", async () => {
        withRegistry(() => (
            <Accordion.Root density="compact" defaultValue={["a"]} multiple>
                <Accordion.Item value="a">
                    <Accordion.Trigger>
                        <Accordion.Text>
                            <Accordion.Title>A</Accordion.Title>
                        </Accordion.Text>
                        <Accordion.Indicator />
                    </Accordion.Trigger>
                    <Accordion.Content>A body</Accordion.Content>
                </Accordion.Item>
            </Accordion.Root>
        ));
        await settle();
        expect(all(a.root!)[0]!.className).toBe(
            "accordion accordion--density-compact",
        );
        expect(all(a.trigger!)[0]!.getAttribute("aria-expanded")).toBe("true");
        expect(all(a.content!)[0]!.hidden).toBe(false);
    });
});

const FILES = [
    {
        value: "src",
        label: "src",
        leading: "📁",
        children: [
            { value: "index", label: "index.ts" },
            { value: "util", label: "util.ts" },
        ],
    },
    { value: "readme", label: "README.md" },
];

describe("Tree", () => {
    it("renders a row per visible node, a branch's row ending in the indicator over its hidden group", async () => {
        withRegistry(() => <Tree label="Files" items={FILES} />);
        await settle();
        const tree = all(t.tree!)[0]!;
        expect(tree.getAttribute("role")).toBe("tree");
        expect(tree.getAttribute("aria-labelledby")).toBe(all(t.label!)[0]!.id);
        const rows = all(t.node!);
        expect(rows).toHaveLength(4);
        expect(rows[0]!.className).toBe("tree__node");
        const branch = all(t.branch!)[0]!;
        expect(branch.getAttribute("aria-expanded")).toBe("false");
        expect(
            [...rows[0]!.children]
                .map((el) => el.getAttribute("data-pf-part"))
                .filter(Boolean),
        ).toEqual(["leading", "text", "indicator"]);
        expect(all(t.indicator!)).toHaveLength(1);
        expect(all(t.group!)[0]!.hidden).toBe(true);
        expect(rows[3]!.getAttribute("role")).toBe("treeitem");
        expect(branch.tabIndex).toBe(0);
        expect(rows[3]!.tabIndex).toBe(-1);
    });

    it("expands with the right arrow and walks the rows by direction, selecting with Enter", async () => {
        const onExpandedValueChange = vi.fn();
        const onSelectedValueChange = vi.fn();
        withRegistry(
            () => (
                <Tree
                    aria-label="Files"
                    items={FILES}
                    onExpandedValueChange={onExpandedValueChange}
                    onSelectedValueChange={onSelectedValueChange}
                />
            ),
            "rtl",
        );
        await settle();
        const tree = all(t.tree!)[0]!;
        expect(tree.getAttribute("aria-label")).toBe("Files");
        expect(tree.hasAttribute("aria-labelledby")).toBe(false);
        const rows = all(t.node!);
        const branch = all(t.branch!)[0]!;
        branch.focus();
        // Under rtl the left arrow points into the branch.
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(onExpandedValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ expandedValue: ["src"] }),
        );
        expect(branch.getAttribute("aria-expanded")).toBe("true");
        expect(all(t.group!)[0]!.hidden).toBe(false);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(document.activeElement).toBe(rows[1]);
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(onSelectedValueChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedValue: ["index"] }),
        );
        expect(rows[1]!.getAttribute("aria-current")).toBe("true");
    });

    it("makes each node a treeitem holding its row and its group, named from its row, with no button inside (APG)", async () => {
        withRegistry(() => (
            <Tree
                aria-label="Files"
                items={FILES}
                defaultExpandedValue={["src"]}
                defaultSelectedValue={["src"]}
            />
        ));
        await settle();
        const rows = all(t.node!);
        const branch = all(t.branch!)[0]!;
        const treeitems = [...document.querySelectorAll('[role="treeitem"]')];
        // The branch's element, then its leaves (in its group), then the leaf at the top.
        expect(treeitems).toEqual([branch, rows[1], rows[2], rows[3]]);
        expect(branch.getAttribute("aria-level")).toBe("1");
        expect(branch.getAttribute("aria-expanded")).toBe("true");
        expect(branch.getAttribute("aria-selected")).toBe("true");
        expect(branch.hasAttribute("aria-owns")).toBe(false);
        const group = all(t.group!)[0]!;
        expect(group.getAttribute("role")).toBe("group");
        // The group sits in the treeitem, after its row, holding the children's treeitems.
        expect([...branch.children]).toEqual([rows[0], group]);
        expect(group.contains(rows[1]!)).toBe(true);
        expect(rows[1]!.getAttribute("aria-level")).toBe("2");
        // Named from its own row's text, not its children's.
        const text = all(t.text!)[0]!;
        expect(branch.getAttribute("aria-labelledby")).toBe(text.id);
        expect(text.textContent).toBe("src");
        // The row is plain: no role, state or focus of its own.
        const row = rows[0]!;
        for (const attribute of ["role", "aria-expanded", "tabindex"])
            expect(row.hasAttribute(attribute)).toBe(false);
        expect(document.querySelector('[role="button"]')).toBeNull();
        // One tab stop, and the keys on the treeitems.
        expect(
            treeitems.filter((item) => (item as HTMLElement).tabIndex === 0),
        ).toEqual([branch]);
        await userEvent.click(rows[3]!);
        await settle();
        expect(document.activeElement).toBe(rows[3]);
        await userEvent.keyboard("{Home}");
        await settle();
        expect(document.activeElement).toBe(branch);
        await userEvent.keyboard("{ArrowDown}");
        await settle();
        expect(document.activeElement).toBe(rows[1]);
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(document.activeElement).toBe(branch);
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(branch.getAttribute("aria-expanded")).toBe("false");
        await userEvent.keyboard("{Enter}");
        await settle();
        expect(branch.getAttribute("aria-expanded")).toBe("true");
        // Clicking a branch's row focuses its treeitem.
        await userEvent.click(rows[3]!);
        await userEvent.click(row);
        await settle();
        expect(document.activeElement).toBe(branch);
    });

    it("passes the density and color to the registry", async () => {
        withRegistry(() => (
            <Tree
                aria-label="Files"
                items={FILES}
                density="compact"
                color="secondary"
            />
        ));
        await settle();
        expect(all(t.root!)[0]!.className).toBe(
            "tree tree--density-compact tree--color-secondary",
        );
    });
});

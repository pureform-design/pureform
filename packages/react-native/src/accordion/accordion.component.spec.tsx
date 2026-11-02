import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Accordion } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { animated } from "../engine";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { mount, settle } from "../testing/render";
import { Tree } from "../tree";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["accordion", "tree", "ripple"]);
});

afterEach(() => {
    document.body.innerHTML = "";
});

const render = (node: ReactNode) =>
    mount(
        <PureformProvider registry={registry} engine={animated} motion="reduce">
            {node}
        </PureformProvider>,
    );

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("Accordion", () => {
    it("expands an item from its header, one at a time, turning its indicator over", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <Accordion
                items={[
                    {
                        value: "a",
                        title: "A",
                        description: "a",
                        content: "A body",
                    },
                    { value: "b", title: "B", content: "B body" },
                ]}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const triggers = all("pf-accordion-trigger");
        expect(triggers).toHaveLength(2);
        expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
        expect(all("pf-accordion-content")).toHaveLength(0);
        const turned = () =>
            getComputedStyle(all("pf-accordion-indicator")[0]!).transform;
        const before = turned();
        triggers[0]!.click();
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["a"] });
        expect(all("pf-accordion-content")).toHaveLength(1);
        expect(
            all("pf-accordion-trigger")[0]!.getAttribute("aria-expanded"),
        ).toBe("true");
        expect(turned()).not.toBe(before);
        all("pf-accordion-trigger")[1]!.click();
        await settle();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["b"] });
    });
});

describe("Accordion, per item", () => {
    it("takes a function of each item in style and slotProps", async () => {
        await render(
            <Accordion
                items={[
                    { value: "a", title: "A", content: "A body" },
                    { value: "b", title: "B", content: "B body" },
                ]}
                defaultValue={["b"]}
                style={{
                    item: (item) =>
                        item.expanded ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    indicator: (item) => ({
                        "aria-label": `${item.index}:${item.item.value}`,
                    }),
                }}
            />,
        );
        await settle();
        expect(
            all("pf-accordion-item").map(
                (item) => getComputedStyle(item).opacity,
            ),
        ).toEqual(["1", "0.5"]);
        expect(
            all("pf-accordion-indicator").map((part) =>
                part.getAttribute("aria-label"),
            ),
        ).toEqual(["0:a", "1:b"]);
    });
});

describe("Expanding parts", () => {
    it("grows an accordion's content open and shrinks it shut, as the web's height transition", async () => {
        await mount(
            <PureformProvider registry={registry} engine={animated}>
                <Accordion
                    items={[
                        {
                            value: "a",
                            title: "A",
                            content: "A body\nwith\nseveral\nlines",
                        },
                    ]}
                />
            </PureformProvider>,
        );
        await settle();
        const item = () => all("pf-accordion-item")[0]!;
        const closed = item().getBoundingClientRect().height;
        all("pf-accordion-trigger")[0]!.click();
        await settle(16 * 4);
        const content = all("pf-accordion-content")[0]!;
        const full = content.getBoundingClientRect().height;
        // Part way: the item has grown, but not by the whole content yet.
        const midway = item().getBoundingClientRect().height - closed;
        expect(midway).toBeGreaterThanOrEqual(0);
        expect(midway).toBeLessThan(full);
        await vi.waitFor(
            () =>
                expect(item().getBoundingClientRect().height).toBeCloseTo(
                    closed + full,
                    0,
                ),
            { timeout: 5000 },
        );
        // Shutting: the content stays until the spring has taken it away.
        all("pf-accordion-trigger")[0]!.click();
        await settle(16 * 4);
        expect(all("pf-accordion-content")).toHaveLength(1);
        expect(item().getBoundingClientRect().height).toBeGreaterThan(closed);
        await vi.waitFor(
            () => expect(all("pf-accordion-content")).toHaveLength(0),
            { timeout: 5000 },
        );
        expect(item().getBoundingClientRect().height).toBeCloseTo(closed, 0);
    });
});

describe("Tree", () => {
    it("expands a branch and selects a node from its row, indenting its children", async () => {
        const onExpandedValueChange =
            vi.fn<
                (details: ChangeDetails<"expandedValue", string[]>) => void
            >();
        const onSelectedValueChange =
            vi.fn<
                (details: ChangeDetails<"selectedValue", string[]>) => void
            >();
        await render(
            <Tree
                aria-label="Files"
                items={[
                    {
                        value: "src",
                        label: "src",
                        children: [{ value: "index", label: "index.ts" }],
                    },
                    { value: "readme", label: "README.md" },
                ]}
                onExpandedValueChange={onExpandedValueChange}
                onSelectedValueChange={onSelectedValueChange}
            />,
        );
        await settle();
        expect(all("pf-tree-node")).toHaveLength(2);
        expect(all("pf-tree-indicator")).toHaveLength(1);
        all("pf-tree-node")[0]!.click();
        await settle();
        expect(onExpandedValueChange).toHaveBeenLastCalledWith({
            expandedValue: ["src"],
        });
        expect(onSelectedValueChange).toHaveBeenLastCalledWith({
            selectedValue: ["src"],
        });
        const rows = all("pf-tree-node");
        expect(rows).toHaveLength(3);
        const indent =
            rows[1]!.getBoundingClientRect().left -
            rows[0]!.getBoundingClientRect().left;
        expect(indent).toBe(24);
    });
});

describe("Tree, per node", () => {
    it("takes a function of each node in style and slotProps", async () => {
        await render(
            <Tree
                aria-label="Files"
                items={[
                    {
                        value: "src",
                        label: "src",
                        children: [{ value: "index", label: "index.ts" }],
                    },
                    { value: "readme", label: "README.md" },
                ]}
                defaultExpandedValue={["src"]}
                defaultSelectedValue={["readme"]}
                style={{
                    text: (node) =>
                        node.depth === 2 ? { opacity: 0.5 } : undefined,
                }}
                slotProps={{
                    node: (node) => ({
                        nativeID: [
                            node.branch ? "branch" : "leaf",
                            node.expanded ? "open" : "shut",
                            node.selected ? "chosen" : "not",
                        ].join("-"),
                    }),
                }}
            />,
        );
        await settle();
        expect(
            all("pf-tree-text").map((text) => getComputedStyle(text).opacity),
        ).toEqual(["1", "0.5", "1"]);
        expect(all("pf-tree-node").map((node) => node.id)).toEqual([
            "branch-open-not",
            "leaf-shut-not",
            "leaf-shut-chosen",
        ]);
    });
});

import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { Accordion } from ".";
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
        const onValueChange = vi.fn();
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

describe("Tree", () => {
    it("expands a branch and selects a node from its row, indenting its children", async () => {
        const onExpandedValueChange = vi.fn();
        const onSelectedValueChange = vi.fn();
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

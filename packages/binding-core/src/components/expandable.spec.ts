import { describe, expect, it, vi } from "vitest";

import { accordionItemProps, accordionMachineProps } from "./accordion";
import {
    isTreeBranch,
    treeCollectionOptions,
    treeControlProps,
    treeNaming,
} from "./tree";

describe("accordion", () => {
    it("collapses an item from its header unless told otherwise, and passes Root's id as Zag's", () => {
        expect(accordionMachineProps({ id: "faq" })).toMatchObject({
            collapsible: true,
            ids: { root: "faq" },
        });
        expect(accordionMachineProps({ collapsible: false }).collapsible).toBe(
            false,
        );
    });

    it("disables an item with the accordion", () => {
        expect(accordionItemProps({ value: "a" }, true)).toEqual({
            value: "a",
            disabled: true,
        });
    });
});

describe("tree", () => {
    const items = [
        { value: "src", label: "src", children: [{ value: "a", label: "a" }] },
        { value: "img", label: { node: true }, textValue: "Images" },
        { value: "x", label: { node: true }, disabled: true },
    ];

    it("walks the nodes as data, matching typeahead on the label, else the text value or value", () => {
        const options = treeCollectionOptions(items);
        expect(options.nodeToChildren(options.rootNode)).toBe(items);
        expect(items.map(options.nodeToString)).toEqual(["src", "Images", "x"]);
        expect(items.map(options.isNodeDisabled)).toEqual([false, false, true]);
        expect(items.map(isTreeBranch)).toEqual([true, false, false]);
    });

    it("maps the bindings' controllable props onto Zag's names", () => {
        const onExpandedValueChange = vi.fn();
        const onSelectedValueChange = vi.fn();
        expect(
            treeControlProps(
                { defaultExpandedValue: ["src"], onExpandedValueChange },
                { selectedValue: ["a"], onSelectedValueChange },
            ),
        ).toEqual({
            expandedValue: undefined,
            defaultExpandedValue: ["src"],
            onExpandedChange: onExpandedValueChange,
            selectedValue: ["a"],
            defaultSelectedValue: undefined,
            onSelectionChange: onSelectedValueChange,
        });
    });

    it("points at the label only while one is rendered", () => {
        const props = { "aria-label": "Tree View", "aria-labelledby": "l" };
        expect(treeNaming(props, true)).toBe(props);
        expect(treeNaming(props, false)).toEqual({ "aria-label": "Tree View" });
    });
});

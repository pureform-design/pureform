import type { ReactNode } from "react";
import { View } from "react-native";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { ChangeDetails } from ".";
import { PureformProvider } from ".";
import { ChipSet } from "./chip-set";
import { SelectionList } from "./selection-list";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, computed, interact, mount } from "./testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "tabs",
        "chipSet",
        "chip",
        "list",
        "listItem",
        "ripple",
    ]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const TABS = ["a", "b", "c"].map((value) => ({
    value,
    label: `Tab ${value}`,
}));

describe("Tabs", () => {
    it("scrolls scrollable tabs in a scroll view", async () => {
        await render(<Tabs scrollable items={TABS} />);
        expect(byTestId("pf-tabs-list-scroll")).toBeTruthy();
        expect(byTestId("pf-tabs-list").getAttribute("role")).toBe("tablist");
    });

    it("keeps fixed tabs out of a scroll view", async () => {
        await render(<Tabs items={TABS} />);
        expect(
            document.querySelector('[data-testid="pf-tabs-list-scroll"]'),
        ).toBeNull();
    });

    it("has the web's parts: a root around the list, which is the tablist", async () => {
        await render(<Tabs items={TABS} />);
        const root = byTestId("pf-tabs-root");
        const list = byTestId("pf-tabs-list");
        expect(root.contains(list)).toBe(true);
        expect(root).not.toBe(list);
        expect(root.getAttribute("role")).toBeNull();
        expect(list.getAttribute("role")).toBe("tablist");
        expect(
            [...list.querySelectorAll('[role="tab"]')].map((tab) =>
                tab.getAttribute("data-testid"),
            ),
        ).toEqual(["pf-tabs-tab", "pf-tabs-tab", "pf-tabs-tab"]);
    });

    it.each([
        ["a column", {}],
        ["a row", { flexDirection: "row" }],
        ["a centered row", { flexDirection: "row", alignItems: "center" }],
        ["a centered column", { alignItems: "center" }],
    ])(
        "leaves the list where and as big as it was, in %s",
        async (_, style) => {
            await render(
                <View style={{ width: 600, height: 100, ...style } as never}>
                    <Tabs items={TABS} />
                </View>,
            );
            const root = byTestId("pf-tabs-root").getBoundingClientRect();
            const list = byTestId("pf-tabs-list").getBoundingClientRect();
            expect(list.width).toBeGreaterThan(0);
            // The list sits at the root's start and is as wide as it, or as wide as its tabs in a
            // row. The root may be taller (a row stretches it), as the web's wrapper is.
            expect([root.left, root.top, root.width]).toEqual([
                list.left,
                list.top,
                list.width,
            ]);
            expect(root.height).toBeGreaterThanOrEqual(list.height);
            expect(list.height).toBe(48);
        },
    );

    it("takes the provider's and the instance's props for the root and the list apart", async () => {
        await mount(
            <PureformProvider
                registry={registry}
                motion="reduce"
                slotProps={{
                    tabs: {
                        root: { style: { marginTop: 7 } },
                        list: { style: { marginBottom: 5 } },
                    },
                }}
            >
                <Tabs items={TABS} style={{ list: { marginLeft: 3 } }} />
            </PureformProvider>,
        );
        const style = (id: string) => getComputedStyle(byTestId(id));
        expect(style("pf-tabs-root").marginTop).toBe("7px");
        expect(style("pf-tabs-list").marginTop).toBe("0px");
        expect(style("pf-tabs-list").marginBottom).toBe("5px");
        expect(style("pf-tabs-list").marginLeft).toBe("3px");
    });
});

describe("ChipSet", () => {
    const items = [
        { value: "a", label: "A", testId: "a" },
        { value: "b", label: "B", testId: "b" },
    ];

    it("gives an item test ids by part, as List's items do", async () => {
        await render(
            <ChipSet
                items={[{ label: "Reply", testId: { label: "reply-label" } }]}
            />,
        );
        expect(byTestId("reply-label").textContent).toBe("Reply");
    });

    it("gives an item its own style over the set's chipProps, and no other chip's", async () => {
        await render(
            <ChipSet
                chipProps={{ style: { root: { opacity: 0.9 } } }}
                items={[
                    {
                        value: "a",
                        label: "A",
                        testId: "a",
                        style: { root: { opacity: 0.4 } },
                    },
                    { value: "b", label: "B", testId: "b" },
                ]}
            />,
        );
        expect(computed("a-root").opacity).toBe("0.4");
        expect(computed("b-root").opacity).toBe("0.9");
    });

    it("keeps one chip on in a single-select set", async () => {
        const change =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <ChipSet
                selectable="single"
                defaultValue={["a"]}
                onValueChange={change}
                items={items}
            />,
        );
        await interact(() => userEvent.click(byTestId("b-root")));
        expect(change).toHaveBeenLastCalledWith({ value: ["b"] });
        await interact(() => userEvent.click(byTestId("b-root")));
        expect(change).toHaveBeenLastCalledWith({ value: [] });
    });

    it("turns on any number of chips in a multiple-select set", async () => {
        const change =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <ChipSet
                selectable="multiple"
                singleLine
                onValueChange={change}
                items={items}
            />,
        );
        expect(byTestId("pf-chip-set-root").getAttribute("role")).toBe("group");
        await interact(() => userEvent.click(byTestId("a-root")));
        await interact(() => userEvent.click(byTestId("b-root")));
        expect(change).toHaveBeenLastCalledWith({ value: ["a", "b"] });
    });
});

describe("SelectionList", () => {
    const items = [
        { value: "x", headline: "X", testId: "x" },
        { value: "y", headline: "Y", testId: "y" },
    ];

    it("selects any number of options in a multiple-select list", async () => {
        const change =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <SelectionList
                selectionMode="multiple"
                onValueChange={change}
                items={items}
            />,
        );
        expect(byTestId("pf-list-root").getAttribute("role")).toBe("listbox");
        expect(byTestId("x-root").getAttribute("role")).toBe("option");
        await interact(() => userEvent.click(byTestId("x-root")));
        await interact(() => userEvent.click(byTestId("y-root")));
        expect(change).toHaveBeenLastCalledWith({ value: ["x", "y"] });
        expect(byTestId("y-root").getAttribute("aria-selected")).toBe("true");
    });

    it("selects one option at a time by default", async () => {
        const change =
            vi.fn<(details: ChangeDetails<"value", string[]>) => void>();
        await render(
            <SelectionList
                defaultValue={["x"]}
                onValueChange={change}
                items={items}
            />,
        );
        await interact(() => userEvent.click(byTestId("y-root")));
        expect(byTestId("y-root").getAttribute("aria-selected")).toBe("true");
        expect(byTestId("x-root").getAttribute("aria-selected")).toBe("false");
        await interact(() => userEvent.click(byTestId("y-root")));
        expect(change).toHaveBeenCalledExactlyOnceWith({ value: ["y"] });
    });
});

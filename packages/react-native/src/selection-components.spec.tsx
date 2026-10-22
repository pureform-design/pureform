import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { ChipSet } from "./chip-set";
import { SelectionList } from "./selection-list";
import { Tabs } from "./tabs";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount } from "./testing/render";

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
        expect(byTestId("pf-tabs-root-scroll")).toBeTruthy();
        expect(byTestId("pf-tabs-root").getAttribute("role")).toBe("tablist");
    });

    it("keeps fixed tabs out of a scroll view", async () => {
        await render(<Tabs items={TABS} />);
        expect(
            document.querySelector('[data-testid="pf-tabs-root-scroll"]'),
        ).toBeNull();
    });
});

describe("ChipSet", () => {
    const items = [
        { value: "a", label: "A", testId: "a" },
        { value: "b", label: "B", testId: "b" },
    ];

    it("keeps one chip on in a single-select set", async () => {
        const change = vi.fn();
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
        const change = vi.fn();
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
        const change = vi.fn();
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
        const change = vi.fn();
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

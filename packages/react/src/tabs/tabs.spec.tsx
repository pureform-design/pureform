import { compositeTestIds } from "@pureform/anatomy";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Tabs } from ".";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { Errored, mount, quietly, settle } from "../testing/render";

/** The first element with a test id. */
const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

const ids = compositeTestIds.tabs;

const ITEMS = [
    { value: "flights", label: "Flights", icon: "✈", content: "Flights panel" },
    { value: "hotels", label: "Hotels", content: "Hotels panel" },
    { value: "cars", label: "Cars", disabled: true, content: "Cars panel" },
];

const withRegistry = (view: ReactNode, dir: "ltr" | "rtl" = "ltr") =>
    mount(
        <PureformProvider registry={navigationRegistry()} dir={dir}>
            {view}
        </PureformProvider>,
    );

const frames = async (count = 3) => {
    for (let i = 0; i < count; i++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    await settle();
};

const tabs = () => [
    ...document.querySelectorAll<HTMLButtonElement>(
        `[data-testid="${ids.tab}"]`,
    ),
];
const panels = () => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.content}"]`),
];

describe("Tabs, ready-made", () => {
    it("renders the tab list as the preset's root, the first tab selected, and its panel", async () => {
        withRegistry(<Tabs aria-label="Trips" items={ITEMS} />);
        await settle();
        expect(byTestId(ids.root).className).toBe("");
        const list = byTestId(ids.list);
        expect(list.className).toBe("tabs tabs--icon-true");
        expect(list.getAttribute("role")).toBe("tablist");
        expect(list.getAttribute("aria-label")).toBe("Trips");
        expect(list.getAttribute("data-pf-part")).toBe("list");
        expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
            "true",
            "false",
            "false",
        ]);
        expect(tabs()[0]!.tabIndex).toBe(0);
        expect(tabs()[1]!.tabIndex).toBe(-1);
        expect(tabs()[2]!.disabled).toBe(true);
        expect(tabs()[0]!.getAttribute("aria-controls")).toBe(panels()[0]!.id);
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(panels().map((panel) => panel.hidden)).toEqual([
            false,
            true,
            true,
        ]);
    });

    it("selects with a click and the arrow keys, by direction, and reports each change", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <Tabs
                aria-label="Trips"
                items={ITEMS}
                onValueChange={onValueChange}
            />,
            "rtl",
        );
        await settle();
        await userEvent.click(tabs()[1]!);
        await frames();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "hotels" });
        expect(panels()[1]!.hidden).toBe(false);
        // Under rtl the left arrow moves forward, past the disabled tab and round to the first.
        await userEvent.keyboard("{ArrowLeft}");
        await frames();
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "flights" });
        expect(document.activeElement).toBe(tabs()[0]);
        expect(onValueChange).toHaveBeenCalledTimes(2);
    });

    it("names no panel when the tabs have none, and leaves the icon variant off without icons", async () => {
        withRegistry(
            <Tabs
                aria-label="Views"
                defaultValue="b"
                items={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                ]}
            />,
        );
        await settle();
        expect(byTestId(ids.list).className).toBe("tabs tabs--icon-false");
        expect(tabs()[1]!.getAttribute("aria-selected")).toBe("true");
        expect(tabs()[1]!.hasAttribute("aria-controls")).toBe(false);
        expect(panels()).toHaveLength(0);
    });
});

describe("Tabs, composed", () => {
    it("asks when controlled, and throws for a part outside its tab", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <Tabs.Root value="a" onValueChange={onValueChange}>
                <Tabs.List aria-label="Letters">
                    <Tabs.Tab value="a">
                        <Tabs.Label>A</Tabs.Label>
                        <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab value="b">
                        <Tabs.Label>B</Tabs.Label>
                        <Tabs.Indicator />
                    </Tabs.Tab>
                </Tabs.List>
                <Tabs.Content value="a">A panel</Tabs.Content>
                <Tabs.Content value="b">B panel</Tabs.Content>
            </Tabs.Root>,
        );
        await settle();
        await userEvent.click(tabs()[1]!);
        await frames();
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ value: "b" });
        expect(tabs()[0]!.getAttribute("aria-selected")).toBe("true");
        quietly(() =>
            withRegistry(
                <Tabs.Root>
                    <Errored>
                        <Tabs.Label>Stray</Tabs.Label>
                    </Errored>
                </Tabs.Root>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<Tabs.Label> must be inside <Tabs.Tab>/,
        );
    });
});

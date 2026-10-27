import { compositeTestIds } from "@pureform/anatomy";
import { act, type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Tabs } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { navigationRegistry } from "../__fixtures__/registry";
import { Errored, mount, outside, quietly, settle } from "../testing/render";

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
        // Each tab wraps its icon, label, and indicator in its content.
        const content = byTestId(ids.tabContent);
        expect(content.parentElement).toBe(tabs()[0]);
        expect(content.className).toBe("tabs__tabContent");
        expect(content.getAttribute("data-pf-part")).toBe("tab-content");
        expect(
            [...content.children].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["icon", "label", "indicator"]);
        expect(panels().map((panel) => panel.hidden)).toEqual([
            false,
            true,
            true,
        ]);
    });

    it("selects with a click and the arrow keys, by direction, and reports each change", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
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

    it("addresses each tab's content by its slot, and passes inlineIcon to the registry", async () => {
        withRegistry(
            <Tabs
                aria-label="Trips"
                items={ITEMS}
                inlineIcon
                className={{ tabContent: "wide" }}
                slotProps={{ tabContent: { title: "content" } }}
                testId={{ tabContent: "trip" }}
            />,
        );
        await settle();
        expect(byTestId(ids.list).className).toBe(
            "tabs tabs--icon-true tabs--inlineIcon-true",
        );
        const contents = [
            ...document.querySelectorAll<HTMLElement>('[data-testid="trip"]'),
        ];
        expect(contents).toHaveLength(3);
        expect(contents[0]!.className).toBe("tabs__tabContent wide");
        expect(contents[0]!.title).toBe("content");
        expect(byTestId(ids.list).hasAttribute("inlineIcon")).toBe(false);
    });

    it("gives the page transition its own props", async () => {
        for (const transition of ["fadeThrough", "sharedAxis"] as const) {
            mount(
                <PureformProvider registry={navigationRegistry()}>
                    <Tabs
                        aria-label="Trips"
                        items={ITEMS}
                        transition={transition}
                        fadeThroughProps={{ className: "fade" }}
                        horizontalSharedAxisProps={{ className: "axis" }}
                    />
                </PureformProvider>,
            );
            await settle();
            const name = transition === "fadeThrough" ? "fade" : "axis";
            expect(document.querySelectorAll(`.${name}`)).toHaveLength(1);
            document.body.innerHTML = "";
        }
    });

    it("takes a function of each tab in the per-tab parts' keys", async () => {
        withRegistry(
            <Tabs
                aria-label="Trips"
                items={ITEMS}
                defaultValue="hotels"
                className={{
                    tab: (tab) => (tab.selected ? "on" : undefined),
                    list: "trips",
                }}
                style={{
                    label: (tab) => ({ opacity: tab.index === 2 ? 0.5 : 1 }),
                }}
                slotProps={{
                    content: (tab) => ({ title: tab.item.value }),
                }}
                unstyled={{ indicator: (tab) => tab.index === 0 }}
            />,
        );
        await settle();
        expect(tabs().map((tab) => tab.classList.contains("on"))).toEqual([
            false,
            true,
            false,
        ]);
        expect(byTestId(ids.list).classList.contains("trips")).toBe(true);
        const labels = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${ids.label}"]`,
            ),
        ];
        expect(labels[2]!.style.opacity).toBe("0.5");
        expect(panels().map((panel) => panel.title)).toEqual([
            "flights",
            "hotels",
            "cars",
        ]);
        const indicators = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${ids.indicator}"]`,
            ),
        ];
        expect(indicators[0]!.className).toBe("");
        expect(indicators[1]!.className).not.toBe("");
    });
});

describe("Tabs, composed", () => {
    it("asks when controlled, and throws for a part outside its tab", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string | null>) => void>();
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
        // Each tab wraps its children in its content, after the indication's layer.
        expect(
            tabs().map((tab) =>
                [...tab.children].map(
                    (part) =>
                        part.getAttribute("data-pf-part") ??
                        part.hasAttribute("data-ripple-layer"),
                ),
            ),
        ).toEqual([
            [true, "tab-content"],
            [true, "tab-content"],
        ]);
        expect(
            [...tabs()[1]!.lastElementChild!.children].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["label", "indicator"]);
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

describe("Tabs, the indicator's slide", () => {
    // The registry's parts have no styles here: lay them out as the preset does, each indicator
    // spanning its tab's content, with a transition.
    const style = document.createElement("style");
    style.textContent = `
        [data-pf-part="tab-content"] { position: relative; display: inline-flex; }
        [data-pf-part="indicator"] { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; transition: transform 200ms linear; }`;
    afterEach(() => style.remove());
    const registry = navigationRegistry();

    const letters = (value: string, indicators = ["a", "b"]) => (
        <PureformProvider registry={registry}>
            <Tabs.Root value={value}>
                <Tabs.List aria-label="Letters">
                    <Tabs.Tab value="a">
                        <Tabs.Label>A</Tabs.Label>
                        {indicators.includes("a") && <Tabs.Indicator />}
                    </Tabs.Tab>
                    <Tabs.Tab value="b">
                        <Tabs.Label>Bravo</Tabs.Label>
                        {indicators.includes("b") && <Tabs.Indicator />}
                    </Tabs.Tab>
                </Tabs.List>
            </Tabs.Root>
        </PureformProvider>
    );
    it("slides the new tab's indicator in from the old one's, not on mount", async () => {
        document.head.append(style);
        const value = outside("a");
        mount(<value.Holder>{(v) => letters(v)}</value.Holder>);
        await settle();
        const [a, b] = [
            ...document.querySelectorAll<HTMLElement>(
                `[data-testid="${ids.indicator}"]`,
            ),
        ];
        expect(a!.getAnimations()).toEqual([]);
        await value.set("b");
        const [slide] = b!.getAnimations();
        expect(slide).toBeDefined();
        slide!.pause();
        // From the old indicator's box, resized to the new one's content.
        const from = a!.getBoundingClientRect();
        const to = b!.parentElement!.getBoundingClientRect();
        expect(from.width).toBeLessThan(to.width);
        slide!.currentTime = 0;
        expect(b!.getBoundingClientRect().left).toBeCloseTo(from.left, 0);
        expect(b!.getBoundingClientRect().width).toBeCloseTo(from.width, 0);
        slide!.finish();
        expect(b!.getBoundingClientRect().left).toBeCloseTo(to.left, 0);
        expect(b!.getBoundingClientRect().width).toBeCloseTo(to.width, 0);
    });

    it("changes at once when the old tab has no indicator", async () => {
        document.head.append(style);
        const value = outside("a");
        mount(<value.Holder>{(v) => letters(v, ["b"])}</value.Holder>);
        await settle();
        await value.set("b");
        expect(byTestId(ids.indicator).getAnimations()).toEqual([]);
    });
});

describe("Tabs, scrollable", () => {
    it("passes scrollable to the tab list, and scrolls a newly selected tab into view", async () => {
        const many = Array.from({ length: 8 }, (_, i) => ({
            value: `tab${i}`,
            label: `Tab ${i}`,
        }));
        let select!: (value: string) => void;
        function Scrolling() {
            const [value, setValue] = useState<string | null>("tab0");
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            select = setValue;
            return (
                <Tabs
                    scrollable
                    value={value}
                    onValueChange={(details) => setValue(details.value)}
                    items={many}
                    slotProps={{
                        list: {
                            style: {
                                display: "flex",
                                width: 200,
                                overflow: "auto",
                            },
                        },
                        tab: { style: { flex: "0 0 120px" } },
                    }}
                />
            );
        }
        withRegistry(<Scrolling />);
        await settle();
        const list = byTestId(ids.list);
        expect(list.className).toContain("tabs--scrollable-true");
        expect(list.scrollLeft).toBe(0);
        act(() => select("tab6"));
        await frames();
        const tab = document.querySelectorAll(`[data-testid="${ids.tab}"]`)[6]!;
        const box = tab.getBoundingClientRect();
        const view = list.getBoundingClientRect();
        expect(list.scrollLeft).toBeGreaterThan(0);
        expect(box.right).toBeLessThanOrEqual(view.right + 1);
        expect(box.left).toBeGreaterThanOrEqual(view.left - 1);
    });
});

// The tabs: `value`, by a click on a tab; only the selected tab takes focus from Tab, Enter and
// Space click it, and the arrow keys left and right select the tab before or after, by direction.
// Each tab shows its panel. They aren't a form control.

import { compositeTestIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";

const ids = compositeTestIds.tabs;

const ITEMS = [
    { value: "flights", label: "Flights", content: "Flights panel" },
    { value: "hotels", label: "Hotels", content: "Hotels panel" },
    { value: "cars", label: "Cars", content: "Cars panel" },
];

const tabs = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLButtonElement>(`[data-testid="${ids.tab}"]`),
];

const tab = (host: HTMLElement, value: string) => {
    const found = tabs(host).find(
        (element) => element.getAttribute("data-value") === value,
    );
    if (!found) throw new Error(`no tab with the value ${value}`);
    return found;
};

/** The selected tab's value, or `null`, checked against the panels each tab shows. */
const read = (host: HTMLElement): string | null => {
    let selected: string | null = null;
    for (const element of tabs(host)) {
        const on = element.getAttribute("aria-selected") === "true";
        const panel = element.getAttribute("aria-controls");
        if (
            panel &&
            host.querySelector<HTMLElement>(`#${CSS.escape(panel)}`)?.hidden
        ) {
            throw new Error(
                `the tab ${element.dataset.value} is selected, its panel hidden`,
            );
        }
        if (on) selected = element.getAttribute("data-value");
    }
    for (const panel of host.querySelectorAll<HTMLElement>(
        `[data-testid="${ids.content}"]`,
    )) {
        const shown = !panel.hidden;
        const owner = host.querySelector(
            `#${CSS.escape(panel.getAttribute("aria-labelledby") ?? "")}`,
        );
        if (shown !== (owner?.getAttribute("aria-selected") === "true")) {
            throw new Error(`a panel shows ${String(shown)} against its tab`);
        }
    }
    return selected;
};

const click =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(tab(host, value), options);
    };

export const tabsCase: ComponentCase = {
    component: "Tabs",
    props: { "aria-label": "Trips", items: ITEMS },
    root: ids.root,
    examples: {
        "first selected": {},
        "second selected": { defaultValue: "hotels" },
        secondary: { variant: "secondary", defaultValue: "cars" },
        "secondary color": { color: "secondary" },
        "with icons": {
            items: ITEMS.map((item, index) => ({
                ...item,
                icon: ["✈", "⌂", "→"][index],
                mirrorIcon: index === 2,
            })),
        },
        "secondary, with icons": {
            variant: "secondary",
            items: ITEMS.map((item) => ({ ...item, icon: "★" })),
        },
        "one disabled": {
            items: [...ITEMS.slice(0, 2), { ...ITEMS[2]!, disabled: true }],
        },
        "without panels": {
            items: ITEMS.map(({ value, label }) => ({ value, label })),
        },
    },
    state: {
        prop: "value",
        from: "hotels",
        to: "cars",
        act: click("cars"),
        read,
    },
    keyboard: {
        focusable: (host) =>
            tabs(host).find(
                (element) => element.getAttribute("aria-selected") === "true",
            ) ?? tabs(host)[0]!,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
            { key: "{Home}", does: "change", to: "flights" },
            { key: "{End}", does: "change", to: "cars" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: "flights" },
                { key: "{ArrowRight}", does: "change", to: "cars" },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: "cars" },
                { key: "{ArrowRight}", does: "change", to: "flights" },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
        },
    },
};

// The tabs: `value`, by a click on a tab; only the selected tab takes focus from Tab, Enter and
// Space click it, and the arrow keys left and right select the tab before or after, by direction.
// They aren't a form control.

import { compositeTestIds, tabsAnatomy } from "@pureform/anatomy";

import { allByRole, optionalFlagOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const ids = compositeTestIds.tabs;

const ITEMS = [
    { value: "flights", label: "Flights", content: "Flights panel" },
    { value: "hotels", label: "Hotels", content: "Hotels panel" },
    { value: "cars", label: "Cars", content: "Cars panel" },
];

/** The tabs, by role. */
const tabs = (host: HTMLElement) => allByRole(host, "tab");

const tab = (host: HTMLElement, value: string) => {
    const found = tabs(host)[ITEMS.findIndex((item) => item.value === value)];
    if (!found) throw new Error(`no tab with the value ${value}`);
    return found;
};

/** The selected tab's value (by its place), or `null`, from `aria-selected`; only one may be
 *  selected. */
const read = (host: HTMLElement): string | null => {
    const selected = tabs(host).flatMap((element, index) =>
        optionalFlagOf(element, "selected") ? [ITEMS[index]!.value] : [],
    );
    if (selected.length > 1)
        throw new Error(`${selected.length} tabs are selected`);
    return selected[0] ?? null;
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
        "shared axis": {
            transition: "sharedAxis",
            transitionScrim: true,
            defaultValue: "hotels",
        },
        secondary: { variant: "secondary", defaultValue: "cars" },
        scrollable: { scrollable: true, defaultValue: "hotels" },
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
            tabs(host).find((element) => optionalFlagOf(element, "selected")) ??
            tabs(host)[0]!,
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
    // The tabs have no disabled state of their own; a tab has.
    indication: itemSources(tabsAnatomy, ITEMS, { disabled: undefined }),
};

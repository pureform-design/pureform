// The accordion and the tree, the expandable hierarchies.
//
// The accordion: `value`, the expanded items, by a click on an item's header. Each header is a
// button Tab reaches, which Enter and Space toggle; the up and down arrows move between the headers
// (from the first, up goes round to the last), and Home and End go to the first and last. Left and
// right do nothing in either direction.
//
// The tree: `expandedValue`, the expanded branches, by a click on a branch's row. Tab reaches the
// first row; Enter and Space toggle a branch (and select it); right expands a branch and left
// collapses it, by direction; down goes to the next row shown and Home and End to the first and
// last.

import { accordionAnatomy, testIds, treeAnatomy } from "@pureform/anatomy";

import { allByRole, flagOf } from "../aria";
import type { ActOptions, ComponentCase, KeyCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const a = testIds.accordion;
const t = testIds.tree;

const all = (host: ParentNode, id: string) => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

const ITEMS = [
    {
        value: "shipping",
        title: "Shipping",
        description: "2 to 4 days",
        leading: "✈",
        content: "Free over 50",
    },
    { value: "returns", title: "Returns", content: "30 days to return" },
    { value: "gifts", title: "Gifts", content: "Wrapped on request" },
];

const triggers = (host: HTMLElement) => all(host, a.trigger);

/** The expanded items' values: each header's `aria-expanded`. */
const readAccordion = (host: HTMLElement): string[] =>
    triggers(host).flatMap((trigger, index) =>
        flagOf(trigger, "expanded") ? [ITEMS[index]!.value] : [],
    );

const clickAccordion =
    (index: number) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(triggers(host)[index]!, options);
    };

// The headers go up and down, the same in both directions.
const ACCORDION_ARROWS: readonly KeyCase[] = [
    {
        key: "{ArrowDown}",
        does: "nothing",
        focuses: (host) => triggers(host)[1]!,
    },
    {
        key: "{ArrowUp}",
        does: "nothing",
        focuses: (host) => triggers(host)[2]!,
    },
    { key: "{ArrowLeft}", does: "nothing" },
    { key: "{ArrowRight}", does: "nothing" },
];

export const accordionCase: ComponentCase = {
    component: "Accordion",
    props: { items: ITEMS },
    root: a.root,
    examples: {
        collapsed: {},
        "first expanded": { defaultValue: ["shipping"] },
        "two expanded": { multiple: true, defaultValue: ["shipping", "gifts"] },
        compact: { density: "compact", defaultValue: ["returns"] },
        "one disabled": {
            items: [ITEMS[0]!, ITEMS[1]!, { ...ITEMS[2]!, disabled: true }],
        },
    },
    state: {
        prop: "value",
        from: [],
        to: ["returns"],
        act: clickAccordion(1),
        read: readAccordion,
    },
    keyboard: {
        focusable: (host) => triggers(host)[0]!,
        keys: [
            { key: "{Enter}", does: "change", to: ["shipping"] },
            { key: " ", does: "change", to: ["shipping"] },
            {
                key: "{End}",
                does: "nothing",
                focuses: (host) => triggers(host)[2]!,
            },
        ],
        arrows: { ltr: ACCORDION_ARROWS, rtl: ACCORDION_ARROWS },
    },
    indication: itemSources(accordionAnatomy, ITEMS),
};

const FILES = [
    {
        value: "src",
        label: "src",
        leading: "▤",
        children: [
            { value: "index", label: "index.ts" },
            { value: "util", label: "util.ts" },
        ],
    },
    { value: "readme", label: "README.md" },
];

const rows = (host: HTMLElement) => all(host, t.node);

/** The branches, in order (only the first level has any). */
const BRANCHES = FILES.filter((file) => file.children !== undefined);

/** The expanded branches' values: the tree items that say `aria-expanded` are the branches, in
 *  order (the web's branch element, React Native's row). */
const readTree = (host: HTMLElement): string[] =>
    allByRole(host, "treeitem")
        .filter((item) => item.hasAttribute("aria-expanded"))
        .flatMap((branch, index) =>
            flagOf(branch, "expanded") ? [BRANCHES[index]!.value] : [],
        );

const changes = (to: string[]) => ({
    does: "change" as const,
    to,
});

export const treeCase: ComponentCase = {
    component: "Tree",
    props: { "aria-label": "Files", items: FILES },
    root: t.root,
    examples: {
        collapsed: {},
        expanded: { defaultExpandedValue: ["src"] },
        selected: {
            defaultExpandedValue: ["src"],
            defaultSelectedValue: ["index"],
        },
        labelled: { "aria-label": undefined, label: "Files" },
        "secondary color, compact": {
            color: "secondary",
            density: "compact",
            defaultSelectedValue: ["readme"],
        },
    },
    state: {
        prop: "expandedValue",
        from: [],
        to: ["src"],
        act: async (host, options = {}) => {
            await userEvent.click(rows(host)[0]!, options);
        },
        read: readTree,
    },
    keyboard: {
        focusable: (host) => rows(host)[0]!,
        // The tree has no disabled state of its own; a node has.
        disables: false,
        keys: [
            { key: "{Enter}", ...changes(["src"]) },
            { key: " ", ...changes(["src"]) },
            {
                key: "{End}",
                does: "nothing",
                focuses: (host) => rows(host).at(-1)!,
            },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowRight}", ...changes(["src"]) },
                { key: "{ArrowLeft}", does: "nothing" },
                {
                    key: "{ArrowDown}",
                    does: "nothing",
                    focuses: (host) => rows(host).at(-1)!,
                },
                { key: "{ArrowUp}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", ...changes(["src"]) },
                { key: "{ArrowRight}", does: "nothing" },
                {
                    key: "{ArrowDown}",
                    does: "nothing",
                    focuses: (host) => rows(host).at(-1)!,
                },
                { key: "{ArrowUp}", does: "nothing" },
            ],
        },
    },
    // The tree has no disabled state of its own; a node has.
    indication: itemSources(treeAnatomy, FILES, { disabled: undefined }),
};

// The navigation bar and rail: `value`, the current destination, by a click on another; each
// destination is a button (or a link) that Tab reaches in turn, and Enter and Space choose it.
// Arrow keys do nothing. They aren't a form control.

import {
    navigationBarAnatomy,
    navigationRailAnatomy,
    testIds,
} from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ComponentName } from "../harness/scene";
import type { ActOptions, ComponentCase } from "./types";
import { byTestId, itemSources } from "./types";

const ITEMS = [
    { value: "home", label: "Home", icon: "⌂" },
    { value: "search", label: "Search", icon: "⌕" },
    { value: "settings", label: "Settings", icon: "⚙" },
];

/** The case for the navigation bar or rail. */
export const navigationCase = (
    component: ComponentName,
    ids: typeof testIds.navigationBar | typeof testIds.navigationRail,
    anatomy: typeof navigationBarAnatomy | typeof navigationRailAnatomy,
): ComponentCase => {
    const items = (host: HTMLElement) => [
        ...host.querySelectorAll<HTMLElement>(`[data-testid="${ids.item}"]`),
    ];
    const item = (host: HTMLElement, value: string) => {
        const found = items(host).find(
            (element) => element.getAttribute("data-value") === value,
        );
        if (!found) throw new Error(`no destination with the value ${value}`);
        return found;
    };
    /** The current destination's value, or `null`; only one may be current. */
    const read = (host: HTMLElement): string | null => {
        const current = items(host).filter((element) =>
            element.hasAttribute("aria-current"),
        );
        if (current.length > 1) {
            throw new Error(`${current.length} destinations are current`);
        }
        return current[0]?.getAttribute("data-value") ?? null;
    };
    const click =
        (value: string) =>
        async (host: HTMLElement, options: ActOptions = {}) => {
            await userEvent.click(item(host, value), options);
        };
    return {
        component,
        props: { "aria-label": "Main", items: ITEMS },
        root: ids.root,
        examples: {
            "none current": {},
            current: { defaultValue: "home" },
            "secondary color": { color: "secondary", defaultValue: "search" },
            "with a mirrored icon": {
                defaultValue: "home",
                items: [
                    ...ITEMS.slice(0, 2),
                    {
                        value: "next",
                        label: "Next",
                        icon: "→",
                        mirrorIcon: true,
                    },
                ],
            },
            links: {
                defaultValue: "home",
                items: ITEMS.map((entry) => ({
                    ...entry,
                    href: `#${entry.value}`,
                })),
            },
            "without icons": {
                defaultValue: "search",
                items: ITEMS.map(({ value, label }) => ({ value, label })),
            },
            "one disabled": {
                defaultValue: "home",
                items: [...ITEMS.slice(0, 2), { ...ITEMS[2]!, disabled: true }],
            },
            disabled: { disabled: true, defaultValue: "home" },
        },
        state: {
            prop: "value",
            from: "search",
            to: "home",
            act: click("home"),
            read,
        },
        keyboard: {
            // Tab reaches the first destination; the keys choose it.
            focusable: (host) => items(host)[0] ?? byTestId(host, ids.root),
            keys: [
                { key: "{Enter}", does: "change" },
                { key: " ", does: "change" },
            ],
        },
        indication: itemSources(anatomy, ITEMS),
    };
};

export const navigationBar = navigationCase(
    "NavigationBar",
    testIds.navigationBar,
    navigationBarAnatomy,
);
export const navigationRail = navigationCase(
    "NavigationRail",
    testIds.navigationRail,
    navigationRailAnatomy,
);

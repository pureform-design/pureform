// The toolbar: icon buttons and a text button in a docked or floating bar, standard or vibrant,
// horizontal or vertical, and one with an overflow menu. Enter and Space click the focused
// element; the arrow keys along the bar move focus between its elements (mirrored in `rtl`), and
// the others do nothing.

import { iconButtonAnatomy, testIds } from "@pureform/anatomy";

import type { ComponentCase, KeyCase } from "./types";
import { itemSources } from "./types";

const ITEMS = [
    { value: "bold", label: "Bold", icon: "B" },
    { value: "italic", label: "Italic", icon: "I", selected: true },
    { value: "underline", label: "Underline", icon: "U" },
    { value: "done", label: "Done" },
];

const elements = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLButtonElement>("[data-pf-toolbar-item]"),
];
const first = (host: HTMLElement) => elements(host)[0]!;
const second = (host: HTMLElement) => elements(host)[1]!;
const last = (host: HTMLElement) => elements(host).at(-1)!;

const moves = (
    key: string,
    focuses: (host: HTMLElement) => HTMLElement,
): KeyCase => ({ key, does: "nothing", focuses });
const stays = (key: string): KeyCase => ({ key, does: "nothing" });

export const toolbar: ComponentCase = {
    component: "Toolbar",
    props: { "aria-label": "Formatting", items: ITEMS },
    root: testIds.toolbar.root,
    examples: {
        floating: {},
        "floating, vibrant": { color: "vibrant" },
        vertical: { orientation: "vertical", items: ITEMS.slice(0, 3) },
        docked: { placement: "docked" },
        "docked, vibrant": { placement: "docked", color: "vibrant" },
    },
    // An overflow toolbar measures its elements once it's in the browser and hides those that
    // don't fit (the server renders them all), so only the browser suites run it.
    opened: { overflow: { overflow: true } },
    keyboard: {
        focusable: first,
        // The toolbar has no disabled state; its elements have.
        disables: false,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
            moves("{End}", last),
        ],
        arrows: {
            ltr: [
                moves("{ArrowLeft}", last),
                moves("{ArrowRight}", second),
                stays("{ArrowUp}"),
                stays("{ArrowDown}"),
            ],
            rtl: [
                moves("{ArrowLeft}", second),
                moves("{ArrowRight}", last),
                stays("{ArrowUp}"),
                stays("{ArrowDown}"),
            ],
        },
    },
    indication: itemSources(iconButtonAnatomy, ITEMS, { disabled: undefined }),
};

// The splitter: two panes with a divider between them. The divider takes focus (a `separator`
// with a value, its first pane's size); the arrow keys along the panes move it a percent, by
// direction, and Home moves it to the start. Enter and Space do nothing (neither pane collapses).
// It isn't a form control, and has no disabled state of its own.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.splitter;

const PANES = [
    { id: "list", content: "List" },
    { id: "detail", content: "Detail" },
];

const trigger = (host: HTMLElement) => byTestId(host, ids.resizeTrigger);

/** The sizes: the first pane's (the divider's value) and the rest. */
const read = (host: HTMLElement): number[] => {
    const now = Number(trigger(host).getAttribute("aria-valuenow"));
    return [now, 100 - now];
};

export const splitter: ComponentCase = {
    component: "Splitter",
    props: { panes: PANES, resizeLabel: "Resize list" },
    root: ids.root,
    examples: {
        horizontal: {},
        vertical: { orientation: "vertical" },
        "a third and two": { defaultSize: [33, 67] },
        "three panes": {
            panes: [...PANES, { id: "extra", content: "Extra" }],
        },
        "free resizing": { anchors: [] },
    },
    state: {
        prop: "size",
        from: [50, 50],
        to: [51, 49],
        async act(host) {
            trigger(host).focus();
            await userEvent.keyboard("{ArrowRight}");
        },
        read,
    },
    keyboard: {
        focusable: trigger,
        disables: false,
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
            { key: "{Home}", does: "change", to: [0, 100] },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: [49, 51] },
                { key: "{ArrowRight}", does: "change", to: [51, 49] },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: [51, 49] },
                { key: "{ArrowRight}", does: "change", to: [49, 51] },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
        },
    },
};

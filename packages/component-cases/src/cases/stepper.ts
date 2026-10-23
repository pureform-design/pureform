// The stepper: `step`, by a click on a header; only the current header takes focus from Tab, Enter
// and Space press it, and the arrow keys of the orientation (a row's by direction) move focus
// between the headers, without changing the step, with Home and End to the first and last. Each
// step shows its content while it's current. It isn't a form control, and has no disabled state of
// its own (a step has).

import { stepperAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { itemSources } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.stepper;

const ITEMS = [
    { label: "Address", content: "Address form" },
    { label: "Payment", caption: "Optional", content: "Payment form" },
    { label: "Review", content: "Review the order" },
];

const triggers = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLButtonElement>(
        `[data-testid="${ids.trigger}"]`,
    ),
];

const trigger = (host: HTMLElement, index: number) => triggers(host)[index]!;

/** The current step, checked against the contents each header names: the one whose header is
 *  selected shows, and the rest are hidden. */
const read = (host: HTMLElement): number => {
    let current = -1;
    for (const [index, element] of triggers(host).entries()) {
        const on = element.getAttribute("aria-selected") === "true";
        const content = host.querySelector<HTMLElement>(
            `#${CSS.escape(element.getAttribute("aria-controls") ?? "")}`,
        );
        if (content && content.hidden === on) {
            throw new Error(
                `step ${index} is ${on ? "current" : "not current"}, its content ${content.hidden ? "hidden" : "shown"}`,
            );
        }
        if (on) current = index;
    }
    return current;
};

const click =
    (index: number) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(trigger(host, index), options);
    };

const focusing = (index: number) => (host: HTMLElement) => trigger(host, index);

export const stepper: ComponentCase = {
    component: "Stepper",
    props: { "aria-label": "Checkout", items: ITEMS },
    root: ids.root,
    examples: {
        "first step": {},
        "second step": { defaultStep: 1 },
        "shared axis": { transition: "sharedAxis", defaultStep: 1 },
        vertical: { orientation: "vertical" },
        "vertical, second step": { orientation: "vertical", defaultStep: 1 },
        "every step done": { defaultStep: 3 },
        "with an icon and an error": {
            items: [
                { label: "Address", content: "Address form" },
                {
                    label: "Payment",
                    icon: "★",
                    error: true,
                    content: "Payment form",
                },
                { label: "Review", icon: "✓", content: "Review" },
            ],
            defaultStep: 2,
        },
        linear: { linear: true, defaultStep: 1 },
        "done steps not editable": {
            items: ITEMS.map((item) => ({ ...item, editable: false })),
            defaultStep: 2,
        },
        "without content": {
            items: ITEMS.map(({ label }) => ({ label })),
        },
        denser: { density: "-2" },
    },
    state: {
        prop: "step",
        from: 1,
        to: 2,
        act: click(2),
        read,
    },
    keyboard: {
        focusable: (host) =>
            triggers(host).find(
                (element) => element.getAttribute("aria-selected") === "true",
            ) ?? trigger(host, 0),
        // The stepper has no disabled state of its own.
        disables: false,
        keys: [
            { key: "{Enter}", does: "click" },
            { key: " ", does: "click" },
            { key: "{Home}", does: "nothing", focuses: focusing(0) },
            { key: "{End}", does: "nothing", focuses: focusing(2) },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "nothing", focuses: focusing(0) },
                { key: "{ArrowRight}", does: "nothing", focuses: focusing(2) },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "nothing", focuses: focusing(2) },
                { key: "{ArrowRight}", does: "nothing", focuses: focusing(0) },
                { key: "{ArrowUp}", does: "nothing" },
                { key: "{ArrowDown}", does: "nothing" },
            ],
        },
    },
    // A step has a disabled state; the stepper has none.
    indication: itemSources(stepperAnatomy, ITEMS, { disabled: undefined }),
};

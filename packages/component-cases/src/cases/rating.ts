// The rating: `value`, a radio group of stars (a `radio` each, the chosen one checked) with a
// hidden input that submits the value, half values, a read-only display, and arrow keys that
// move by a star, by direction. A star is filled by its `fill` part, or half by `halfFill`; the
// stars also preview the one under the pointer, so the state is read from the hidden input.

import { testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.rating;

const items = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${ids.item}"]`),
];

const hidden = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>("input[hidden]");

/** The hidden input's value. The stars and the checked radio also preview the star under the
 *  pointer, so only the input shows the value itself. */
const read = (host: HTMLElement): number => {
    const input = hidden(host);
    if (!input) throw new Error("no hidden input");
    return Math.max(0, Number(input.value));
};

const click =
    (star: number) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(items(host)[star - 1]!, options);
    };

export const rating: ComponentCase = {
    component: "Rating",
    props: { label: "Quality" },
    root: ids.root,
    examples: {
        "nothing chosen": {},
        chosen: { defaultValue: 3 },
        "half star": { allowHalf: true, defaultValue: 2.5 },
        "secondary color": { color: "secondary", defaultValue: 4 },
        large: { size: "large", defaultValue: 3 },
        small: { size: "small", defaultValue: 3 },
        "three stars": { count: 3, defaultValue: 2 },
        "read-only": { readOnly: true, defaultValue: 4 },
        disabled: { disabled: true, defaultValue: 3 },
    },
    state: { prop: "value", from: 1, to: 3, act: click(3), read },
    form: {
        control: (host) => hidden(host)!,
        disabled: (host) =>
            byTestId(host, ids.control).hasAttribute("data-disabled"),
        submits: {
            props: { name: "quality", defaultValue: 3 },
            entries: [["quality", "3"]],
        },
    },
    keyboard: {
        focusable: (host) =>
            items(host).find(
                (item) => item.getAttribute("aria-checked") === "true",
            ) ?? items(host)[0]!,
        keys: [
            { key: " ", does: "nothing" },
            { key: "{Enter}", does: "nothing" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: 0 },
                { key: "{ArrowRight}", does: "change", to: 2 },
                { key: "{ArrowUp}", does: "change", to: 0 },
                { key: "{ArrowDown}", does: "change", to: 2 },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: 2 },
                { key: "{ArrowRight}", does: "change", to: 0 },
                { key: "{ArrowUp}", does: "change", to: 0 },
                { key: "{ArrowDown}", does: "change", to: 2 },
            ],
        },
    },
};

// The rating: `value`, a radio group of stars (a `radio` each, the chosen one checked) with a
// hidden input that submits the value, half values, a read-only display, and arrow keys that
// move by a star, by direction. A star is filled by its `fill` part, or half by `halfFill`. The
// state is the checked star's place among the radios: the stars preview the one under the
// pointer (so a click moves the pointer off after), and with nothing chosen the first star is
// checked to take focus, so ARIA reads 0 as 1 (the cases never read a 0).

import { testIds } from "@pureform/anatomy";

import { allByRole, checkedOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.rating;

/** The stars, by role. */
const items = (host: HTMLElement) => allByRole(host, "radio");

const hidden = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>("input[hidden]");

/** The checked star's place, from 1. */
const read = (host: HTMLElement): number => {
    const checked = items(host).findIndex((item) => checkedOf(item) === true);
    if (checked < 0) throw new Error("no star is checked");
    return checked + 1;
};

const click =
    (star: number) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(items(host)[star - 1]!, options);
        // The stars preview the one under the pointer, in ARIA too.
        await userEvent.unhover(items(host)[star - 1]!);
    };

const FROM_2 = { defaultValue: 2 };

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
            items(host).find((item) => checkedOf(item) === true) ??
            items(host)[0]!,
        keys: [
            { key: " ", does: "nothing" },
            { key: "{Enter}", does: "nothing" },
        ],
        // From 2, so a step down reads 1 rather than a 0 ARIA can't tell from 1.
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: 1, props: FROM_2 },
                { key: "{ArrowRight}", does: "change", to: 3, props: FROM_2 },
                { key: "{ArrowUp}", does: "change", to: 1, props: FROM_2 },
                { key: "{ArrowDown}", does: "change", to: 3, props: FROM_2 },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: 3, props: FROM_2 },
                { key: "{ArrowRight}", does: "change", to: 1, props: FROM_2 },
                { key: "{ArrowUp}", does: "change", to: 1, props: FROM_2 },
                { key: "{ArrowDown}", does: "change", to: 3, props: FROM_2 },
            ],
        },
    },
};

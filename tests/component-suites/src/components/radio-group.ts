// The radio group: `value`, a native radio per item that submits, resets, and validates, Space to
// check the focused radio, and arrow keys that move to the radio before or after, by direction.

import { compositeTestIds, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.radio;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

const inputs = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLInputElement>(`[data-testid="${ids.input}"]`),
];

const input = (host: HTMLElement, value: string) => {
    const found = inputs(host).find((element) => element.value === value);
    if (!found) throw new Error(`no radio with the value ${value}`);
    return found;
};

/** The checked radio's value, or `null`, checked against each radio's `data-state`. */
const read = (host: HTMLElement): string | null => {
    let checked: string | null = null;
    for (const element of inputs(host)) {
        const shown =
            element
                .closest(`[data-testid="${ids.root}"]`)
                ?.getAttribute("data-state") === "checked";
        if (shown !== element.checked) {
            throw new Error(
                `the radio ${element.value} is ${String(element.checked)}, its root shows ${String(shown)}`,
            );
        }
        if (element.checked) checked = element.value;
    }
    return checked;
};

const click =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(input(host, value), options);
    };

export const radioGroup: ComponentCase = {
    component: "RadioGroup",
    props: { "aria-label": "Size", items: ITEMS },
    root: compositeTestIds.radioGroup.root,
    examples: {
        "nothing checked": {},
        checked: { defaultValue: "m" },
        "secondary color": { color: "secondary", defaultValue: "s" },
        invalid: { invalid: true, defaultValue: "s" },
        compact: { density: "compact", defaultValue: "l" },
        disabled: { disabled: true, defaultValue: "m" },
        "one disabled": {
            defaultValue: "s",
            items: [...ITEMS.slice(0, 2), { ...ITEMS[2]!, disabled: true }],
        },
        required: { required: true, name: "size" },
    },
    state: { prop: "value", from: "m", to: "l", act: click("l"), read },
    form: {
        control: (host) => input(host, "s"),
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "size", defaultValue: "l" },
            entries: [["size", "l"]],
        },
        omits: { name: "size" },
        resets: true,
        required: {
            props: { name: "size", required: true },
            satisfy: click("s"),
        },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: (host) =>
            inputs(host).find((element) => element.checked) ?? inputs(host)[0]!,
        keys: [
            { key: " ", does: "nothing" },
            {
                key: " ",
                does: "change",
                to: "s",
                props: { defaultValue: null },
            },
            { key: "{Enter}", does: "nothing" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: "s" },
                { key: "{ArrowRight}", does: "change", to: "l" },
                { key: "{ArrowUp}", does: "change", to: "s" },
                { key: "{ArrowDown}", does: "change", to: "l" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: "l" },
                { key: "{ArrowRight}", does: "change", to: "s" },
                { key: "{ArrowUp}", does: "change", to: "s" },
                { key: "{ArrowDown}", does: "change", to: "l" },
            ],
        },
    },
};

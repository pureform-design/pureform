// The radio group: `value`, a native radio per item that submits, resets, and validates, Space to
// check the focused radio, and arrow keys that move to the radio before or after, by direction.

import { compositeTestIds, radioAnatomy, testIds } from "@pureform/anatomy";

import { allByRole, byRole, checkedOf, nameOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId, itemSources } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.radio;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

const labelOf = (value: string) =>
    ITEMS.find((item) => item.value === value)!.label;

/** The radios, by role: the web's native inputs, React Native's pressables. */
const radios = (host: HTMLElement) => allByRole(host, "radio");

/** The radio with the item's label as its accessible name. */
const radio = (host: HTMLElement, value: string) =>
    byRole(host, "radio", { name: labelOf(value) });

/** The checked radio's value, from `aria-checked` and its name, or `null`. */
const read = (host: HTMLElement): string | null => {
    const checked = radios(host).filter(
        (element) => checkedOf(element) === true,
    );
    if (checked.length > 1)
        throw new Error(`${checked.length} radios are checked`);
    if (!checked[0]) return null;
    const name = nameOf(checked[0]);
    const item = ITEMS.find((one) => one.label === name);
    if (!item) throw new Error(`the checked radio is named ${name}`);
    return item.value;
};

const click =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(radio(host, value), options);
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
        control: (host) => radio(host, "s") as HTMLInputElement,
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
            radios(host).find((element) => checkedOf(element) === true) ??
            radios(host)[0]!,
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
    indication: itemSources(radioAnatomy, ITEMS),
};

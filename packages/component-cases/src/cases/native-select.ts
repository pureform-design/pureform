// The native select: `value`, chosen with the platform's own `<select>`, which submits, resets, and
// validates itself; its options and `<optgroup>`s; and a chevron that takes no pointer. The list is
// the platform's, so a test chooses through the element (`selectOptions`) rather than a menu.

import { nativeSelectAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.nativeSelect;

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

const select = (host: HTMLElement) =>
    byTestId<HTMLSelectElement>(host, ids.select);

/** The chosen option's value. */
const read = (host: HTMLElement): string => select(host).value;

const choose =
    (value: string) =>
    async (host: HTMLElement, options: ActOptions = {}) => {
        // A disabled select can't be chosen from: the user's click on it does nothing.
        if (select(host).disabled && options.force) {
            await userEvent.click(select(host), options);
            return;
        }
        await userEvent.selectOptions(select(host), value);
    };

export const nativeSelect: ComponentCase = {
    component: "NativeSelect",
    props: { "aria-label": "Size", items: ITEMS },
    root: ids.root,
    examples: {
        "first option": {},
        chosen: { defaultValue: "m" },
        placeholder: { placeholder: "Pick a size" },
        "option groups": {
            defaultValue: "m",
            items: [
                { value: "s", label: "Small", group: "Everyday" },
                { value: "m", label: "Medium", group: "Everyday" },
                { value: "xl", label: "Extra large", group: "Tall" },
                { value: "any", label: "Any" },
            ],
        },
        "disabled option": {
            items: [
                { value: "s", label: "Small" },
                { value: "m", label: "Medium", disabled: true },
            ],
        },
        invalid: { invalid: true, defaultValue: "m" },
        disabled: { disabled: true, defaultValue: "m" },
        required: { required: true, placeholder: "Pick a size", name: "size" },
    },
    state: { prop: "value", from: "m", to: "l", act: choose("l"), read },
    form: {
        control: select,
        disabled: (host) => select(host).disabled,
        submits: {
            props: { name: "size", defaultValue: "l" },
            entries: [["size", "l"]],
        },
        resets: true,
        required: {
            props: { name: "size", required: true, placeholder: "Pick a size" },
            satisfy: choose("l"),
        },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: select,
        keys: [],
        arrows: {
            ltr: [
                { key: "{ArrowDown}", does: "change", to: "l" },
                { key: "{ArrowUp}", does: "change", to: "s" },
            ],
            rtl: [
                { key: "{ArrowDown}", does: "change", to: "l" },
                { key: "{ArrowUp}", does: "change", to: "s" },
            ],
        },
    },
    indication: ownSource(nativeSelectAnatomy),
};

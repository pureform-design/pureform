// The number field: `value`, the text of a number, which the increment button and the arrow keys
// step; a native input (a `spinbutton`) that submits it. The left and right arrows move the
// caret, not the value. Its two buttons each show indication; Zag keeps them out of the tab
// order, so the case moves keyboard focus to the checked one itself.

import { numberFieldAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.numberField;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

/** The input's text, checked against the value the spinbutton reports. */
const read = (host: HTMLElement): string => {
    const element = input(host);
    const now = element.getAttribute("aria-valuenow");
    if ((now ?? "") !== element.value) {
        throw new Error(
            `the input shows ${JSON.stringify(element.value)}, aria-valuenow is ${JSON.stringify(now)}`,
        );
    }
    return element.value;
};

const caret = [
    { key: "{ArrowLeft}", does: "nothing" },
    { key: "{ArrowRight}", does: "nothing" },
    { key: "{ArrowUp}", does: "change", to: "3" },
    { key: "{ArrowDown}", does: "change", to: "1" },
] as const;

/** Keyboard focus on a button out of the tab order: a key first, so the browser shows it as the
 *  keyboard's (`:focus-visible`). */
const focusButton = async (_host: HTMLElement, trigger: HTMLElement) => {
    await userEvent.keyboard("{Shift}");
    trigger.focus({ focusVisible: true } as FocusOptions);
};

export const numberField: ComponentCase = {
    component: "NumberField",
    props: { label: "Quantity" },
    root: ids.root,
    examples: {
        empty: {},
        filled: { defaultValue: "12" },
        outlined: { variant: "outlined", defaultValue: "12" },
        "outlined and empty": { variant: "outlined" },
        "with an icon": { leadingIcon: "#", defaultValue: "12" },
        affixes: { prefixText: "$", suffixText: "kg", defaultValue: "12" },
        "outlined affixes with an icon": {
            variant: "outlined",
            leadingIcon: "#",
            prefixText: "$",
            suffixText: "kg",
            defaultValue: "12",
        },
        "at the maximum": { max: 12, defaultValue: "12" },
        "supporting text": { supportingText: "Up to 99" },
        error: { error: "Too many", defaultValue: "120" },
        "secondary color": { color: "secondary", defaultValue: "12" },
        compact: { density: "compact", defaultValue: "12" },
        disabled: { disabled: true, defaultValue: "12" },
        "read-only": { readOnly: true, defaultValue: "12" },
        grouped: { defaultValue: "1,234,567.5" },
    },
    state: {
        prop: "value",
        from: "2",
        to: "3",
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(
                byTestId(host, ids.incrementTrigger),
                options,
            );
        },
        read,
    },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "quantity", defaultValue: "12" },
            entries: [["quantity", "12"]],
        },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: input,
        keys: [{ key: "{Enter}", does: "nothing" }],
        arrows: { ltr: caret, rtl: caret },
    },
    indication: {
        anatomy: numberFieldAnatomy,
        focus: focusButton,
        focusMoves: true,
    },
};

// The checkbox: `checked` (with "indeterminate"), a native input that submits, resets, and
// validates, and Space to toggle.

import { checkboxAnatomy, testIds } from "@pureform/anatomy";

import { byRole, checkedOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.checkbox;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

/** The element with the checkbox role: the web's native input, React Native's pressable. */
const control = (host: HTMLElement) => byRole(host, "checkbox");

type Checked = boolean | "indeterminate";

/** Its `aria-checked` (the web's native input's checked or indeterminate state). */
const read = (host: HTMLElement): Checked => {
    const checked = checkedOf(control(host));
    return checked === "mixed" ? "indeterminate" : checked;
};

const click = async (host: HTMLElement, options: ActOptions = {}) => {
    await userEvent.click(control(host), options);
};

export const checkbox: ComponentCase = {
    component: "Checkbox",
    props: { "aria-label": "Accept the terms" },
    root: ids.root,
    examples: {
        unchecked: {},
        checked: { defaultChecked: true },
        indeterminate: { defaultChecked: "indeterminate" },
        "error color": { color: "error", invalid: true },
        disabled: { disabled: true },
        "disabled and checked": { disabled: true, defaultChecked: true },
        "read-only": { readOnly: true, defaultChecked: true },
        required: { required: true, name: "terms" },
    },
    unmirrored: ["check-icon", "indeterminate-icon"],
    state: { prop: "checked", from: false, to: true, act: click, read },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "terms", value: "yes", defaultChecked: true },
            entries: [["terms", "yes"]],
        },
        omits: { name: "terms", value: "yes" },
        resets: true,
        required: { props: { name: "terms", required: true }, satisfy: click },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: control,
        keys: [
            { key: " ", does: "change" },
            { key: "{Enter}", does: "nothing" },
        ],
    },
    indication: ownSource(checkboxAnatomy),
};

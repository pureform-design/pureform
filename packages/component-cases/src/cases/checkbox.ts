// The checkbox: `checked` (with "indeterminate"), a native input that submits, resets, and
// validates, and Space to toggle.

import { checkboxAnatomy, testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.checkbox;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

type Checked = boolean | "indeterminate";

const STATES: Record<string, Checked> = {
    checked: true,
    unchecked: false,
    indeterminate: "indeterminate",
};

/** The native input's state, checked against the machine's `data-state` on the root. */
const read = (host: HTMLElement): Checked => {
    const native = input(host).indeterminate
        ? "indeterminate"
        : input(host).checked;
    const shown = STATES[byTestId(host, ids.root).dataset.state ?? ""];
    if (shown !== native) {
        throw new Error(
            `the input is ${String(native)}, the root shows ${String(shown)}`,
        );
    }
    return native;
};

const click = async (host: HTMLElement, options: ActOptions = {}) => {
    await userEvent.click(input(host), options);
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
        focusable: input,
        keys: [
            { key: " ", does: "change" },
            { key: "{Enter}", does: "nothing" },
        ],
    },
    indication: ownSource(checkboxAnatomy),
};

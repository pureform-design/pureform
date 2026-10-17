// The switch: `checked`, a native checkbox with `role="switch"` that submits, resets, and
// validates, and Space to toggle.

import { testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.switchControl;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

/** The native input's state, checked against the machine's `data-state` on the root. */
const read = (host: HTMLElement): boolean => {
    const native = input(host).checked;
    const shown = byTestId(host, ids.root).dataset.state === "checked";
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

export const switchControl: ComponentCase = {
    component: "Switch",
    props: { "aria-label": "Wi-Fi" },
    root: ids.root,
    examples: {
        off: {},
        on: { defaultChecked: true },
        "on, with an icon": { defaultChecked: true, icon: "✓" },
        "secondary color": { color: "secondary", defaultChecked: true },
        disabled: { disabled: true },
        "disabled and on": { disabled: true, defaultChecked: true },
        "read-only": { readOnly: true, defaultChecked: true },
        required: { required: true, name: "wifi" },
    },
    state: { prop: "checked", from: false, to: true, act: click, read },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "wifi", value: "yes", defaultChecked: true },
            entries: [["wifi", "yes"]],
        },
        omits: { name: "wifi", value: "yes" },
        resets: true,
        required: { props: { name: "wifi", required: true }, satisfy: click },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: input,
        keys: [
            { key: " ", does: "change" },
            { key: "{Enter}", does: "nothing" },
        ],
    },
};

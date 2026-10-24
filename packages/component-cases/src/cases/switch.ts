// The switch: `checked`, a native checkbox with `role="switch"` that submits, resets, and
// validates, and Space to toggle.

import { switchControlAnatomy, testIds } from "@pureform/anatomy";

import { byRole, checkedOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId, ownSource } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.switchControl;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

/** The element with `role="switch"`: the web's native checkbox, React Native's pressable. */
const control = (host: HTMLElement) => byRole(host, "switch");

/** Its `aria-checked` (the web's native checkbox's checked state). */
const read = (host: HTMLElement): boolean => checkedOf(control(host)) === true;

const click = async (host: HTMLElement, options: ActOptions = {}) => {
    await userEvent.click(control(host), options);
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
        focusable: control,
        keys: [
            { key: " ", does: "change" },
            { key: "{Enter}", does: "nothing" },
        ],
    },
    indication: ownSource(switchControlAnatomy),
};

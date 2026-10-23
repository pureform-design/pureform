// The color picker, inline: `value` from #bf4040 by the area's thumb (the first Tab stop), whose
// arrow keys move saturation across (by direction) and brightness up and down, a step of 1 each.
// The text field shows the value's hex, which `read` reports. The eye dropper is left out: it
// renders only once mounted, where the browser has one, so hydration would add it.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.colorPicker;

const thumb = (host: HTMLElement) => byTestId(host, ids.areaThumb);

/** The value, as the hex field shows it. */
const read = (host: HTMLElement): string =>
    `#${byTestId<HTMLInputElement>(host, testIds.textField.input).value.toLowerCase()}`;

const SWATCHES = ["#6750a4", "#006a6a", "#8b5000", "#bf4040"];

export const colorPicker: ComponentCase = {
    component: "ColorPicker",
    props: { label: "Seed color", eyeDropper: false },
    root: ids.root,
    examples: {
        default: {},
        "with swatches": { defaultValue: "#006a6a", swatches: SWATCHES },
        "with alpha": { defaultValue: "#6750a480", alpha: true },
        "without the area": { area: false, swatches: SWATCHES },
        disabled: { disabled: true, swatches: SWATCHES },
        "read-only": { readOnly: true },
    },
    state: {
        prop: "value",
        from: "#bf4040",
        to: "#bf3e3e",
        async act(host) {
            thumb(host).focus();
            await userEvent.keyboard("{ArrowRight}");
        },
        read,
    },
    keyboard: {
        focusable: thumb,
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: "#bf4242" },
                { key: "{ArrowRight}", does: "change", to: "#bf3e3e" },
                { key: "{ArrowUp}", does: "change", to: "#c24141" },
                { key: "{ArrowDown}", does: "change", to: "#bc3f3f" },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: "#bf3e3e" },
                { key: "{ArrowRight}", does: "change", to: "#bf4242" },
                { key: "{ArrowUp}", does: "change", to: "#c24141" },
                { key: "{ArrowDown}", does: "change", to: "#bc3f3f" },
            ],
        },
    },
};

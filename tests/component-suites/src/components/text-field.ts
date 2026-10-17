// The text field: `value`, a native input that submits, resets, and validates (`required`,
// `invalid`, and `error`), and keys that type into it.

import { testIds } from "@pureform/anatomy";

import { textInputCase } from "./text-input";
import type { ComponentCase } from "./types";

export const textField: ComponentCase = textInputCase({
    component: "TextField",
    ids: testIds.textField,
    examples: {
        empty: {},
        filled: { defaultValue: "Ada" },
        outlined: { variant: "outlined", defaultValue: "Ada" },
        "outlined and empty": { variant: "outlined" },
        "with icons": {
            leadingIcon: "@",
            trailingIcon: "×",
            defaultValue: "Ada",
        },
        "outlined with icons": {
            variant: "outlined",
            leadingIcon: "@",
            trailingIcon: "×",
        },
        "supporting text": { supportingText: "As on your passport" },
        error: { error: "That name is taken", defaultValue: "Ada" },
        invalid: { invalid: true, defaultValue: "Ada" },
        "secondary color": { color: "secondary", defaultValue: "Ada" },
        compact: { density: "compact", defaultValue: "Ada" },
        disabled: { disabled: true, defaultValue: "Ada" },
        "read-only": { readOnly: true, defaultValue: "Ada" },
        required: { required: true, name: "name" },
    },
    keys: [
        { key: "a", does: "change" },
        { key: " ", does: "change", to: " " },
        { key: "{Enter}", does: "nothing" },
    ],
});

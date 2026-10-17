// The text area: the text field's case over a native `<textarea>`, where Enter starts a line.

import { testIds } from "@pureform/anatomy";

import { textInputCase } from "./text-input";
import type { ComponentCase } from "./types";

export const textArea: ComponentCase = textInputCase({
    component: "TextArea",
    ids: testIds.textArea,
    examples: {
        empty: {},
        filled: { defaultValue: "Ada\nLovelace" },
        outlined: { variant: "outlined", defaultValue: "Ada" },
        "outlined and empty": { variant: "outlined" },
        rows: { rows: 4, defaultValue: "Ada" },
        "grows with the text": { autoGrow: true, defaultValue: "Ada" },
        "with icons": { leadingIcon: "@", trailingIcon: "×" },
        "supporting text": { supportingText: "A few lines about you" },
        error: { error: "Too short", defaultValue: "Ada" },
        compact: { density: "compact", defaultValue: "Ada" },
        disabled: { disabled: true, defaultValue: "Ada" },
        "read-only": { readOnly: true, defaultValue: "Ada" },
        required: { required: true, name: "bio" },
    },
    keys: [
        { key: "a", does: "change" },
        { key: "{Enter}", does: "change", to: "\n" },
    ],
});

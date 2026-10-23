// The file upload: a drop zone holding a trigger button (the keyboard's way in: the zone takes
// drops, it isn't a button), a hidden file input, and a list of files. The examples are plain
// data, so none holds files: the files are chosen through the hidden input in the binding specs.
// It isn't a controllable component in the suites' sense (its files are `acceptedFiles`, Zag's
// names), and a file input submits files, not text entries.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";

const ids = testIds.fileUpload;

const trigger = (host: HTMLElement) =>
    byTestId(host, ids.dropzone).querySelector<HTMLButtonElement>("button")!;

export const fileUpload: ComponentCase = {
    component: "FileUpload",
    props: { label: "Attachments" },
    root: ids.root,
    examples: {
        empty: {},
        "supporting text": { supportingText: "PNG or PDF, up to 5 MB" },
        "own headline and trigger": {
            headline: "Drag your photos here",
            trigger: "Browse",
        },
        "no trigger": { trigger: null },
        "own icon": { icon: "+" },
        "secondary color": { color: "secondary" },
        invalid: { invalid: true },
        error: { error: "Add at least one file" },
        "several files": { maxFiles: 5, accept: "image/*" },
        disabled: { disabled: true },
        "read only": { readOnly: true },
    },
    keyboard: {
        focusable: trigger,
        // Enter and Space open the file dialog, which a test can't see.
        keys: [],
    },
};

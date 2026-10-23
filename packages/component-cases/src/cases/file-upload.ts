// The file upload: a drop zone holding a trigger button (the keyboard's way in: the zone takes
// drops, it isn't a button), a hidden file input, and a list of files. The examples are plain
// data, so none holds files: the files are chosen through the hidden input in the binding specs.
// Its state is the accepted files, `value` (Zag's `acceptedFiles`), which the state case chooses
// through the hidden input. Its form case submits the chosen file under `name` (the forms suite
// compares files by name and type), resets to no files, and requires one.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "../types";
import { byTestId } from "../types";

const ids = testIds.fileUpload;

const hiddenInput = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>('input[type="file"]')!;

const notes = new File(["pureform"], "notes.txt", { type: "text/plain" });

/** The accepted files listed, as `File`s by their names (Vitest compares two `File`s by their
 *  type alone, so this checks the names against the case's own files). */
const read = (host: HTMLElement): File[] =>
    [
        ...host.querySelectorAll(
            '[data-scope="file-upload"][data-part="item-name"]',
        ),
    ]
        .filter((name) => !name.closest('[data-type="rejected"]'))
        .map((name) => {
            const file = [notes].find((one) => one.name === name.textContent);
            if (!file) {
                throw new Error(`lists ${name.textContent}, not a case's file`);
            }
            return file;
        });

/** Chooses `notes` in the file dialog: the hidden input's files change. */
const choose = async (host: HTMLElement) => {
    const input = hiddenInput(host);
    const transfer = new DataTransfer();
    transfer.items.add(notes);
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
};

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
    state: {
        prop: "value",
        from: [],
        to: [notes],
        // A `File` can't be sent to the server.
        serverRendered: false,
        act: choose,
        read,
    },
    form: {
        control: hiddenInput,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "attachments", defaultValue: [notes] },
            entries: [
                ["attachments", { file: "notes.txt", type: "text/plain" }],
            ],
        },
        resets: true,
        required: { props: { required: true }, satisfy: choose },
    },
    keyboard: {
        focusable: trigger,
        // Enter and Space open the file dialog, which a test can't see.
        keys: [],
    },
};

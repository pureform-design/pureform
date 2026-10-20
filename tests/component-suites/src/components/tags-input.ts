// The tags input: `value`, a list of input chips that Enter adds to and each chip's remove button
// takes from; a hidden input submits them joined by ", ". Its chips show indication: the chip,
// which the keyboard's highlight (an arrow key) shows as hovered, and its remove button.

import { inputChipAnatomy, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.tagsInput;
const chipIds = testIds.inputChip;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

const hidden = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>('input[name="tags"]');

/** The chips' labels, checked against the hidden input when it's named. */
const read = (host: HTMLElement): string[] => {
    const values = [
        ...host.querySelectorAll(`[data-testid="${chipIds.label}"]`),
    ].map((label) => label.textContent ?? "");
    const submitted = hidden(host);
    if (submitted && submitted.value !== values.join(", ")) {
        throw new Error(
            `the chips are ${JSON.stringify(values)}, the hidden input holds ${JSON.stringify(submitted.value)}`,
        );
    }
    return values;
};

export const tagsInput: ComponentCase = {
    component: "TagsInput",
    props: { label: "Tags" },
    root: ids.root,
    examples: {
        empty: {},
        filled: { defaultValue: ["red", "blue"] },
        outlined: { variant: "outlined", defaultValue: ["red", "blue"] },
        "outlined and empty": { variant: "outlined" },
        "with icons": {
            leadingIcon: "#",
            trailingIcon: "×",
            defaultValue: ["red"],
        },
        "round chips": { defaultValue: ["red"], chip: { corner: "round" } },
        "supporting text": { supportingText: "Press Enter to add" },
        error: { error: "Too many tags", defaultValue: ["red"] },
        "secondary color": { color: "secondary", defaultValue: ["red"] },
        compact: { density: "compact", defaultValue: ["red"] },
        disabled: { disabled: true, defaultValue: ["red"] },
        "many chips": {
            defaultValue: ["one", "two", "three", "four", "five", "six"],
        },
    },
    state: {
        prop: "value",
        from: ["red"],
        to: ["red", "blue"],
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(input(host), options);
            await userEvent.type(input(host), "blue{Enter}");
        },
        read,
    },
    form: {
        control: (host) => hidden(host) ?? input(host),
        aria: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "tags", defaultValue: ["red", "blue"] },
            entries: [["tags", "red, blue"]],
        },
    },
    keyboard: {
        focusable: input,
        keys: [{ key: "{Enter}", does: "nothing" }],
    },
    // The left arrow highlights the chip, which shows as hovered, and focus moves into it to its
    // remove button (only a script can: Zag keeps it out of the tab order).
    indication: {
        anatomy: inputChipAnatomy,
        props: { defaultValue: ["red"] },
        disabled: { disabled: true },
        focus: async (host) => {
            await userEvent.click(input(host));
            await userEvent.keyboard("{ArrowLeft}");
            byTestId(host, chipIds.remove).focus();
        },
    },
};

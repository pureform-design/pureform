// What the text field's and the text area's cases share: `value` from "" to "a", typed into the
// input and read from it (every renderer's textbox is an input); the native input submits, resets, and validates; an error blocks submitting.

import { textValueOf } from "../aria";
import type { ComponentName, SceneProps } from "../scene";
import type { ActOptions, ComponentCase, KeyCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

interface TextInputIds {
    readonly root: string;
    readonly input: string;
}

/** A text input's case, from its test ids, examples, and keys. */
export const textInputCase = (options: {
    readonly component: ComponentName;
    readonly ids: TextInputIds;
    readonly examples: Readonly<Record<string, SceneProps>>;
    readonly keys: readonly KeyCase[];
}): ComponentCase => {
    const { ids } = options;
    const input = (host: HTMLElement) =>
        byTestId<HTMLInputElement | HTMLTextAreaElement>(host, ids.input);

    /** The textbox's value. */
    const read = (host: HTMLElement): string => textValueOf(input(host));

    // A click to focus the input, then one key.
    const type = async (host: HTMLElement, options: ActOptions = {}) => {
        await userEvent.click(input(host), options);
        await userEvent.keyboard("a");
    };

    return {
        component: options.component,
        props: { label: "Name" },
        root: ids.root,
        examples: options.examples,
        state: { prop: "value", from: "", to: "a", act: type, read },
        form: {
            control: input,
            disabled: (host) =>
                byTestId(host, ids.root).hasAttribute("data-disabled"),
            submits: {
                props: { name: "name", defaultValue: "Ada" },
                entries: [["name", "Ada"]],
            },
            resets: true,
            required: {
                props: { name: "name", required: true },
                satisfy: type,
            },
            invalid: { props: { invalid: true } },
            error: {
                props: { name: "name", error: "That name is taken" },
                message: "That name is taken",
            },
        },
        keyboard: { focusable: input, keys: options.keys },
    };
};

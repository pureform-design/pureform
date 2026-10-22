// What the text field's and the text area's cases share: `value` from "" to "a", typed into the
// native input; the native input submits, resets, and validates; an error blocks submitting.

import type { ComponentName, SceneProps } from "../scene";
import type { ActOptions, ComponentCase, KeyCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

interface TextInputIds {
    readonly root: string;
    readonly container: string;
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

    /** The input's value, checked against the container's `filled` state. */
    const read = (host: HTMLElement): string => {
        const value = input(host).value;
        const filled = byTestId(host, ids.container).hasAttribute(
            "data-pf-filled",
        );
        if (filled !== (value !== "")) {
            throw new Error(
                `the input holds ${JSON.stringify(value)}, the container ${filled ? "is" : "isn't"} filled`,
            );
        }
        return value;
    };

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

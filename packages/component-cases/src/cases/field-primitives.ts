// The plain form primitives: Field (ready-made, from `label`, `description` and `error`), the
// Input and Textarea on their own, and the Label, Description and ErrorText. The Input and the
// Textarea are the native elements: they submit, disable, and validate as the browser does; their
// text is pureform's controllable `value` (and the element's own `onChange`/`onInput` still works).

import { testIds } from "@pureform/anatomy";

import type {
    ComponentCase,
    FormCase,
    KeyboardCase,
    StateCase,
} from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

export const field: ComponentCase = {
    component: "Field",
    props: { label: "Name" },
    root: testIds.field.root,
    examples: {
        label: {},
        description: { description: "As on your passport" },
        error: { description: "As on your passport", error: "Required" },
        required: { required: true },
        disabled: { disabled: true, description: "Locked" },
        invalid: { invalid: true },
    },
    keyboard: {
        focusable: (host) => byTestId(host, testIds.input.root),
        keys: [{ key: "a", does: "nothing" }],
    },
};

/** What the input's and the textarea's cases share, from the control's test id. */
const control = (
    id: string,
): { state: StateCase<string>; form: FormCase; keyboard: KeyboardCase } => {
    const element = (host: HTMLElement) =>
        byTestId<HTMLInputElement | HTMLTextAreaElement>(host, id);
    return {
        // Typing one character at the end.
        state: {
            prop: "value",
            from: "Ada",
            to: "Ada!",
            act: async (host, options) => {
                await userEvent.type(element(host), "!", options);
            },
            read: (host) => element(host).value,
        },
        form: {
            control: element,
            // Its own `disabled`, or a disabled fieldset's.
            disabled: (host) => element(host).matches(":disabled"),
            submits: {
                props: { name: "name", defaultValue: "Ada" },
                entries: [["name", "Ada"]],
            },
            required: {
                props: { name: "name", required: true },
                satisfy: async (host, options) => {
                    await userEvent.click(element(host), options);
                    await userEvent.keyboard("a");
                },
            },
            resets: true,
            invalid: { props: { invalid: true } },
        },
        keyboard: {
            focusable: element,
            keys: [{ key: "a", does: "nothing" }],
        },
    };
};

export const input: ComponentCase = {
    component: "Input",
    props: { "aria-label": "Name" },
    root: testIds.input.root,
    examples: {
        empty: {},
        filled: { defaultValue: "Ada Lovelace" },
        placeholder: { placeholder: "Ada Lovelace" },
        invalid: { invalid: true, defaultValue: "Ada" },
        disabled: { disabled: true, defaultValue: "Ada" },
        "read-only": { readOnly: true, defaultValue: "Ada" },
        // The browser's own pickers, the indicator in the theme's color.
        date: { type: "date", defaultValue: "1815-12-10" },
        time: { type: "time", defaultValue: "09:30" },
        "date and time": {
            type: "datetime-local",
            defaultValue: "1815-12-10T09:30",
        },
    },
    ...control(testIds.input.root),
};

export const textarea: ComponentCase = {
    component: "Textarea",
    props: { "aria-label": "Bio" },
    root: testIds.plainTextarea.root,
    examples: {
        empty: {},
        filled: { defaultValue: "Ada\nLovelace" },
        rows: { rows: 5 },
        invalid: { invalid: true },
        disabled: { disabled: true, defaultValue: "Ada" },
    },
    ...control(testIds.plainTextarea.root),
};

export const label: ComponentCase = {
    component: "Label",
    props: { children: "Name" },
    root: testIds.label.root,
    examples: {
        label: {},
        required: { required: true },
        disabled: { disabled: true },
    },
};

export const description: ComponentCase = {
    component: "Description",
    props: { children: "As on your passport" },
    root: testIds.description.root,
    examples: { description: {} },
};

export const errorText: ComponentCase = {
    component: "ErrorText",
    props: { children: "Required" },
    root: testIds.errorText.root,
    examples: { error: {} },
    // The error color is the same in every theme the suite has.
    themed: false,
};

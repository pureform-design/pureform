// What Input and Textarea share: the field's control props, and the text as pureform's other
// controls take theirs (`value`, `defaultValue`, `onValueChange`), with the form reset. The
// element's own handlers (`onInput`, …) still run beside it.

import { fieldControlProps } from "@pureform/binding-core";
import type { FieldStateProps, PlainTextProps } from "@pureform/binding-core";
import { syncTextInput } from "@pureform/binding-core/dom";
import { type Accessor, createSignal, flush, untrack } from "solid-js";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { useField } from "./context";

type TextElement = HTMLInputElement | HTMLTextAreaElement;

/** The control's props from the field around and the text, as getters over the user's, and the
 *  ref that takes the element. */
export function usePlainText(
    component: string,
    props: PlainTextProps &
        FieldStateProps & {
            readonly id?: unknown;
            readonly "aria-describedby"?: unknown;
        },
): {
    readonly ref: (element: Element) => void;
    readonly machine: Accessor<Readonly<Record<string, unknown>>>;
    readonly control: Readonly<Record<string, unknown>>;
} {
    const field = useField();
    const value = useControllable<"value", string>(component, "value", props);
    const [element, setElement] = createSignal<TextElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const [own, setOwn] = createSignal(value.defaultValue ?? "", {
        ownedWrite: true,
    });
    const shown = () => value.value() ?? own();
    let reported = untrack(shown);
    const report = (next: string) => {
        reported = next;
        setOwn(next);
        untrack(value.machineProps).onValueChange?.({ value: next });
    };
    useFormReset(element, {
        resetsTo: value.resetsTo,
        onBeforeReset: value.beforeReset,
        onReset: () => {
            const current = untrack(element);
            if (!current) return;
            // The browser has put an uncontrolled element back; a controlled one keeps its value
            // until the owner takes the default reported.
            const next = untrack(value.controlled)
                ? (value.defaultValue ?? "")
                : current.value;
            if (next !== reported) value.reset(() => report(next));
        },
    });
    const onInput = (event: Event) => {
        const current = event.currentTarget as TextElement;
        report(current.value);
        // A controlled element the owner didn't move goes back to its value.
        queueMicrotask(() => {
            flush();
            syncTextInput(current, untrack(shown));
        });
    };
    const control = () =>
        fieldControlProps(
            field?.state(),
            props as Parameters<typeof fieldControlProps>[1],
        );
    return {
        ref: (current) => setElement(current as TextElement),
        machine: () => ({ value: shown(), onInput }),
        // Getters, which win over the user's props (they already take them in).
        control: {
            get id() {
                return control().id;
            },
            get disabled() {
                return control().disabled;
            },
            get required() {
                return control().required;
            },
            get "aria-invalid"() {
                return control()["aria-invalid"];
            },
            get "aria-describedby"() {
                return control()["aria-describedby"];
            },
        },
    };
}

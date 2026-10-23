// The text of the plain Input and Textarea as pureform's controllable value: `value` controls it,
// `defaultValue` is read once, `onValueChange` reports each change, and a form reset puts it back
// (`reason: "reset"`). The element's own `onChange` still runs.

import type { PlainTextProps } from "@pureform/binding-core";
import { useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";

type TextElement = HTMLInputElement | HTMLTextAreaElement;

/** The element's text props and the callback ref that wires it into its form's reset. */
export function usePlainText(component: string, props: PlainTextProps) {
    const text = useControllable<"value", string>(component, "value", props);
    const [element, setElement] = useState<TextElement | null>(null);
    const shown = useRef(text.value ?? text.defaultValue ?? "");
    useLayoutEffect(() => {
        if (text.controlled) shown.current = text.value ?? "";
    });
    const report = (next: string) => {
        shown.current = next;
        text.machineProps.onValueChange?.({ value: next });
    };
    useFormReset(element, {
        resetsTo: text.resetsTo,
        onBeforeReset: text.beforeReset,
        onReset: () => {
            if (!element) return;
            // The browser has put an uncontrolled element back; a controlled one keeps its text
            // until the owner takes the default reported.
            const next = text.controlled
                ? (text.defaultValue ?? "")
                : element.value;
            if (next !== shown.current) text.reset(() => report(next));
        },
    });
    return {
        ref: setElement as (element: HTMLElement | null) => void,
        machine: {
            ...(text.controlled
                ? { value: text.value }
                : { defaultValue: text.defaultValue }),
            onChange: (event: ChangeEvent<TextElement>) =>
                report(event.currentTarget.value),
        },
    };
}

// Zag's number input, re-exported so bindings take every machine from one package, with the parts
// the preset's number field draws. The input is a `spinbutton`: the arrow keys step it (Shift
// for `largeStep`), Home and End go to the limits, a value is clamped on blur, typed text is
// parsed in the locale (`formatOptions`), and pressing and holding a trigger repeats (after
// 300ms, every 50ms).
//
// A trigger at a limit is `aria-disabled`, not `disabled`: the field's container reads a disabled
// control inside it as the whole field disabled.
//
// A press on a trigger ends on the document's `pointerup` (or `pointercancel`) too, not only the
// trigger's: a step that reaches a limit disables the trigger under the pointer, and Solid's
// delegated events skip a disabled element, so the trigger's own `pointerup` never ran and the
// field stayed spinning, deaf to the keys.
//
// It follows the fieldsets around its input by the browser's rule (`trackFormControl` from
// `../form`), where Zag reads only the closest fieldset and so disabled a field in the first
// legend of a disabled fieldset, or missed one around an enabled fieldset. A form reset still
// puts back the value it started with, as Zag's does.

import type {
    Machine as AnyMachine,
    Params,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
} from "@zag-js/number-input";
import type { Api, Service } from "@zag-js/number-input";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { trackFormControl } from "../form";
import type { SchemaOf } from "../interaction";
import { zagElement } from "../zag-form";

export * from "@zag-js/number-input";
export { anatomy, parts } from "./number-input.anatomy";

type Schema = SchemaOf<typeof zagMachine>;

const zag = zagMachine as unknown as AnyMachine<Schema>;

const inputOf = zagElement("input", (id) => `number-input:${id}:input`);

/** Zag's number input, following the fieldsets around its input by the browser's rule. */
export const machine = {
    ...zag,
    implementations: {
        ...zag.implementations,
        effects: {
            ...zag.implementations?.effects,
            trackFormControl: ({ context, scope }: Params<Schema>) =>
                trackFormControl(inputOf(scope), {
                    onFieldsetDisabledChange(disabled) {
                        context.set("fieldsetDisabled", disabled);
                    },
                    onFormReset() {
                        context.set("value", context.initial("value"));
                    },
                }),
        },
    },
} as unknown as typeof zagMachine;

type Dict = Record<string, unknown>;

const endOnRelease = (
    service: Service,
    { disabled, ...props }: Dict,
    hint: "increment" | "decrement",
): Dict => {
    const down = props["onPointerDown"] as
        | ((event: PointerEvent) => void)
        | undefined;
    return {
        ...props,
        // `aria-disabled` rather than `disabled`: the field's container reads a disabled
        // control inside it as the whole field disabled, and a trigger at a limit isn't that.
        // Zag's handlers ignore a disabled trigger already.
        "aria-disabled": disabled ? "true" : undefined,
        onPointerDown(event: PointerEvent) {
            down?.(event);
            if (disabled || event.button !== 0) return;
            const doc = (event.currentTarget as Element | null)?.ownerDocument;
            if (!doc) return;
            const release = () => {
                doc.removeEventListener("pointerup", release, true);
                doc.removeEventListener("pointercancel", release, true);
                (service as unknown as AnyService<never>).send({
                    type: "TRIGGER.PRESS_UP",
                    hint,
                    pointerType: event.pointerType,
                } as never);
            };
            doc.addEventListener("pointerup", release, true);
            doc.addEventListener("pointercancel", release, true);
        },
    };
};

/** Zag's connect, with a press on a trigger ending wherever the pointer is released. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service, normalize);
    return {
        ...api,
        getDecrementTriggerProps: () =>
            endOnRelease(
                service,
                api.getDecrementTriggerProps() as Dict,
                "decrement",
            ) as T["button"],
        getIncrementTriggerProps: () =>
            endOnRelease(
                service,
                api.getIncrementTriggerProps() as Dict,
                "increment",
            ) as T["button"],
    };
}

// Zag's pin input, re-exported so bindings take every machine from one package, with the parts
// the preset's code field draws. Typing moves focus to the next cell, Backspace clears a cell and
// moves back, the arrow keys, Home and End move between cells, and pasting a whole code fills
// every cell. `otp` sets `autocomplete="one-time-code"`, and `mask` hides each character.
//
// Backspace in an empty cell moves back and clears the cell before it. Zag does that as two
// actions, the second reading the focus the first wrote; Solid's adapter shows a write only at
// its next flush, so the second cleared the empty cell again. This one clears the cell before
// the focus first, then moves, which reads nothing it wrote.

import type { Machine as AnyMachine, Params } from "@zag-js/core";
import { machine as zagMachine } from "@zag-js/pin-input";

import type { SchemaOf } from "../interaction";

export * from "@zag-js/pin-input";
export { anatomy, parts } from "./pin-input.anatomy";

type Schema = SchemaOf<typeof zagMachine>;
type ZagParams = Params<Schema>;

const zag = zagMachine as unknown as AnyMachine<Schema>;

type Transition = { guard?: unknown; actions?: string[] };

const focused = zag.states["focused" as keyof typeof zag.states] as {
    on: Record<string, Transition | Transition[]>;
};

export const machine = {
    ...zag,
    // Zag seeds its `count` context from the `count` prop once and never follows the prop after
    // that, so a changed `length` left the old number of cells. It follows the prop here.
    watch(params: ZagParams) {
        zag.watch?.(params);
        const { prop, context, track } = params;
        track([() => prop("count")], () => {
            const count = prop("count");
            if (count && count !== context.get("count")) {
                context.set("count", count);
            }
        });
    },
    states: {
        ...zag.states,
        focused: {
            ...focused,
            on: {
                ...focused.on,
                "INPUT.BACKSPACE": [
                    (focused.on["INPUT.BACKSPACE"] as Transition[])[0],
                    {
                        actions: [
                            "clearValueBeforeFocus",
                            "setPrevFocusedIndex",
                        ],
                    },
                ],
            },
        },
    },
    implementations: {
        ...zag.implementations,
        actions: {
            ...zag.implementations?.actions,
            // Zag's `clearFocusedValue`, one cell before the focus: the cells after it move up.
            clearValueBeforeFocus({ context, computed }: ZagParams) {
                const index = Math.max(
                    (context.get("focusedIndex") as number) - 1,
                    0,
                );
                const value = [...(computed("_value") as string[])];
                value.splice(index, 1);
                value.push("");
                context.set("value", value as never);
            },
        },
    },
} as unknown as typeof zagMachine;

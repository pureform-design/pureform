// What a generated React Native factory module looks like (`.pureform/native/button.ts`): the
// states are in the selection and the key, and each key's styles are computed once and frozen.
// A real module selects from the precomputed, resolved table; this one spells the styles out.

import { selectionCache } from "../index";
import type { Selection, StyleFactory, StyleSlots, States } from "../index";
import type { ButtonShape } from "./web-button";

const background = { filled: "#6750a4", text: "transparent" };

export const button: StyleFactory<ButtonShape> = selectionCache<
    Selection<ButtonShape> & States<ButtonShape>,
    StyleSlots<ButtonShape>
>(
    {
        variants: ["variant", "size", "toggle"],
        states: ["pressed", "disabled"],
        defaults: { variant: "filled", size: "medium", toggle: "false" },
    },
    (s) => ({
        root: {
            style: {
                backgroundColor: background[s.variant as "filled"],
                height: s.size === "small" ? 32 : 40,
                opacity: s.disabled ? 0.38 : 1,
                transform: [{ scale: s.pressed ? 0.98 : 1 }],
            },
        },
        label: { style: { fontWeight: "500" } },
    }),
);

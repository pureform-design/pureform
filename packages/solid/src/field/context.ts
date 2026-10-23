// What Field shares with the pieces inside it: its state and the registration of the supporting
// pieces it holds. Each piece reads it with `useField`, and works alone without one.

import type { FieldState } from "@pureform/binding-core";
import {
    type Accessor,
    createContext,
    onCleanup,
    onSettled,
    useContext,
} from "solid-js";

export type FieldDescribed = FieldState["described"];

/** What Field shares with the pieces inside it. */
export interface FieldContextValue {
    readonly state: Accessor<FieldState>;
    /** Marks a supporting piece present while it's mounted. */
    readonly describe: (piece: keyof FieldDescribed, present: boolean) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** The field around, if any: the pieces work alone too. */
export const useField = (): FieldContextValue | null =>
    useContext(FieldContext);

/** Marks a supporting piece present in the field around while it's mounted. */
export const useDescribes = (
    field: FieldContextValue | null,
    piece: keyof FieldDescribed,
): void => {
    if (!field) return;
    onSettled(() => {
        field.describe(piece, true);
    });
    onCleanup(() => field.describe(piece, false));
};

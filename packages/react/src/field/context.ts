// The Field context: what a Field shares with the controls and supporting pieces inside it. Other
// controls (NativeSelect, a control of the app's) read it with `useField` to take the field's id,
// states and descriptions.

import type { FieldState } from "@pureform/binding-core";
import { createContext, use, useLayoutEffect } from "react";

type Described = FieldState["described"];

export interface FieldContextValue {
    readonly state: FieldState;
    /** Marks a supporting piece present while it's mounted. */
    readonly describe: (piece: keyof Described, present: boolean) => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** The field around, if any: the pieces work alone too. */
export const useField = (): FieldContextValue | null => use(FieldContext);

/** Marks a supporting piece present in the field around while it's mounted. */
export const useDescribes = (
    field: FieldContextValue | null,
    piece: keyof Described,
): void => {
    const describe = field?.describe;
    useLayoutEffect(() => {
        if (!describe) return;
        describe(piece, true);
        return () => describe(piece, false);
    }, [describe, piece]);
};

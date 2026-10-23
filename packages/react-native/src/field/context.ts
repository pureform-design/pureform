// The Field's context: its state, which the pieces and other controls inside it read, and how a
// Description or an ErrorText says it's there (a mounted ErrorText marks the field invalid).

import type { FieldState } from "@pureform/binding-core";
import { createContext, use, useLayoutEffect } from "react";

/** What a Field gives the controls inside it. */
export interface FieldContextValue {
    readonly state: FieldState;
    /** A Description or an ErrorText is mounted; returns its unmount. */
    readonly register: (piece: "description" | "error") => () => void;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** The Field around the caller, if any. */
export const useField = (): FieldContextValue | null => use(FieldContext);

/** Tells the Field around the caller that a supporting piece is mounted. */
export function useFieldPiece(
    field: FieldContextValue | null,
    piece: "description" | "error",
): void {
    const register = field?.register;
    useLayoutEffect(() => register?.(piece), [register, piece]);
}

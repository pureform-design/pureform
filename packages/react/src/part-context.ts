// The context a compound component's Root shares with its parts: its scope and its machine's
// API. A part outside Root throws, naming both.

import { outsideRootMessage } from "@pureform/binding-core";
import { type Context, createContext, use } from "react";

/** A Root's context, and the means for its parts to read it. */
export interface PartContext<T> {
    /** Provide it from Root: `<context.Provider value={{ scope, api }}>`. */
    readonly Provider: Context<T | null>;
    /** Read it from a part; throws outside Root. `part` names the part in the error. */
    use(part: string): T;
}

/** Creates the context a compound component's Root shares with its parts. `component` names it
 *  in the error a part outside Root throws: `createPartContext<…>("Button")`. `root` names the
 *  part that provides it, when that isn't Root. */
export function createPartContext<T>(
    component: string,
    root?: string,
): PartContext<T> {
    const Provider = createContext<T | null>(null);
    return {
        Provider,
        use(part) {
            const value = use(Provider);
            if (value === null)
                throw new Error(outsideRootMessage(component, part, root));
            return value;
        },
    };
}

// The parts the design names beyond a component's AST slots. The registry doesn't style them;
// bindings render them as they are.

import type { ExtraPart } from "./types";

/** Extra parts, by component name. */
export const EXTRA_PARTS: Readonly<Record<string, readonly ExtraPart[]>> = {
    /** Zag's hidden native `<select>`, so a form submits and autofills the value. */
    select: [{ name: "hiddenSelect", parent: "root" }],
};

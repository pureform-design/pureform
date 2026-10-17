// Each interactive component's interaction source, which its machine emits to: made when the
// component first renders on the client, and not on the server, where nothing emits. Spread into
// the machine's props.

import {
    createInteractionSource,
    createInteractionSources,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { useState } from "react";

import { isServer } from "./env";

/** The machine props passing a component's own source, the same on every render: none on the
 *  server. */
export function useOwnInteractionSource(): {
    interactionSource?: MutableInteractionSource;
} {
    return useState(() =>
        isServer ? {} : { interactionSource: createInteractionSource() },
    )[0];
}

/** The machine props passing a composite's source per item, the same on every render: none on
 *  the server. */
export function useItemInteractionSources(): {
    itemInteractionSource?: (value: string) => MutableInteractionSource;
} {
    return useState(() =>
        isServer ? {} : { itemInteractionSource: createInteractionSources() },
    )[0];
}

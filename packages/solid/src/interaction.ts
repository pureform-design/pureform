// Each interactive component's interaction source, which its machine emits to: made when the
// component is created on the client, and not on the server, where nothing emits. Spread into the
// machine's props.

import {
    createInteractionSource,
    createInteractionSources,
    type MutableInteractionSource,
} from "@pureform/binding-core/interaction";
import { isServer } from "@solidjs/web";

/** The machine props passing a component's own source: none on the server. */
export const ownInteractionSource = (): {
    interactionSource?: MutableInteractionSource;
} => (isServer ? {} : { interactionSource: createInteractionSource() });

/** The machine props passing a composite's source per item: none on the server. */
export const itemInteractionSources = (): {
    itemInteractionSource?: (value: string) => MutableInteractionSource;
} => (isServer ? {} : { itemInteractionSource: createInteractionSources() });

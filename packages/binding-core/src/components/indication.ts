// The props every interactive component takes for its indication: the indication itself, over the
// provider's, and the interaction source its machine emits to. A composite (tabs, menus, radio
// groups, navigation) takes the indication on Root and a source per item.

import type { Indication } from "../indication";
import type { MutableInteractionSource } from "../interaction";

/** How a component shows hover, focus, and press. */
export interface IndicationProps {
    /** Its indication, over the provider's: `materialIndication()`, `noIndication`, or the app's
     *  own (`defineIndication`). Its tokens go on the component's root alone. */
    readonly indication?: Indication | undefined;
}

/** The source a surface's interactions are emitted to. */
export interface InteractionSourceProps {
    /** The source its machine emits presses, hover, focus, and drags to. Pass one to observe it
     *  (`useInteractionState`) or to share it with other components, which then show the presses
     *  and hover it hears. Without it, the component makes its own. */
    readonly interactionSource?: MutableInteractionSource | undefined;
}

/** What a component with one surface takes: its indication and its source. */
export interface InteractiveProps
    extends IndicationProps, InteractionSourceProps {}

/** The keys of `InteractiveProps`. */
export const INTERACTIVE_PROPS = [
    "indication",
    "interactionSource",
] as const satisfies readonly (keyof InteractiveProps)[];

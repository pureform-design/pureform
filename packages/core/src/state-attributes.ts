// The data attributes the web bindings set for the states that neither a native pseudo-class nor
// an ARIA attribute covers. The web adapters' selectors match exactly these names, so a binding
// that sets them styles the same as the browser's own states.

/** The `data-pf-*` attribute the bindings set for each state, by the state's name. Every other
 *  state is read from a native pseudo-class (`:checked`, `:disabled`, `:focus-visible`, …) or an
 *  ARIA attribute (`aria-checked`, `aria-selected`, `aria-disabled`, …). */
export const STATE_ATTRIBUTES = {
    /** Hover driven by another element, such as a label over a control. */
    hover: "data-pf-hover",
    /** A press the browser doesn't mark `:active`, such as a keyboard press. */
    pressed: "data-pf-active",
    /** An element being dragged; CSS has no dragging pseudo-class. */
    dragged: "data-pf-dragging",
    /** A control holding a value outside a text input, such as a select. */
    filled: "data-pf-filled",
} as const;

/** A state the bindings mark with a `data-pf-*` attribute. */
export type AttributeState = keyof typeof STATE_ATTRIBUTES;

/** One of the `data-pf-*` state attribute names. */
export type StateAttribute = (typeof STATE_ATTRIBUTES)[AttributeState];

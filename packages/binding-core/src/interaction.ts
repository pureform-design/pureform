// What happened to an interactive component, in Compose's terms: presses, hover, focus, and
// drags, as interactions a component's machine emits to its interaction source. The source holds
// the state they add up to and tells its subscribers about each one. Framework-free: the
// bindings wrap it in their own hooks, and React Native uses it as is.

/** What started a press. A keyboard press comes from Enter or Space; a virtual one from
 *  assistive technology or code, with no pointer behind it. */
export type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "virtual";

/** A press's origin: where the pointer went down, in viewport coordinates (`clientX` and
 *  `clientY` on the web), or the surface's center for a press with no point, such as a key. */
export type PressOrigin = { x: number; y: number } | "center";

/**
 * Every kind of interaction, by its `type`, with the details it carries. pureform's kinds are
 * typed here; an app or library adds its own by augmenting this interface, with a prefix (`app:`
 * or the library's name) so a kind pureform adds later can't collide with it:
 *
 * ```ts
 * declare module "@pureform/binding-core/interaction" {
 *     interface InteractionKinds {
 *         "app:longPress": { id: number; duration: number };
 *     }
 * }
 * source.emit({ type: "app:longPress", id: 1, duration: 600 });
 * ```
 *
 * An added kind reaches every subscriber, typed; the source's own state ignores it.
 */
export interface InteractionKinds {
    /** A press started. `id` pairs it with its `release` or `cancel`. */
    press: { id: number; origin: PressOrigin; pointer: PointerKind };
    /** The press with this `id` ended where it started, as a click does. */
    release: { id: number };
    /** The press with this `id` ended without a click: the pointer left, a scroll took it, focus
     *  moved away from a key press, or the component became disabled. */
    cancel: { id: number };
    /** A mouse or pen started hovering. Touch never hovers. */
    hoverEnter: {};
    hoverExit: {};
    /** Focus arrived; `visible` when the browser would show a focus ring for it
     *  (`:focus-visible`). */
    focus: { visible: boolean };
    blur: {};
    dragStart: {};
    dragStop: {};
}

/** A kind of interaction, by its name. */
export type InteractionKind = keyof InteractionKinds;

/** One interaction, discriminated by `type`: a `switch` on it narrows the details. */
export type Interaction = {
    [K in InteractionKind]: { type: K } & InteractionKinds[K];
}[InteractionKind];

/** The interaction of one kind. */
export type InteractionOf<K extends InteractionKind> = Extract<
    Interaction,
    { type: K }
>;

/** What the interactions so far add up to. */
export interface InteractionState {
    /** A mouse or pen is over it, and no touch press is in progress. */
    readonly hovered: boolean;
    readonly focused: boolean;
    /** Focused, with focus the browser would show a ring for. */
    readonly focusVisible: boolean;
    /** At least one press has started and not ended. */
    readonly pressed: boolean;
    /** At least one drag has started and not stopped. */
    readonly dragged: boolean;
}

/** Called with each interaction, the state after it, and the element (or native view) it
 *  happened on, when the emitter said. */
export type InteractionListener = (
    interaction: Interaction,
    state: InteractionState,
    origin: unknown,
) => void;

/**
 * What happens to a component, for anything that draws from it: its indication, the bindings'
 * state attributes, an app observing it. Always a value: a component given none makes its own.
 *
 * A subscriber sees the interactions emitted after it subscribes, and reads `state` for what came
 * before. Whether a component makes its source when it mounts or later isn't promised either
 * way; a subscriber that attaches late sees ordinary interactions.
 */
export interface InteractionSource {
    /** The current state. A new object each time it changes, the same one otherwise. */
    readonly state: InteractionState;
    /** Listen to every interaction, pureform's kinds and any an app added. Returns the
     *  unsubscribe. */
    subscribe(listener: InteractionListener): () => void;
}

/** A source that takes interactions: the one a component's machine emits to, which an app can
 *  share between components or emit to itself. */
export interface MutableInteractionSource extends InteractionSource {
    /** Add an interaction. `origin` is the element (or native view) it happened on. */
    emit(interaction: Interaction, origin?: unknown): void;
}

/** The state before any interaction: nothing hovered, focused, pressed, or dragged. */
export const IDLE_INTERACTION_STATE: InteractionState = Object.freeze({
    hovered: false,
    focused: false,
    focusVisible: false,
    pressed: false,
    dragged: false,
});

// What the state is derived from: presses by id (and which of them are touch), and counts of
// hovers and drags, since a shared source can hear several of each at once.
interface Ledger {
    readonly presses: Map<number, PointerKind>;
    hovers: number;
    drags: number;
    focused: boolean;
    focusVisible: boolean;
}

function record(ledger: Ledger, interaction: Interaction): void {
    switch (interaction.type) {
        case "press":
            ledger.presses.set(interaction.id, interaction.pointer);
            break;
        case "release":
        case "cancel":
            ledger.presses.delete(interaction.id);
            break;
        case "hoverEnter":
            ledger.hovers += 1;
            break;
        case "hoverExit":
            ledger.hovers = Math.max(0, ledger.hovers - 1);
            break;
        case "focus":
            ledger.focused = true;
            ledger.focusVisible = interaction.visible;
            break;
        case "blur":
            ledger.focused = false;
            ledger.focusVisible = false;
            break;
        case "dragStart":
            ledger.drags += 1;
            break;
        case "dragStop":
            ledger.drags = Math.max(0, ledger.drags - 1);
            break;
        default:
            // A kind the state doesn't know (an app's) leaves it alone.
            break;
    }
}

const touching = (ledger: Ledger): boolean => {
    for (const pointer of ledger.presses.values()) {
        if (pointer === "touch") return true;
    }
    return false;
};

function derive(ledger: Ledger, previous: InteractionState): InteractionState {
    const next = {
        hovered: ledger.hovers > 0 && !touching(ledger),
        focused: ledger.focused,
        focusVisible: ledger.focused && ledger.focusVisible,
        pressed: ledger.presses.size > 0,
        dragged: ledger.drags > 0,
    };
    const same = (Object.keys(next) as (keyof InteractionState)[]).every(
        (key) => next[key] === previous[key],
    );
    return same ? previous : Object.freeze(next);
}

/**
 * A new source, idle. Its state follows pureform's kinds:
 *
 * - a press holds until a `release` or `cancel` with its id (an unknown id changes nothing);
 * - hover holds while more `hoverEnter`s than `hoverExit`s have come, and never while a touch
 *   press is in progress, since touch doesn't hover;
 * - focus holds from `focus` to `blur`, visible as the `focus` said;
 * - a drag holds while more `dragStart`s than `dragStop`s have come.
 *
 * Kinds it doesn't know reach the subscribers and leave the state alone.
 */
export function createInteractionSource(): MutableInteractionSource {
    const ledger: Ledger = {
        presses: new Map(),
        hovers: 0,
        drags: 0,
        focused: false,
        focusVisible: false,
    };
    let state = IDLE_INTERACTION_STATE;
    let listeners: readonly InteractionListener[] = [];
    return {
        get state() {
            return state;
        },
        subscribe(listener) {
            // A copy per change, so a listener that subscribes or leaves during an emit doesn't
            // change who hears that interaction.
            listeners = [...listeners, listener];
            return () => {
                listeners = listeners.filter((other) => other !== listener);
            };
        },
        emit(interaction, origin) {
            record(ledger, interaction);
            state = derive(ledger, state);
            const current = state;
            for (const listener of listeners) {
                listener(interaction, current, origin);
            }
        },
    };
}

// Each interactive component's interaction source: the app's, from the `interactionSource` prop, or
// one of the component's own. `Pressable`'s callbacks emit to it through an emitter, as a machine's
// handlers do on the web, and the source's state is what the component selects with.
//
// Focus is visible only when it doesn't follow a press, the heuristic browsers use for
// `:focus-visible`: a hardware keyboard or a TV remote moving focus shows the focus indicator, and
// a touch or a click that focuses as it presses doesn't.

import {
    createInteractionSource,
    IDLE_INTERACTION_STATE,
} from "@pureform/binding-core/interaction";
import type {
    InteractionSource,
    InteractionState,
    MutableInteractionSource,
    PointerKind,
    PressOrigin,
} from "@pureform/binding-core/interaction";
import { InteractionEmitter } from "@pureform/machines/interaction";
import type { State } from "@pureform/rn-adapter/factory";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

/** A stable interaction source, the same on every render: share it between components
 *  (`interactionSource={source}`), observe it with `useInteractionState`, or emit to it. */
export function useInteractionSource(): MutableInteractionSource {
    return useState(createInteractionSource)[0];
}

/** What a source's interactions add up to, following each change: hovered, focused, pressed,
 *  dragged. */
export function useInteractionState(
    source: InteractionSource,
): InteractionState {
    const subscribe = useCallback(
        (onChange: () => void) => source.subscribe(() => onChange()),
        [source],
    );
    const read = () => source.state;
    return useSyncExternalStore(subscribe, read, read);
}

/** How long after a pointer press ends a focus still counts as following it: a browser focuses
 *  a tapped element once the touch has ended. */
export const FOCUS_AFTER_PRESS_MS = 500;

// Pointer presses in progress on any surface, and when the last one ended.
let pointerPresses = 0;
let lastPointerPress = Number.NEGATIVE_INFINITY;

const now = (): number => globalThis.performance?.now() ?? Date.now();

/** Whether a focus arriving now follows a press: a pointer press is in progress, or one ended
 *  less than `FOCUS_AFTER_PRESS_MS` ago. Such a focus isn't visible. */
export const focusFollowsPress = (): boolean =>
    pointerPresses > 0 || now() - lastPointerPress < FOCUS_AFTER_PRESS_MS;

/** What `Pressable` passes its callbacks, as far as they're read: React Native's responder event,
 *  or React Native Web's, whose `nativeEvent` is the DOM event's. */
export interface PressableEvent {
    /** Read for `pageX`, `pageY`, `type`, `pointerType`, and `key`. */
    readonly nativeEvent?: object;
    readonly currentTarget?: unknown;
}

// What's read from a `nativeEvent`.
interface NativeLike {
    readonly pageX?: number;
    readonly pageY?: number;
    readonly type?: string;
    readonly pointerType?: string;
    readonly key?: string;
}

const nativeOf = (event: PressableEvent | undefined): NativeLike =>
    (event?.nativeEvent ?? {}) as NativeLike;

/** `Pressable`'s callbacks that emit a surface's interactions. `onLayout` tells the source where
 *  the surface is (`locatedView`), so an overlay open from the start finds its trigger. */
export interface PressableHandlers {
    readonly onPressIn: (event?: PressableEvent) => void;
    readonly onPressOut: (event?: PressableEvent) => void;
    readonly onHoverIn: (event?: PressableEvent) => void;
    readonly onHoverOut: (event?: PressableEvent) => void;
    readonly onFocus: (event?: PressableEvent) => void;
    readonly onBlur: (event?: PressableEvent) => void;
    readonly onLayout: (event?: PressableEvent) => void;
}

// The view each source's surface was last laid out on, and who waits to hear of it.
const located = new WeakMap<object, unknown>();
const locateListeners = new WeakMap<object, Set<() => void>>();

/** The view `source`'s surface was last laid out on, if any. */
export const locatedView = (source: InteractionSource): unknown =>
    located.get(source);

/** Calls `listener` whenever `source`'s surface is laid out; returns what stops it. */
export function subscribeLocated(
    source: InteractionSource,
    listener: () => void,
): () => void {
    let listeners = locateListeners.get(source);
    if (!listeners) locateListeners.set(source, (listeners = new Set()));
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// React Native's layout event names its view as `currentTarget`; React Native Web's as
// `nativeEvent.target`.
const layoutView = (event: PressableEvent | undefined): unknown =>
    event?.currentTarget ??
    (event?.nativeEvent as { readonly target?: unknown } | undefined)?.target;

const finite = (value: number | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value);

// What pressed: a key (React Native Web's keyboard presses), no pointer at all, or the pointer
// the event names. React Native's own touches name none.
const pointerOf = (native: NativeLike): PointerKind => {
    if (native.key !== undefined || native.type?.startsWith("key")) {
        return "keyboard";
    }
    if (!finite(native.pageX) || !finite(native.pageY)) return "virtual";
    const type = native.pointerType;
    if (type === "mouse" || type === "pen" || type === "touch") return type;
    return native.type?.startsWith("mouse") ? "mouse" : "touch";
};

const originOf = (event: PressableEvent | undefined): unknown =>
    event?.currentTarget ?? undefined;

/** Whether a surface itself has focus, and whether it shows. */
export interface OwnFocus {
    readonly focused: boolean;
    readonly visible: boolean;
}

const NOT_FOCUSED: OwnFocus = Object.freeze({ focused: false, visible: false });

/** One surface's interactions from `Pressable` (or a responder view), emitted to the source
 *  `source()` returns when each happens. A press's origin is its page point (`pageX`, `pageY`),
 *  or the center for a key. */
export class NativeInteraction {
    readonly emitter: InteractionEmitter;
    // Whether the press in progress counts among the pointer presses focus follows.
    #pointer = false;
    #focus: OwnFocus = NOT_FOCUSED;
    readonly #focusListeners = new Set<() => void>();

    readonly #source: () => MutableInteractionSource | undefined;

    constructor(source: () => MutableInteractionSource | undefined) {
        this.emitter = new InteractionEmitter(source);
        this.#source = source;
    }

    /** Tells the source the view the surface is laid out on. */
    layout(event?: PressableEvent): void {
        const source = this.#source();
        const view = layoutView(event);
        if (!source || view === undefined || view === null) return;
        located.set(source, view);
        for (const listener of locateListeners.get(source) ?? []) listener();
    }

    /** Starts a press, unless one is in progress. */
    press(event?: PressableEvent): void {
        if (this.emitter.pressing) return;
        const native = nativeOf(event);
        const pointer = pointerOf(native);
        const origin: PressOrigin =
            pointer === "keyboard" || pointer === "virtual"
                ? "center"
                : { x: native.pageX!, y: native.pageY! };
        this.emitter.press(origin, pointer, originOf(event));
        if (pointer !== "keyboard" && pointer !== "virtual") {
            this.#pointer = true;
            pointerPresses++;
        }
    }

    #ended(): void {
        if (!this.#pointer) return;
        this.#pointer = false;
        pointerPresses--;
        lastPointerPress = now();
    }

    release(event?: PressableEvent): void {
        this.emitter.release(originOf(event));
        this.#ended();
    }

    cancel(event?: PressableEvent): void {
        this.emitter.cancel(originOf(event));
        this.#ended();
    }

    /** Hovers, unless the pointer is touch, which never hovers. */
    hoverIn(event?: PressableEvent): void {
        if (nativeOf(event).pointerType === "touch") return;
        this.emitter.hoverEnter(originOf(event));
    }

    hoverOut(event?: PressableEvent): void {
        this.emitter.hoverExit(originOf(event));
    }

    /** Whether this surface itself has focus, and whether it shows: a source shared with others
     *  never carries focus to them. */
    get ownFocus(): OwnFocus {
        return this.#focus;
    }

    /** Calls `listener` when `ownFocus` changes; returns what stops it. */
    readonly subscribeFocus = (listener: () => void): (() => void) => {
        this.#focusListeners.add(listener);
        return () => this.#focusListeners.delete(listener);
    };

    #setFocus(focus: OwnFocus): void {
        if (
            focus.focused === this.#focus.focused &&
            focus.visible === this.#focus.visible
        ) {
            return;
        }
        this.#focus = focus;
        for (const listener of this.#focusListeners) listener();
    }

    /** Focuses, visibly unless the focus follows a press. */
    focus(event?: PressableEvent): void {
        const visible = !focusFollowsPress();
        this.emitter.focus(visible, originOf(event));
        this.#setFocus({ focused: true, visible });
    }

    blur(event?: PressableEvent): void {
        this.emitter.blur(originOf(event));
        this.#setFocus(NOT_FOCUSED);
    }

    dragStart(): void {
        this.emitter.dragStart();
    }

    dragStop(): void {
        this.emitter.dragStop();
    }

    /** Ends everything in progress: a cancel, a drag stop, a hover exit, and a blur. */
    end(): void {
        this.emitter.end();
        this.#ended();
        this.#setFocus(NOT_FOCUSED);
    }

    /** The callbacks to spread on a `Pressable`. */
    readonly handlers: PressableHandlers = {
        onPressIn: (event) => this.press(event),
        onPressOut: (event) => this.release(event),
        onHoverIn: (event) => this.hoverIn(event),
        onHoverOut: (event) => this.hoverOut(event),
        onFocus: (event) => this.focus(event),
        onBlur: (event) => this.blur(event),
        onLayout: (event) => this.layout(event),
    };
}

/** A surface's interactions, emitted to `source` as it is at each emit. It ends what's in
 *  progress when it unmounts, and while `disabled`. */
export function useNativeInteraction(
    source: MutableInteractionSource | undefined,
    disabled = false,
): NativeInteraction {
    const latest = useRef(source);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    latest.current = source;
    const [interaction] = useState(
        // oxlint-disable-next-line react/refs -- the handler reads the ref when it runs, after render
        () => new NativeInteraction(() => latest.current),
    );
    useEffect(() => () => interaction.end(), [interaction]);
    useEffect(() => {
        if (disabled) interaction.end();
    }, [interaction, disabled]);
    return interaction;
}

/** What a component's surface interacts through: its source (the app's, else its own), what
 *  emits to it, and the state it adds up to, idle while disabled. Focus is the surface's own:
 *  another surface's focus on a shared source never shows here. */
export interface Interaction {
    readonly source: MutableInteractionSource;
    readonly interaction: NativeInteraction;
    readonly state: InteractionState;
}

/** A component's interaction: the app's source when it gives one, else the component's own. */
export function useInteraction(
    given: MutableInteractionSource | undefined,
    disabled = false,
): Interaction {
    const own = useInteractionSource();
    const source = given ?? own;
    const interaction = useNativeInteraction(source, disabled);
    const shared = useInteractionState(source);
    const focus = useSyncExternalStore(
        interaction.subscribeFocus,
        () => interaction.ownFocus,
        () => interaction.ownFocus,
    );
    const state = useMemo(
        () => ({
            ...shared,
            focused: focus.focused,
            focusVisible: focus.visible,
        }),
        [shared, focus],
    );
    return {
        source,
        interaction,
        state: disabled ? IDLE_INTERACTION_STATE : state,
    };
}

/** A component's states for its selection: its own (`disabled`, `checked`, …), and what its
 *  source's state says (`pressed` and `active`, `hover`, `focus`, `focusVisible`). */
export const interactionStates = (
    state: InteractionState,
    own: Omit<
        State,
        "pressed" | "hover" | "focus" | "focusVisible" | "active"
    > = {},
): State => ({
    ...own,
    pressed: state.pressed,
    active: state.pressed,
    hover: state.hovered,
    focus: state.focused,
    focusVisible: state.focusVisible,
});

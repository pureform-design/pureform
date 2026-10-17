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

/** `Pressable`'s callbacks that emit a surface's interactions. */
export interface PressableHandlers {
    readonly onPressIn: (event?: PressableEvent) => void;
    readonly onPressOut: (event?: PressableEvent) => void;
    readonly onHoverIn: (event?: PressableEvent) => void;
    readonly onHoverOut: (event?: PressableEvent) => void;
    readonly onFocus: (event?: PressableEvent) => void;
    readonly onBlur: (event?: PressableEvent) => void;
}

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

/** One surface's interactions from `Pressable` (or a responder view), emitted to the source
 *  `source()` returns when each happens. A press's origin is its page point (`pageX`, `pageY`),
 *  or the center for a key. */
export class NativeInteraction {
    readonly emitter: InteractionEmitter;
    // Whether the press in progress counts among the pointer presses focus follows.
    #pointer = false;

    constructor(source: () => MutableInteractionSource | undefined) {
        this.emitter = new InteractionEmitter(source);
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

    /** Focuses, visibly unless the focus follows a press. */
    focus(event?: PressableEvent): void {
        this.emitter.focus(!focusFollowsPress(), originOf(event));
    }

    blur(event?: PressableEvent): void {
        this.emitter.blur(originOf(event));
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
    }

    /** The callbacks to spread on a `Pressable`. */
    readonly handlers: PressableHandlers = {
        onPressIn: (event) => this.press(event),
        onPressOut: (event) => this.release(event),
        onHoverIn: (event) => this.hoverIn(event),
        onHoverOut: (event) => this.hoverOut(event),
        onFocus: (event) => this.focus(event),
        onBlur: (event) => this.blur(event),
    };
}

/** A surface's interactions, emitted to `source` as it is at each emit. It ends what's in
 *  progress when it unmounts, and while `disabled`. */
export function useNativeInteraction(
    source: MutableInteractionSource | undefined,
    disabled = false,
): NativeInteraction {
    const latest = useRef(source);
    latest.current = source;
    const [interaction] = useState(
        () => new NativeInteraction(() => latest.current),
    );
    useEffect(() => () => interaction.end(), [interaction]);
    useEffect(() => {
        if (disabled) interaction.end();
    }, [interaction, disabled]);
    return interaction;
}

/** What a component's surface interacts through: its source (the app's, else its own), what
 *  emits to it, and the state it adds up to, idle while disabled. */
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
    const state = useInteractionState(source);
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

// How pureform's machines emit to an interaction source: one emitter per surface, which remembers
// what it has emitted, so it emits each change once and can end what's in progress.

import type {
    MutableInteractionSource,
    PointerKind,
    PressOrigin,
} from "@pureform/binding-core/interaction";

// Events an inner surface has already claimed, so nested pressables emit a press once, from the
// innermost: a press bubbles to every ancestor's handlers.
const claimed = new WeakSet<object>();

// React passes its own event object to each handler; the native event under it is shared.
const nativeEvent = (event: object): object =>
    (event as { nativeEvent?: object }).nativeEvent ?? event;

/** Claims an event for the surface handling it: true for the first (innermost) surface to ask,
 *  false once another has. */
export function claimEvent(event: object): boolean {
    const native = nativeEvent(event);
    if (claimed.has(native)) return false;
    claimed.add(native);
    return true;
}

/** What a DOM pointer event's `pointerType` says, as a `PointerKind`: a click with no pointer
 *  type behind it is virtual. */
export const pointerKind = (pointerType: string | undefined): PointerKind =>
    pointerType === "mouse" || pointerType === "pen" || pointerType === "touch"
        ? pointerType
        : "virtual";

/** Whether the browser shows a focus ring for this element's focus, which `:focus-visible`
 *  already decides. */
export const isFocusVisible = (element: Element): boolean => {
    try {
        return element.matches(":focus-visible");
    } catch {
        return false;
    }
};

interface PointerLike {
    readonly button: number;
    readonly pointerType: string;
    readonly clientX: number;
    readonly clientY: number;
}

interface KeyLike {
    readonly repeat: boolean;
}

// Unique across sources, since a press's id pairs it with its end on a source others may share.
let lastPressId = 0;

/** Emits one surface's interactions to its source, read at each emit: `source()` returns the
 *  source the machine's props pass, and `undefined` emits nothing. */
export class InteractionEmitter {
    readonly source: () => MutableInteractionSource | undefined;
    #press: { id: number; pointer: PointerKind } | undefined;
    #hovered = false;
    #focused: boolean | undefined;
    #dragging = false;
    #untrack: (() => void) | undefined;
    #clickPending = false;
    #clickTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(source: () => MutableInteractionSource | undefined) {
        this.source = source;
    }

    #emit(
        interaction: Parameters<MutableInteractionSource["emit"]>[0],
        origin: unknown,
    ): void {
        this.source()?.emit(interaction, origin);
    }

    /** Whether a press it emitted hasn't ended, and from what. */
    get pressing(): PointerKind | undefined {
        return this.#press?.pointer;
    }

    /** Starts a press, unless one is in progress. */
    press(origin: PressOrigin, pointer: PointerKind, element?: unknown): void {
        if (this.#press) return;
        if (pointer !== "virtual") {
            clearTimeout(this.#clickTimer);
            this.#clickPending = true;
        }
        const id = ++lastPressId;
        this.#press = { id, pointer };
        this.#emit({ type: "press", id, origin, pointer }, element);
    }

    /** Ends the press in progress with a release. */
    release(element?: unknown): void {
        this.#end("release", element);
    }

    /** Ends the press in progress with a cancel. */
    cancel(element?: unknown): void {
        this.#end("cancel", element);
    }

    #end(type: "release" | "cancel", element: unknown): void {
        this.#untrack?.();
        this.#untrack = undefined;
        const press = this.#press;
        if (!press) return;
        this.#press = undefined;
        this.#emit({ type, id: press.id }, element);
        if (press.pointer !== "virtual") {
            clearTimeout(this.#clickTimer);
            this.#clickTimer = setTimeout(() => {
                this.#clickPending = false;
            }, 0);
        }
    }

    /** Click-only activation (AT or programmatic .click()). Physical clicks have a positive
     *  detail; keyboard clicks follow a press already emitted in this event turn. Claim even a
     *  deduplicated click so an outer surface cannot manufacture a second press for it. */
    click(event: { readonly detail?: number }, element?: unknown): void {
        if (!claimEvent(event)) return;
        const duplicate =
            this.#press !== undefined ||
            this.#clickPending ||
            (event.detail ?? 0) > 0;
        this.#clickPending = false;
        if (duplicate) return;
        this.press("center", "virtual", element);
        this.release(element);
    }

    /** A primary pointer going down on `element`, unless an inner surface claimed it: starts a
     *  press from where it went down, which ends wherever the pointer is let go, as `:active`
     *  does. Returns whether it pressed. */
    pointerDown(event: PointerLike, element: Element): boolean {
        if (event.button !== 0 || this.#press || !claimEvent(event)) {
            return false;
        }
        this.press(
            { x: event.clientX, y: event.clientY },
            pointerKind(event.pointerType),
            element,
        );
        const win = element.ownerDocument.defaultView;
        if (!win) return true;
        const release = () => this.release(element);
        const cancel = () => this.cancel(element);
        win.addEventListener("pointerup", release, true);
        win.addEventListener("pointercancel", cancel, true);
        this.#untrack = () => {
            win.removeEventListener("pointerup", release, true);
            win.removeEventListener("pointercancel", cancel, true);
        };
        return true;
    }

    /** A key that presses (Enter or Space, as the caller decides) going down on `element`,
     *  unless an inner surface claimed it or it repeats: a press from the center. Returns whether
     *  it pressed. */
    keyDown(event: KeyLike, element: unknown): boolean {
        if (event.repeat || this.#press || !claimEvent(event)) return false;
        this.press("center", "keyboard", element);
        return true;
    }

    /** The pressing key coming up: ends a keyboard press with a release. */
    keyUp(element?: unknown): void {
        if (this.#press?.pointer === "keyboard") this.release(element);
    }

    /** A pointer over the surface: hovers, unless it's touch, which never hovers. */
    pointerOver(
        event: { readonly pointerType: string },
        element: unknown,
    ): void {
        if (event.pointerType === "touch") return;
        this.hoverEnter(element);
    }

    /** Hovers, once until `hoverExit`. */
    hoverEnter(element?: unknown): void {
        if (this.#hovered) return;
        this.#hovered = true;
        this.#emit({ type: "hoverEnter" }, element);
    }

    hoverExit(element?: unknown): void {
        if (!this.#hovered) return;
        this.#hovered = false;
        this.#emit({ type: "hoverExit" }, element);
    }

    /** Focus arriving on `element`, visible as `:focus-visible` says. */
    focusIn(element: Element): void {
        this.focus(isFocusVisible(element), element);
    }

    /** Focuses, once until `blur`, or again when the visibility changes. */
    focus(visible: boolean, element?: unknown): void {
        if (this.#focused === visible) return;
        this.#focused = visible;
        this.#emit({ type: "focus", visible }, element);
    }

    /** Blurs, and cancels a keyboard press, whose key can't come up here any more. */
    blur(element?: unknown): void {
        if (this.#press?.pointer === "keyboard") this.cancel(element);
        if (this.#focused === undefined) return;
        this.#focused = undefined;
        this.#emit({ type: "blur" }, element);
    }

    dragStart(element?: unknown): void {
        if (this.#dragging) return;
        this.#dragging = true;
        this.#emit({ type: "dragStart" }, element);
    }

    dragStop(element?: unknown): void {
        if (!this.#dragging) return;
        this.#dragging = false;
        this.#emit({ type: "dragStop" }, element);
    }

    /** Ends everything in progress, as a surface that becomes disabled does: a cancel, a drag
     *  stop, a hover exit, and a blur. */
    end(element?: unknown): void {
        this.cancel(element);
        this.dragStop(element);
        this.hoverExit(element);
        this.blur(element);
        clearTimeout(this.#clickTimer);
        this.#clickPending = false;
    }

    #ending = false;

    /** The surface is disabled now, as its props say while they're computed: ends what it has in
     *  progress once the current work is done, since a render mustn't notify the source's
     *  subscribers (other components) while it runs. Nothing happens when nothing is in
     *  progress. */
    disabled(element?: unknown): void {
        const busy =
            this.#press !== undefined ||
            this.#hovered ||
            this.#focused !== undefined ||
            this.#dragging;
        if (!busy || this.#ending) return;
        this.#ending = true;
        queueMicrotask(() => {
            this.#ending = false;
            this.end(element);
        });
    }
}

/** A machine's emitters, one per surface: its own (`""`) and one per item of a composite (by
 *  the item's value), each reading its source when it emits. */
export class InteractionEmitters {
    /** The item a highlight last hovered, for a machine that turns its highlight into hover. */
    highlighted: string | null = null;
    readonly #emitters = new Map<string, InteractionEmitter>();
    readonly #prop: (key: string) => unknown;

    constructor(prop: (key: string) => unknown) {
        this.#prop = prop;
    }

    /** The emitter for the machine's own surface, to its `interactionSource` prop. */
    get own(): InteractionEmitter {
        return this.#get("", () => this.#prop("interactionSource"));
    }

    /** The emitter for an item, to the source its `itemInteractionSource` prop gives. */
    item(value: string): InteractionEmitter {
        return this.#get(`item:${value}`, () =>
            (
                this.#prop("itemInteractionSource") as
                    | ((value: string) => MutableInteractionSource)
                    | undefined
            )?.(value),
        );
    }

    #get(key: string, source: () => unknown): InteractionEmitter {
        let emitter = this.#emitters.get(key);
        if (!emitter) {
            emitter = new InteractionEmitter(
                source as () => MutableInteractionSource | undefined,
            );
            this.#emitters.set(key, emitter);
        }
        return emitter;
    }

    /** Ends what every surface has in progress. */
    end(): void {
        for (const emitter of this.#emitters.values()) emitter.end();
    }
}

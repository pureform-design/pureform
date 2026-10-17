import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    createInteractionSource,
    IDLE_INTERACTION_STATE,
    type Interaction,
    type InteractionState,
} from "./interaction";

// An app's own kind, as an app adds one.
declare module "./interaction" {
    interface InteractionKinds {
        "app:longPress": { id: number; duration: number };
    }
}

const press = (id: number, pointer: "mouse" | "touch" | "keyboard" = "mouse") =>
    ({
        type: "press",
        id,
        origin: pointer === "keyboard" ? "center" : { x: 1, y: 2 },
        pointer,
    }) as const;

function recorded() {
    const source = createInteractionSource();
    const seen: [Interaction, InteractionState, unknown][] = [];
    source.subscribe((interaction, state, origin) =>
        seen.push([interaction, state, origin]),
    );
    return { source, seen };
}

describe("createInteractionSource", () => {
    it("starts idle", () => {
        const source = createInteractionSource();
        expect(source.state).toBe(IDLE_INTERACTION_STATE);
        expect(source.state).toEqual({
            hovered: false,
            focused: false,
            focusVisible: false,
            pressed: false,
            dragged: false,
        });
    });

    it("holds a press until its release or cancel", () => {
        const source = createInteractionSource();
        source.emit(press(1));
        expect(source.state.pressed).toBe(true);
        source.emit({ type: "release", id: 2 });
        expect(source.state.pressed).toBe(true);
        source.emit({ type: "release", id: 1 });
        expect(source.state.pressed).toBe(false);

        source.emit(press(3, "keyboard"));
        source.emit({ type: "cancel", id: 3 });
        expect(source.state.pressed).toBe(false);
    });

    it("stays pressed while any of several presses holds", () => {
        const source = createInteractionSource();
        source.emit(press(1));
        source.emit(press(2));
        source.emit({ type: "cancel", id: 1 });
        expect(source.state.pressed).toBe(true);
        source.emit({ type: "release", id: 2 });
        expect(source.state.pressed).toBe(false);
    });

    it("hovers while more enters than exits have come", () => {
        const source = createInteractionSource();
        source.emit({ type: "hoverEnter" });
        source.emit({ type: "hoverEnter" });
        source.emit({ type: "hoverExit" });
        expect(source.state.hovered).toBe(true);
        source.emit({ type: "hoverExit" });
        expect(source.state.hovered).toBe(false);
        // An exit too many doesn't leave a debt for the next enter.
        source.emit({ type: "hoverExit" });
        source.emit({ type: "hoverEnter" });
        expect(source.state.hovered).toBe(true);
    });

    it("never hovers during a touch press", () => {
        const source = createInteractionSource();
        source.emit({ type: "hoverEnter" });
        source.emit(press(1, "touch"));
        expect(source.state).toMatchObject({ hovered: false, pressed: true });
        source.emit({ type: "release", id: 1 });
        expect(source.state.hovered).toBe(true);

        source.emit(press(2, "mouse"));
        expect(source.state.hovered).toBe(true);
    });

    it("tracks focus and whether it's visible", () => {
        const source = createInteractionSource();
        source.emit({ type: "focus", visible: true });
        expect(source.state).toMatchObject({
            focused: true,
            focusVisible: true,
        });
        source.emit({ type: "blur" });
        expect(source.state).toMatchObject({
            focused: false,
            focusVisible: false,
        });
        source.emit({ type: "focus", visible: false });
        expect(source.state).toMatchObject({
            focused: true,
            focusVisible: false,
        });
    });

    it("drags between start and stop", () => {
        const source = createInteractionSource();
        source.emit({ type: "dragStart" });
        expect(source.state.dragged).toBe(true);
        source.emit({ type: "dragStop" });
        expect(source.state.dragged).toBe(false);
        source.emit({ type: "dragStop" });
        expect(source.state.dragged).toBe(false);
    });

    it("tells each subscriber every interaction, with the state after it and its origin", () => {
        const { source, seen } = recorded();
        const element = document.createElement("button");
        source.emit(press(1), element);
        source.emit({ type: "release", id: 1 });
        expect(seen).toEqual([
            [press(1), { ...IDLE_INTERACTION_STATE, pressed: true }, element],
            [{ type: "release", id: 1 }, IDLE_INTERACTION_STATE, undefined],
        ]);
    });

    it("keeps the state object while nothing changes", () => {
        const { source, seen } = recorded();
        source.emit({ type: "blur" });
        expect(source.state).toBe(IDLE_INTERACTION_STATE);
        source.emit({ type: "focus", visible: false });
        const focused = source.state;
        source.emit({ type: "release", id: 9 });
        expect(source.state).toBe(focused);
        expect(seen).toHaveLength(3);
        expect(Object.isFrozen(focused)).toBe(true);
    });

    it("passes an app's kind to subscribers and leaves the state alone", () => {
        const { source, seen } = recorded();
        source.emit({ type: "app:longPress", id: 1, duration: 600 });
        expect(source.state).toBe(IDLE_INTERACTION_STATE);
        expect(seen).toEqual([
            [
                { type: "app:longPress", id: 1, duration: 600 },
                IDLE_INTERACTION_STATE,
                undefined,
            ],
        ]);
    });

    it("stops telling a subscriber once it unsubscribes", () => {
        const source = createInteractionSource();
        const listener = vi.fn();
        const unsubscribe = source.subscribe(listener);
        source.emit({ type: "hoverEnter" });
        unsubscribe();
        source.emit({ type: "hoverExit" });
        expect(listener).toHaveBeenCalledOnce();
    });

    it("tells the subscribers there were when an interaction was emitted", () => {
        const source = createInteractionSource();
        const late = vi.fn();
        const second = vi.fn();
        source.subscribe(() => {
            source.subscribe(late);
        });
        const unsubscribe = source.subscribe(second);
        source.subscribe(() => unsubscribe());
        source.emit({ type: "hoverEnter" });
        expect(late).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
    });

    it("lets a subscriber that attaches late read what came before from the state", () => {
        const source = createInteractionSource();
        source.emit(press(1));
        const listener = vi.fn();
        source.subscribe(listener);
        expect(source.state.pressed).toBe(true);
        source.emit({ type: "release", id: 1 });
        expect(listener).toHaveBeenCalledExactlyOnceWith(
            { type: "release", id: 1 },
            IDLE_INTERACTION_STATE,
            undefined,
        );
    });

    it("narrows an app's kind beside pureform's in a switch", () => {
        const describe = (interaction: Interaction): string => {
            switch (interaction.type) {
                case "press":
                    expectTypeOf(interaction.origin).toEqualTypeOf<
                        { x: number; y: number } | "center"
                    >();
                    return `press ${interaction.pointer}`;
                case "app:longPress":
                    expectTypeOf(interaction.duration).toEqualTypeOf<number>();
                    return `long press ${interaction.duration}`;
                case "focus":
                    expectTypeOf(interaction.visible).toEqualTypeOf<boolean>();
                    return "focus";
                default:
                    return interaction.type;
            }
        };
        expect(describe(press(1))).toBe("press mouse");
        expect(describe({ type: "app:longPress", id: 1, duration: 600 })).toBe(
            "long press 600",
        );
        expectTypeOf<Interaction["type"]>().toEqualTypeOf<
            | "press"
            | "release"
            | "cancel"
            | "hoverEnter"
            | "hoverExit"
            | "focus"
            | "blur"
            | "dragStart"
            | "dragStop"
            | "app:longPress"
        >();

        const source = createInteractionSource();
        // @ts-expect-error: a kind's details are typed.
        source.emit({ type: "app:longPress", id: 1 });
        // @ts-expect-error: a kind nobody declared isn't an interaction.
        source.emit({ type: "app:unknown" });
    });

    it("types the source as never null", () => {
        expectTypeOf(createInteractionSource()).not.toBeNullable();
        expectTypeOf(createInteractionSource().state).not.toBeNullable();
    });
});

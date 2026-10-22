// Type tests. This file augments `ComponentRegistry` as generated declarations do; the
// augmentation reaches every file in the type check, so tests that depend on the registry stay
// here and the other specs describe components by shape.
import { describe, expectTypeOf, it } from "vitest";

import type {
    ClassFactory,
    ClassSlots,
    ComponentName,
    ComponentState,
    InstanceTokens,
    LazyComponentName,
    Selection,
    SlotClasses,
    SlotOf,
    StateOf,
    States,
    StaticComponentName,
    StyleFactory,
    InstanceSpringValue,
    SpringRole,
    TokenValue,
    Variants,
} from "./types";

declare module "./types" {
    interface ComponentRegistry {
        button: {
            variants: {
                variant: "filled" | "text";
                toggle: "true" | "false";
            };
            slots: "root" | "label";
            states: "pressed" | "disabled";
            tokens: "accent" | "move";
            springs: "move";
        };
        card: {
            variants: { interactive: "true" | "false" };
            lazy: true;
        };
    }
    interface SpringRoleRegistry {
        spatialFast: true;
        spatialSlow: true;
    }
}

describe("registered components", () => {
    it("names them", () => {
        expectTypeOf<ComponentName>().toEqualTypeOf<"button" | "card">();
        expectTypeOf<StaticComponentName>().toEqualTypeOf<"button">();
        expectTypeOf<LazyComponentName>().toEqualTypeOf<"card">();
    });

    it("types variants, with booleans for true and false groups", () => {
        expectTypeOf<Variants<"button">>().toEqualTypeOf<{
            variant?: "filled" | "text" | undefined;
            toggle?: "true" | "false" | boolean | undefined;
        }>();
        const ok: Variants<"button"> = { variant: "text", toggle: true };
        // @ts-expect-error a value the group doesn't have
        const bad: Variants<"button"> = { variant: "tonal" };
        // @ts-expect-error a group the component doesn't have
        const extra: Variants<"button"> = { size: "small" };
        void [ok, bad, extra];
    });

    it("types slots, with root for a single-slot component", () => {
        expectTypeOf<SlotOf<"button">>().toEqualTypeOf<"root" | "label">();
        expectTypeOf<SlotOf<"card">>().toEqualTypeOf<"root">();
    });

    it("types states, every one where the component lists none", () => {
        expectTypeOf<StateOf<"button">>().toEqualTypeOf<
            "pressed" | "disabled"
        >();
        expectTypeOf<States<"button">>().toEqualTypeOf<{
            pressed?: boolean;
            disabled?: boolean;
        }>();
        expectTypeOf<StateOf<"card">>().toEqualTypeOf<ComponentState>();
        expectTypeOf<ComponentState>().toEqualTypeOf<
            | "hover"
            | "focus"
            | "focusVisible"
            | "active"
            | "pressed"
            | "dragged"
            | "disabled"
            | "selected"
            | "checked"
            | "invalid"
            | "readOnly"
            | "filled"
            | "expanded"
            | "descending"
            | "mirrored"
            | "overflowing"
            | "indeterminate"
            | "rtl"
            | "reducedMotion"
        >();
    });

    it("types instance tokens", () => {
        expectTypeOf<InstanceTokens<"button">>().toEqualTypeOf<{
            accent?: TokenValue | undefined;
            move?: InstanceSpringValue | undefined;
        }>();
        expectTypeOf<InstanceTokens<"card">>().toEqualTypeOf<{}>();
        const selection: Selection<"button"> = {
            variant: "filled",
            tokens: { accent: "red" },
        };
        // @ts-expect-error a token the component doesn't have
        const bad: Selection<"button"> = { tokens: { value: 1 } };
        void [selection, bad];
    });

    it("takes a spring or a role's name only on a spring token", () => {
        expectTypeOf<SpringRole>().toEqualTypeOf<
            "spatialFast" | "spatialSlow"
        >();
        const spring = {
            type: "spring",
            stiffness: 800,
            damping: 0.6,
            mass: 1,
        } as const;
        const springs: Selection<"button"> = {
            tokens: { move: spring },
        };
        const role: Selection<"button"> = { tokens: { move: "spatialSlow" } };
        // @ts-expect-error a spring on a token that isn't one
        const misplaced: Selection<"button"> = { tokens: { accent: spring } };
        // @ts-expect-error a role the theme doesn't have
        const unknown: Selection<"button"> = { tokens: { move: "bouncy" } };
        // @ts-expect-error a plain value on a spring token
        const plain: Selection<"button"> = { tokens: { move: 200 } };
        void [springs, role, misplaced, unknown, plain];
    });

    it("types the web factory: variants in, classes per slot out", () => {
        expectTypeOf<ClassFactory<"button">>()
            .parameter(0)
            .toEqualTypeOf<Selection<"button">>();
        expectTypeOf<ReturnType<ClassFactory<"button">>>().toEqualTypeOf<
            ClassSlots<"button">
        >();
        expectTypeOf<ClassSlots<"button">>().toEqualTypeOf<{
            readonly root: SlotClasses;
            readonly label: SlotClasses;
        }>();
        const button: ClassFactory<"button"> = () => ({
            root: { class: "a", style: { "--x": "1" } },
            label: { class: "b" },
        });
        // @ts-expect-error a slot is missing
        const partial: ClassFactory<"button"> = () => ({
            root: { class: "a" },
        });
        // @ts-expect-error states aren't in a web selection
        button({ pressed: true });
        void partial;
    });

    it("types the native factory: variants and states in, styles per slot out", () => {
        type Native = StyleFactory<"button", { opacity?: number }>;
        expectTypeOf<Native>()
            .parameter(0)
            .toEqualTypeOf<Selection<"button"> & States<"button">>();
        expectTypeOf<ReturnType<Native>["label"]["style"]>().toEqualTypeOf<{
            opacity?: number;
        }>();
    });

    it("rejects a name that isn't registered", () => {
        // @ts-expect-error not a registered component
        type Missing = Variants<"missing">;
        void (0 as unknown as Missing);
    });
});

describe("components described by shape", () => {
    type Progress = {
        variants: { indeterminate: "true" | "false" };
        slots: "root" | "indicator";
        tokens: "value";
    };

    it("types them as a registered one", () => {
        expectTypeOf<Variants<Progress>>().toEqualTypeOf<{
            indeterminate?: "true" | "false" | boolean | undefined;
        }>();
        expectTypeOf<SlotOf<Progress>>().toEqualTypeOf<"root" | "indicator">();
        expectTypeOf<InstanceTokens<Progress>>().toEqualTypeOf<{
            value?: TokenValue | undefined;
        }>();
    });

    it("defaults what the shape leaves out", () => {
        expectTypeOf<Variants<{}>>().toEqualTypeOf<{}>();
        expectTypeOf<SlotOf<{}>>().toEqualTypeOf<"root">();
        expectTypeOf<StateOf<{}>>().toEqualTypeOf<ComponentState>();
        expectTypeOf<InstanceTokens<{}>>().toEqualTypeOf<{}>();
    });
});

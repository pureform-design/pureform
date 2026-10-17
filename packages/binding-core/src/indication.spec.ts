import { describe, expect, expectTypeOf, it } from "vitest";

import {
    defineIndication,
    type Indication,
    type IndicationContext,
    type IndicationTarget,
    type NativeIndicationProps,
} from "./indication";
import { createInteractionSource, type InteractionSource } from "./interaction";

describe("defineIndication", () => {
    it("returns the indication it's given", () => {
        const indication = { name: "flat", tokens: { stateHoverOpacity: 0 } };
        expect(defineIndication(indication)).toBe(indication);
    });

    it("types a web effect over the target, source, and context", () => {
        const scaled = defineIndication({
            name: "app:scale",
            layer: false,
            web(target, source, context) {
                expectTypeOf(target).toEqualTypeOf<IndicationTarget>();
                expectTypeOf(source).toEqualTypeOf<InteractionSource>();
                expectTypeOf(context).toEqualTypeOf<IndicationContext>();
                return source.subscribe((_, state) => {
                    target.surface.style.scale = state.pressed ? "0.98" : "";
                });
            },
        });
        const surface = document.createElement("div");
        const source = createInteractionSource();
        const cleanup = scaled.web?.({ trigger: surface, surface }, source, {
            centered: false,
            reducedMotion: () => false,
            dir: () => "ltr",
            registry: {} as IndicationContext["registry"],
        });
        source.emit({
            type: "press",
            id: 1,
            origin: "center",
            pointer: "keyboard",
        });
        expect(surface.style.scale).toBe("0.98");
        cleanup?.();
        source.emit({ type: "release", id: 1 });
        expect(surface.style.scale).toBe("0.98");
    });

    it("takes a native function or class component without depending on React", () => {
        const Fn = (props: NativeIndicationProps) => props.centered;
        class Klass {
            constructor(readonly props: NativeIndicationProps) {}
        }
        expectTypeOf(
            defineIndication({ name: "fn", native: Fn }),
        ).toEqualTypeOf<Indication>();
        expectTypeOf(
            defineIndication({ name: "class", native: Klass }),
        ).toEqualTypeOf<Indication>();
        const Wrong = (props: { other: string }) => props.other;
        // @ts-expect-error: a component must take NativeIndicationProps.
        defineIndication({ name: "wrong", native: Wrong });
        // @ts-expect-error: an indication has a name.
        defineIndication({ tokens: {} });
    });
});

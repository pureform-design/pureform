import { describe, expect, expectTypeOf, it } from "vitest";

import {
    defineIndication,
    DEFAULT_INDICATION,
    materialIndication,
    noIndication,
    type Indication,
    type NativeIndicationProps,
} from "./indication";

describe("neutral built-in indications", () => {
    it("keeps the default and option identities without platform live halves", () => {
        expect(materialIndication()).toBe(DEFAULT_INDICATION);
        expect(materialIndication({ ripple: "ink-well" })).toBe(
            DEFAULT_INDICATION,
        );
        for (const ripple of ["ink-well", "ink-sparkle", false] as const) {
            const indication = materialIndication({ ripple });
            expect(materialIndication({ ripple })).toBe(indication);
            expect(Object.isFrozen(indication)).toBe(true);
            expect(indication).not.toHaveProperty("web");
            expect(indication).not.toHaveProperty("native");
            expect(!!indication.layer).toBe(ripple !== false);
        }
    });

    it("keeps noIndication's frozen neutral token defaults", () => {
        expect(Object.isFrozen(noIndication)).toBe(true);
        expect(Object.isFrozen(noIndication.tokens)).toBe(true);
        expect(noIndication).toEqual({
            name: "none",
            tokens: {
                stateHoverOpacity: 0,
                stateFocusOpacity: 0,
                statePressedOpacity: 0,
                stateDraggedOpacity: 0,
            },
        });
    });
});

describe("defineIndication", () => {
    it("returns the indication it's given", () => {
        const indication = { name: "flat", tokens: { stateHoverOpacity: 0 } };
        expect(defineIndication(indication)).toBe(indication);
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

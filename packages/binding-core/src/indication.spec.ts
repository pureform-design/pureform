import { describe, expect, expectTypeOf, it } from "vitest";

import {
    defineIndication,
    type Indication,
    type NativeIndicationProps,
} from "./indication";

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

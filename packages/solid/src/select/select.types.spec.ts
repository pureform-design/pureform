import { expectTypeOf, it } from "vitest";

import type { SelectProps, SelectRootProps } from ".";

it("keeps ready-made and composed values, defaults and callbacks mode-dependent", () => {
    const single = {
        value: "s",
        defaultValue: null,
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<string | null>(),
    } satisfies SelectProps;
    const multiple = {
        multiple: true,
        value: ["s"] as readonly string[],
        defaultValue: ["m"] as readonly string[],
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<readonly string[]>(),
    } satisfies SelectProps;
    expectTypeOf(single).toExtend<SelectRootProps>();
    expectTypeOf(multiple).toExtend<SelectRootProps>();
    expectTypeOf({
        ...single,
        multiple: false as const,
    }).toExtend<SelectProps>();

    // @ts-expect-error an array value requires multiple
    const arrayValue: SelectProps = { value: ["s"] };
    // @ts-expect-error an array default requires multiple
    const arrayDefault: SelectProps = { multiple: false, defaultValue: ["s"] };
    // @ts-expect-error multiple requires an array value
    const scalarValue: SelectProps = { multiple: true, value: "s" };
    // @ts-expect-error multiple requires an array default
    const scalarDefault: SelectProps = { multiple: true, defaultValue: "s" };
    // @ts-expect-error multiple requires an array value, not null
    const nullValue: SelectProps = { multiple: true, value: null };
    // @ts-expect-error single callbacks receive a string or null
    const singleCallback: SelectProps = {
        onValueChange: ({ value }: { value: readonly string[] }) => value,
    };
    // @ts-expect-error multiple callbacks receive arrays
    const multipleCallback: SelectProps = {
        multiple: true,
        onValueChange: ({ value }: { value: string | null }) => value,
    };
    // @ts-expect-error the composed root types its value the same way
    const rootArray: SelectRootProps = { value: ["s"] };
    // @ts-expect-error the composed root types its value the same way
    const rootScalar: SelectRootProps = { multiple: true, value: "s" };
    void [
        arrayValue,
        arrayDefault,
        scalarValue,
        scalarDefault,
        nullValue,
        singleCallback,
        multipleCallback,
        rootArray,
        rootScalar,
    ];
});

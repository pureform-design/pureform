import { expectTypeOf, it } from "vitest";

import type { SelectProps } from ".";

it("keeps ready-made and composed values, defaults and callbacks mode-dependent", () => {
    const single = {
        items: [],
        value: "s",
        defaultValue: null,
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<string | null>(),
    } satisfies SelectProps;
    const _multiple = {
        items: [],
        multiple: true,
        value: ["s"] as readonly string[],
        defaultValue: ["m"] as readonly string[],
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<readonly string[]>(),
    } satisfies SelectProps;
    expectTypeOf({
        ...single,
        multiple: false as const,
    }).toExtend<SelectProps>();

    // @ts-expect-error an array value requires multiple
    const arrayValue: SelectProps = { items: [], value: ["s"] };
    // @ts-expect-error an array default requires multiple
    const arrayDefault: SelectProps = {
        items: [],
        multiple: false,
        defaultValue: ["s"],
    };
    // @ts-expect-error multiple requires an array value
    const scalarValue: SelectProps = { items: [], multiple: true, value: "s" };
    // @ts-expect-error multiple requires an array default
    const scalarDefault: SelectProps = {
        items: [],
        multiple: true,
        defaultValue: "s",
    };
    // @ts-expect-error multiple requires an array value, not null
    const nullValue: SelectProps = { items: [], multiple: true, value: null };
    // @ts-expect-error single callbacks receive a string or null
    const singleCallback: SelectProps = {
        items: [],
        onValueChange: ({ value }: { value: readonly string[] }) => value,
    };
    // @ts-expect-error multiple callbacks receive arrays
    const multipleCallback: SelectProps = {
        items: [],
        multiple: true,
        onValueChange: ({ value }: { value: string | null }) => value,
    };
    void [
        arrayValue,
        arrayDefault,
        scalarValue,
        scalarDefault,
        nullValue,
        singleCallback,
        multipleCallback,
    ];
});

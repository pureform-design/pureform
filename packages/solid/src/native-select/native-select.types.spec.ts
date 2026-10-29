import { expectTypeOf, it } from "vitest";

import type { NativeSelectProps, NativeSelectRootProps } from ".";

it("keeps ready-made and composed values, defaults and callbacks mode-dependent", () => {
    const single = {
        value: "s",
        defaultValue: "m",
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<string>(),
    } satisfies NativeSelectProps;
    const multiple = {
        multiple: true,
        value: ["s"] as readonly string[],
        defaultValue: ["m"] as readonly string[],
        onValueChange: ({ value }) =>
            expectTypeOf(value).toEqualTypeOf<readonly string[]>(),
    } satisfies NativeSelectProps;
    expectTypeOf(single).toExtend<NativeSelectRootProps>();
    expectTypeOf(multiple).toExtend<NativeSelectRootProps>();
    expectTypeOf({
        ...single,
        multiple: false as const,
    }).toExtend<NativeSelectProps>();

    // @ts-expect-error an array value requires multiple
    const arrayValue: NativeSelectProps = { value: ["s"] };
    // @ts-expect-error an array default requires multiple
    const arrayDefault: NativeSelectProps = {
        multiple: false,
        defaultValue: ["s"],
    };
    // @ts-expect-error multiple requires an array value
    const scalarValue: NativeSelectProps = { multiple: true, value: "s" };
    // @ts-expect-error multiple requires an array default
    const scalarDefault: NativeSelectProps = {
        multiple: true,
        defaultValue: "s",
    };
    // @ts-expect-error single callbacks receive strings
    const arrayCallback: NativeSelectProps = {
        onValueChange: (details: { value: readonly string[] }) => void details,
    };
    // @ts-expect-error multiple callbacks receive arrays
    const scalarCallback: NativeSelectProps = {
        multiple: true,
        onValueChange: (details: { value: string }) => void details,
    };
    // @ts-expect-error composed single mode also rejects arrays
    const rootSingle: NativeSelectRootProps = { value: ["s"] };
    // @ts-expect-error composed multiple mode also rejects scalars
    const rootMultiple: NativeSelectRootProps = {
        multiple: true,
        defaultValue: "s",
    };
    void [
        arrayValue,
        arrayDefault,
        scalarValue,
        scalarDefault,
        arrayCallback,
        scalarCallback,
        rootSingle,
        rootMultiple,
    ];
});

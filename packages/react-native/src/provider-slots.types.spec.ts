import { expectTypeOf, it } from "vitest";

import type { NativeProviderSlotProps, PureformProviderProps } from ".";

it("types provider style slots by their Native host", () => {
    const slots = {
        button: {
            root: {
                onPress: () => {},
                style: [{ margin: 4 }, { opacity: 0.5 }],
            },
            label: { numberOfLines: 1, style: { fontWeight: "600" } },
        },
        textField: {
            input: {
                maxLength: 4,
                placeholder: "Name",
                style: { fontSize: 16 },
            },
        },
        // An overlay's surface is `content`, as an instance's key is; the backdrop is its own.
        dialog: {
            content: { accessibilityLabel: "Dialog", style: { padding: 8 } },
            backdrop: { style: { opacity: 0.5 } },
        },
        bottomSheet: { body: { style: { padding: 4 } } },
        datePicker: { cell: { style: { margin: 2 } } },
        media: { root: { resizeMode: "contain" } },
    } satisfies NativeProviderSlotProps;
    expectTypeOf({ slotProps: slots }).toExtend<PureformProviderProps>();
    const inputOnLabel: NativeProviderSlotProps = {
        // @ts-expect-error the label is Text, not TextInput
        button: { label: { maxLength: 4 } },
    };
    const imageOnInput: NativeProviderSlotProps = {
        // @ts-expect-error the input is TextInput, not Image
        textField: { input: { resizeMode: "contain" } },
    };
    const cssStyle: NativeProviderSlotProps = {
        // @ts-expect-error Native style values retain their host's types
        button: { root: { style: { position: "floating" } } },
    };
    const slotKey: NativeProviderSlotProps = {
        // @ts-expect-error `root` was the preset's slot for the surface; the part is `content`, and
        // Native has no wrapper to address as `root`
        dialog: { root: { style: { padding: 4 } } },
    };
    void [inputOnLabel, imageOnInput, cssStyle, slotKey];
});

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
        dialog: {
            root: { accessibilityLabel: "Dialog", style: { padding: 8 } },
        },
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
    const anatomyKey: NativeProviderSlotProps = {
        // @ts-expect-error dialog's surface is the root style slot, not the content anatomy part
        dialog: { content: { style: { padding: 4 } } },
    };
    void [inputOnLabel, imageOnInput, cssStyle, anatomyKey];
});

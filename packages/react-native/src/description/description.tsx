// The plain Description: the supporting text under a Field's control.

import { descriptionAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { descriptionSelection } from "@pureform/binding-core";
import type { DescriptionPart } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useField, useFieldPiece } from "../field/context";
import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface DescriptionHosts {
    readonly root: "Text";
}

export interface DescriptionProps extends NativeSlotProps<DescriptionHosts> {
    readonly children?: ReactNode;
    readonly tokens?: Parameters<typeof descriptionSelection>[0]["tokens"];
    readonly testId?: TestIdOverride<DescriptionPart> | undefined;
}

function DescriptionImpl(props: DescriptionProps): ReactNode {
    const slot = nativeSlots(props);
    const field = useField();
    useFieldPiece(field, "description");
    const { styles: s, views: v } = useComponentSlots<"root">(
        "description",
        descriptionSelection(props),
    );
    return (
        <v.root.Text
            {...slot.props("root")}
            nativeID={field?.state.ids.description}
            style={slot.style("root", s.root)}
            testID={testIdOf(descriptionAnatomy, "root", props.testId)}
        >
            {props.children}
        </v.root.Text>
    );
}

/** The supporting text under the field's control. */
export const Description = withEngine(DescriptionImpl, "Description");

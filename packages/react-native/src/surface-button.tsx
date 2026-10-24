// A button part drawn on a component's own slot, with no machine of its own: the snackbar's and
// the toast's action and close buttons. It ripples and shows focus from the anatomy's indication
// entry for the part, and its slot's icon style reaches its content.

import type {
    ComponentAnatomy,
    IndicationAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import type { Indication } from "@pureform/binding-core/indication";
import type { ReactNode } from "react";

import { IconSlot, iconSlot } from "./icon-style";
import { useSurfaceIndication } from "./indication";
import { testIdOf } from "./parts";
import { nativeSlots, withUnselectable } from "./slot-props";
import type { NativeSlots } from "./slot-props";
import { useComponentSlots } from "./styles";

/** What `SurfaceButton` takes. */
export interface SurfaceButtonProps<A extends ComponentAnatomy> {
    readonly anatomy: A;
    /** The registry's name for the component's styles. */
    readonly component: string;
    readonly part: PartName<A>;
    /** The component's registry selection. */
    readonly selection: Record<string, unknown>;
    readonly indication: Indication | undefined;
    readonly testId: TestIdOverride<PartName<A>> | undefined;
    /** The owner's per-part props, when it customizes this part. */
    readonly slot?: NativeSlots | undefined;
    /** Its name for assistive technology. */
    readonly label: string | undefined;
    readonly onPress: (() => void) | undefined;
    readonly children: ReactNode;
}

/** A button part on the component's slot, with its indication. Wrap it in `withEngine`. */
export function SurfaceButton<A extends ComponentAnatomy>(
    props: SurfaceButtonProps<A>,
): ReactNode {
    const slot = props.slot ?? nativeSlots(undefined);
    const indication = useSurfaceIndication(
        props.anatomy.indication!.findLast(
            (entry: IndicationAnatomy) => entry.trigger === props.part,
        )!,
        { indication: props.indication },
    );
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<PartName<A>>(
        props.component,
        indication.select(props.selection),
        indication.states(),
    );
    const Surface = v[props.part];
    return (
        <Surface.Pressable
            {...slot.props(props.part)}
            {...slot.with(props.part, indication.handlers)}
            role="button"
            {...(props.label === undefined
                ? {}
                : { "aria-label": props.label })}
            onPress={slot.on(props.part, "onPress", props.onPress)}
            style={slot.style(props.part, withUnselectable(s[props.part]))}
            testID={testIdOf(props.anatomy, props.part, props.testId)}
        >
            <IconSlot
                {...iconSlot(selected, props.part)}
                motion={s[props.part]}
            >
                {props.children}
            </IconSlot>
            {indication.layer(selected)}
        </Surface.Pressable>
    );
}

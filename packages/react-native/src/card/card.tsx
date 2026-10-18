// The card: a surface for its content. With `onPress`, the whole card acts: it's interactive,
// lifts on hover, ripples when pressed, and renders its touch target.

import { cardAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { cardSelection } from "@pureform/binding-core";
import type {
    CardPart,
    CardVariantProps,
    InteractiveProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = cardAnatomy.indication!;

export interface CardProps extends CardVariantProps, InteractiveProps {
    readonly children?: ReactNode;
    /** Makes the whole card act. */
    readonly onPress?: (() => void) | undefined;
    readonly disabled?: boolean | undefined;
    readonly testId?: TestIdOverride<CardPart> | undefined;
}

function CardImpl(props: CardProps): ReactNode {
    const acts = props.onPress !== undefined;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: props.interactionSource,
        disabled: props.disabled,
        interactive: acts,
    });
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<CardPart>(
        "card",
        indication.select(cardSelection(props, acts ? "button" : "div")),
        acts ? indication.states(props.disabled ? { disabled: true } : {}) : {},
    );
    const id = (part: CardPart) => testIdOf(cardAnatomy, part, props.testId);
    if (!acts) {
        return (
            <v.root.View style={s.root} testID={id("root")}>
                {props.children}
            </v.root.View>
        );
    }
    return (
        <v.root.Pressable
            {...indication.handlers}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <v.touchTarget.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {props.children}
            {indication.layer(selected)}
        </v.root.Pressable>
    );
}

/** Material's card: `<Card variant="filled">…</Card>`. */
export const Card = withEngine(CardImpl, "Card");

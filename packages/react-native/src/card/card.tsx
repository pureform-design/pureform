// The card: a surface for its content. With `onPress`, the whole card acts: it's interactive,
// lifts on hover, and renders its touch target.

import { cardAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { cardSelection } from "@pureform/binding-core";
import type { CardPart, CardVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, unselectable, usePress, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface CardProps extends CardVariantProps {
    readonly children?: ReactNode;
    /** Makes the whole card act. */
    readonly onPress?: (() => void) | undefined;
    readonly disabled?: boolean | undefined;
    readonly testId?: TestIdOverride<CardPart> | undefined;
}

function CardImpl(props: CardProps): ReactNode {
    const engine = useEngine();
    const acts = props.onPress !== undefined;
    const { state, handlers } = usePress(
        props.disabled ? { disabled: true } : {},
    );
    const { styles: s } = useComponentSlots(
        "card",
        cardSelection(props, acts ? "button" : "div"),
        acts ? state : {},
    );
    const id = (part: CardPart) => testIdOf(cardAnatomy, part, props.testId);
    if (!acts) {
        return (
            <engine.View style={s.root} testID={id("root")}>
                {props.children}
            </engine.View>
        );
    }
    return (
        <engine.Pressable
            {...handlers}
            role="button"
            disabled={props.disabled}
            onPress={props.onPress}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            <engine.View
                pointerEvents="none"
                style={s.touchTarget}
                testID={id("touchTarget")}
            />
            {props.children}
        </engine.Pressable>
    );
}

/** Material's card: `<Card variant="filled">…</Card>`. */
export const Card = withEngine(CardImpl, "Card");

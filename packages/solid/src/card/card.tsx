// The card: Root, a surface that's a `<div>`, or, when the whole card acts, a link (`href`) or a
// button (`as="button"`), with its TouchTarget, and the ready-made Card over them. It has no
// machine: an interactive card takes the state layer and lifts on hover through the preset.

import { cardAnatomy } from "@pureform/anatomy";
import {
    CARD_ROOT_PROPS,
    cardElement,
    cardRootProps,
    cardSelection,
    isInteractiveCard,
} from "@pureform/binding-core";
import type { CardRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, omit, Show } from "solid-js";

import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof cardAnatomy;

/** What Root shares with its parts. */
interface CardContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<CardContextValue>("Card");

/** Root's props: the variants and tokens, `disabled`, `testId` and `unstyled` for every part,
 *  `href` (a link) or `as`, and the element's own props. */
export interface CardRootProps
    extends Omit<PartProps, keyof CardRootOwnProps>, CardRootOwnProps {
    /** Where the card leads: Root renders a link (`<a>`). */
    readonly href?: string | undefined;
    /** Another element or component to render instead of `<div>`: `"button"` for a card that
     *  acts, `"article"`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CardPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The card's root: the surface. A link or a button is interactive. */
function Root(props: CardRootProps): JSX.Element {
    const element = createMemo(() =>
        cardElement<ValidComponent>({ href: props.href, as: props.as }),
    );
    const interactive = () => isInteractiveCard(props, element());
    const source = useOwnInteractionSource(() => props.interactionSource);
    const handlers = useInteractionHandlers(
        source,
        () => !interactive() || !!props.disabled,
    );
    const scope = useComponent(cardAnatomy, {
        selection: () => cardSelection(props, element()),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
        interactive,
    });
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => (element() === "div" ? undefined : element()),
                machine: () =>
                    interactive()
                        ? combinePartProps([
                              cardRootProps(props, element()),
                              handlers(),
                          ])
                        : cardRootProps(props, element()),
                props: omit(props, "as", ...CARD_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The touch target an interactive card renders first, so even a small card meets the minimum
 *  hit area. Empty. */
function TouchTarget(props: CardPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made card's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its content as children. */
export interface CardProps
    extends
        Omit<CardRootProps, keyof SlotKeyedProps<Anatomy>>,
        SlotKeyedProps<Anatomy> {}

/** The ready-made card: Root, its touch target while interactive, then the children. */
function ReadyMade(props: CardProps): JSX.Element {
    const interactive = () =>
        isInteractiveCard(
            props,
            cardElement<ValidComponent>({ href: props.href, as: props.as }),
        );
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
        "children",
    ) as CardRootProps;
    const root = slots("root") as object;
    const touchTarget = slots("touchTarget");
    return (
        <Root {...own} {...root}>
            <Show when={interactive()}>
                <TouchTarget {...touchTarget} />
            </Show>
            {props.children}
        </Root>
    );
}

/** Material's card. Use it ready-made, `<Card variant="outlined">…</Card>`, or with `href` or
 *  `as="button"` when the whole card acts; or compose `Card.Root` around `Card.TouchTarget` and
 *  the content. */
export const Card = Object.assign(ReadyMade, { Root, TouchTarget });

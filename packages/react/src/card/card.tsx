// The card: Root, a surface that's a `<div>`, or, when the whole card acts, a link (`href`) or a
// button (`as="button"`), with its TouchTarget; Material's sections (Media, Header with Avatar,
// HeaderText, Headline, Subhead, and HeaderAction, Content with SupportingText, Actions, Footer);
// and ActionArea, the card's own action beside other controls. The ready-made Card lays them out.
// It has no machine: an interactive card, or a card's action area, takes the state layer and lifts
// on hover through the preset.

import { cardAnatomy } from "@pureform/anatomy";
import {
    CARD_CONTENT_PROPS,
    CARD_ROOT_PROPS,
    cardElement,
    cardEntryActive,
    cardLayout,
    cardRootProps,
    cardSelection,
    isInteractiveCard,
    isPresent,
} from "@pureform/binding-core";
import type {
    CardContentProps,
    CardRootOwnProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { ElementType, ReactNode } from "react";

import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps, plainParts } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof cardAnatomy;

/** What Root shares with its parts. */
interface CardContextValue {
    readonly scope: ComponentScope<Anatomy>;
    /** The card's source, which the action area emits to. */
    readonly source: MutableInteractionSource | undefined;
    /** Root's `disabled`, the action area's default. */
    readonly disabled: boolean;
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
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CardPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The action area's props: a link with `href`, else a `<button>` (or `as`), and `disabled`,
 *  which follows Root's unless given. */
export interface CardActionAreaProps extends CardPartProps {
    readonly href?: string | undefined;
    readonly as?: ElementType | undefined;
    readonly disabled?: boolean | undefined;
}

/** The card's root: the surface. A link or a button is interactive. */
function Root(props: CardRootProps): ReactNode {
    const element = cardElement<ElementType>({
        href: props.href,
        as: props.as,
    });
    const interactive = isInteractiveCard(props, element);
    const source = useOwnInteractionSource(props.interactionSource);
    const handlers = useInteractionHandlers(
        source,
        !interactive || !!props.disabled,
    );
    const scope = useComponent(cardAnatomy, {
        selection: cardSelection(props, element),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
        // Root's own entry while it acts, its action area's otherwise.
        entryActive: cardEntryActive(interactive),
    });
    const { as: _as, ...rest } = omitProps(props, CARD_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, source, disabled: !!props.disabled }}>
            {scope.render("root", {
                element,
                machine: interactive
                    ? combinePartProps([
                          cardRootProps(props, element),
                          handlers,
                      ])
                    : cardRootProps(props, element),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The touch target an interactive card renders first, so even a small card meets the minimum
 *  hit area. Empty. */
function TouchTarget({ unstyled, ...props }: CardPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        machine: { "aria-hidden": "true" },
        unstyled,
        props,
    });
}

/** The card's own action when it has other controls: a link (`href`) or a button around the
 *  media, header, and content, its text its accessible name. Keep every other control outside
 *  it, in the actions or the header's action. The whole container shows its hover, press, and
 *  focus, and its ripple, while the controls beside it show only their own. */
function ActionArea({
    unstyled,
    as,
    disabled: own,
    ...props
}: CardActionAreaProps): ReactNode {
    const card = context.use("ActionArea");
    const element: ElementType =
        props.href !== undefined ? "a" : (as ?? "button");
    const disabled = own ?? card.disabled;
    const handlers = useInteractionHandlers(card.source, disabled);
    return card.scope.render("actionArea", {
        element,
        machine: combinePartProps([
            cardRootProps({ disabled }, element),
            handlers,
        ]),
        unstyled,
        props,
    });
}

const part = plainParts(context.use, "div");

/** A picture or video at the card's top, full bleed: an `<img>`, a `<video>`, or a `Media`
 *  inside. */
const Media = part("media", "Media");
/** The header's row: the avatar, the text, and an action. */
const Header = part("header", "Header");
/** An avatar or icon before the headline. */
const Avatar = part("avatar", "Avatar");
/** The headline and subhead. */
const HeaderText = part("headerText", "HeaderText");
/** The card's title. */
const Headline = part("headline", "Headline");
/** A line under the headline. */
const Subhead = part("subhead", "Subhead");
/** A control at the header's end, such as an overflow menu's icon button. Outside the action
 *  area: a card whose header holds one keeps the header out of it. */
const HeaderAction = part("headerAction", "HeaderAction");
/** The card's body, padded: the supporting text, and anything else. */
const Content = part("content", "Content");
/** Material's supporting text. */
const SupportingText = part("supportingText", "SupportingText");
/** A row of buttons, at its end unless Root's `actionsAlign` is `"start"`. */
const Actions = part("actions", "Actions");
/** A last section, under the actions. */
const Footer = part("footer", "Footer");

/** The ready-made card's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, its sections' content, and the rest of its content as children. */
export interface CardProps
    extends
        Omit<CardRootProps, keyof SlotKeyedProps<Anatomy>>,
        SlotKeyedProps<Anatomy>,
        CardContentProps<ReactNode> {}

const READY_MADE_PROPS = [
    "className",
    "style",
    "slotProps",
    "children",
    ...CARD_CONTENT_PROPS,
] as const;

/** The ready-made card: Root around its content. Given any section (`headline`, `media`, …), it
 *  lays them out as Material does, and Root's padding gives way to theirs unless `padded` is
 *  given. A card that acts (`href`, `as="button"`) is one link or button, its text its name;
 *  with `actions` or a `headerAction` too, its action moves to an action area around the media,
 *  header, and content, so each control stays its own. Root's element props then go on the
 *  action area, and `slotProps.root` styles the container. */
function ReadyMade(props: CardProps): ReactNode {
    const slot = useSlotProps(props);
    const own = omitProps(props, READY_MADE_PROPS) as CardRootProps;
    const element = cardElement<ElementType>({
        href: props.href,
        as: props.as,
    });
    const layout = cardLayout(props, element);
    const padded = props.padded ?? (layout.sections ? false : undefined);
    const header = layout.header ? (
        <Header {...slot("header")}>
            {isPresent(props.avatar) ? (
                <Avatar {...slot("avatar")}>{props.avatar}</Avatar>
            ) : null}
            <HeaderText {...slot("headerText")}>
                {isPresent(props.headline) ? (
                    <Headline {...slot("headline")}>{props.headline}</Headline>
                ) : null}
                {isPresent(props.subhead) ? (
                    <Subhead {...slot("subhead")}>{props.subhead}</Subhead>
                ) : null}
            </HeaderText>
            {isPresent(props.headerAction) ? (
                <HeaderAction {...slot("headerAction")}>
                    {props.headerAction}
                </HeaderAction>
            ) : null}
        </Header>
    ) : null;
    // The media, the header unless it stays out of the action area, and the content.
    const body = (
        <>
            {isPresent(props.media) ? (
                <Media {...slot("media")}>{props.media}</Media>
            ) : null}
            {layout.headerOutside ? null : header}
            {!layout.sections ? (
                props.children
            ) : layout.supportingText || isPresent(props.children) ? (
                <Content {...slot("content")}>
                    {layout.supportingText ? (
                        <SupportingText {...slot("supportingText")}>
                            {props.supportingText}
                        </SupportingText>
                    ) : null}
                    {props.children}
                </Content>
            ) : null}
        </>
    );
    const rest = (
        <>
            {isPresent(props.actions) ? (
                <Actions {...slot("actions")}>{props.actions}</Actions>
            ) : null}
            {isPresent(props.footer) ? (
                <Footer {...slot("footer")}>{props.footer}</Footer>
            ) : null}
        </>
    );
    if (!layout.actionArea) {
        return (
            <Root {...own} padded={padded} {...(slot("root") as object)}>
                {isInteractiveCard(props, element) ? (
                    <TouchTarget {...slot("touchTarget")} />
                ) : null}
                {body}
                {rest}
            </Root>
        );
    }
    const rootOwn: Record<string, unknown> = {};
    for (const key of CARD_ROOT_PROPS) {
        if (key !== "disabled" && key !== "interactive") {
            rootOwn[key] = props[key];
        }
    }
    const actionArea = omitProps(own, CARD_ROOT_PROPS);
    return (
        <Root
            {...(rootOwn as CardRootProps)}
            interactive={false}
            padded={padded}
            {...(slot("root") as object)}
        >
            {layout.headerOutside ? header : null}
            <ActionArea
                {...(actionArea as CardActionAreaProps)}
                disabled={props.disabled}
                {...slot("actionArea")}
            >
                {body}
            </ActionArea>
            {rest}
        </Root>
    );
}

/** Material's card. Use it ready-made, `<Card variant="outlined">…</Card>`, with `href` or
 *  `as="button"` when the whole card acts, and with Material's sections (`media`, `headline`,
 *  `subhead`, `avatar`, `headerAction`, `supportingText`, `actions`, `footer`); or compose
 *  `Card.Root` around `Card.TouchTarget` and the content, or around `Card.ActionArea` and the
 *  sections (`padded={false}`). */
export const Card = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    ActionArea,
    Media,
    Header,
    Avatar,
    HeaderText,
    Headline,
    Subhead,
    HeaderAction,
    Content,
    SupportingText,
    Actions,
    Footer,
});

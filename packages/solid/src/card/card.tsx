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
    CardPart,
    CardRootOwnProps,
} from "@pureform/binding-core";
import type { MutableInteractionSource } from "@pureform/binding-core/interaction";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, createMemo, omit, Show } from "solid-js";

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
    /** The card's source, which the action area emits to. */
    readonly source: Accessor<MutableInteractionSource | undefined>;
    /** Root's `disabled`, the action area's default. */
    readonly disabled: Accessor<boolean>;
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

/** The action area's props: a link with `href`, else a `<button>` (or `as`), and `disabled`,
 *  which follows Root's unless given. */
export interface CardActionAreaProps extends CardPartProps {
    readonly href?: string | undefined;
    readonly as?: ValidComponent | undefined;
    readonly disabled?: boolean | undefined;
}

/** The card's root: the surface. A link or a button is interactive. */
function Root(props: CardRootProps): JSX.Element {
    const element = createMemo(() =>
        cardElement<ValidComponent>({ href: props.href, as: props.as }),
    );
    const interactive = createMemo(() => isInteractiveCard(props, element()));
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
        // Root's own entry while it acts, its action area's otherwise.
        entryActive: (entry) => cardEntryActive(interactive())(entry),
    });
    return (
        <context.Provider
            value={{ scope, source, disabled: () => !!props.disabled }}
        >
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

/** The card's own action when it has other controls: a link (`href`) or a button around the
 *  media, header, and content, its text its accessible name. Keep every other control outside
 *  it, in the actions or the header's action. The whole container shows its hover, press, and
 *  focus, and its ripple, while the controls beside it show only their own. */
function ActionArea(props: CardActionAreaProps): JSX.Element {
    const card = context.use("ActionArea");
    const element = createMemo(
        () =>
            (props.href !== undefined
                ? "a"
                : (props.as ?? "button")) as ValidComponent,
    );
    const disabled = () => props.disabled ?? card.disabled();
    const handlers = useInteractionHandlers(card.source, disabled);
    return card.scope.render("actionArea", {
        element: "button",
        as: () => (element() === "button" ? undefined : element()),
        machine: () =>
            combinePartProps([
                cardRootProps({ disabled: disabled() }, element()),
                handlers(),
            ]),
        unstyled: () => props.unstyled,
        props: omit(props, "as", "unstyled", "disabled"),
    });
}

const part = (name: CardPart, label: string) =>
    function CardPartElement(props: CardPartProps): JSX.Element {
        const { scope } = context.use(label);
        return scope.render(name, {
            element: "div",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

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

/** The ready-made card's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  its sections' content, and the rest of its content as children. */
export interface CardProps
    extends
        Omit<CardRootProps, keyof SlotKeyedProps<Anatomy>>,
        SlotKeyedProps<Anatomy>,
        CardContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "children",
    ...CARD_CONTENT_PROPS,
] as const;

// Root's own props, from the ready-made's, for a card whose action is on its action area.
const rootOwnProps = (props: CardProps): CardRootProps => {
    const own: Record<string, unknown> = {};
    for (const key of CARD_ROOT_PROPS) {
        if (key === "disabled" || key === "interactive") continue;
        Object.defineProperty(own, key, {
            enumerable: true,
            get: () => props[key],
        });
    }
    return own as CardRootProps;
};

/** The ready-made card: Root around its content. Given any section (`headline`, `media`, …), it
 *  lays them out as Material does, and Root's padding gives way to theirs unless `padded` is
 *  given. A card that acts (`href`, `as="button"`) is one link or button, its text its name;
 *  with `actions` or a `headerAction` too, its action moves to an action area around the media,
 *  header, and content, so each control stays its own. Root's element props then go on the
 *  action area, and `slotProps.root` styles the container. */
function ReadyMade(props: CardProps): JSX.Element {
    const element = createMemo(() =>
        cardElement<ValidComponent>({ href: props.href, as: props.as }),
    );
    // Each piece of content built once: read to lay the card out, then rendered.
    const media = createMemo(() => props.media);
    const avatar = createMemo(() => props.avatar);
    const headline = createMemo(() => props.headline);
    const subhead = createMemo(() => props.subhead);
    const headerAction = createMemo(() => props.headerAction);
    const supportingText = createMemo(() => props.supportingText);
    const actions = createMemo(() => props.actions);
    const footer = createMemo(() => props.footer);
    const children = createMemo(() => props.children);
    const layout = createMemo(() =>
        cardLayout(
            {
                media: media(),
                avatar: avatar(),
                headline: headline(),
                subhead: subhead(),
                headerAction: headerAction(),
                supportingText: supportingText(),
                actions: actions(),
                footer: footer(),
                interactive: props.interactive,
            },
            element(),
        ),
    );
    const interactive = () =>
        !layout().actionArea && isInteractiveCard(props, element());
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as CardRootProps;
    const root = slots("root") as object;
    const padded = () =>
        props.padded ?? (layout().sections ? false : undefined);

    const header = (withAction: boolean) => (
        <Show when={layout().header}>
            <Header {...slots("header")}>
                <Show when={isPresent(avatar())}>
                    <Avatar {...slots("avatar")}>{avatar()}</Avatar>
                </Show>
                <HeaderText {...slots("headerText")}>
                    <Show when={isPresent(headline())}>
                        <Headline {...slots("headline")}>{headline()}</Headline>
                    </Show>
                    <Show when={isPresent(subhead())}>
                        <Subhead {...slots("subhead")}>{subhead()}</Subhead>
                    </Show>
                </HeaderText>
                <Show when={withAction && isPresent(headerAction())}>
                    <HeaderAction {...slots("headerAction")}>
                        {headerAction()}
                    </HeaderAction>
                </Show>
            </Header>
        </Show>
    );
    // The media, the header unless it stays out of the action area, and the content.
    const body = () => (
        <>
            <Show when={isPresent(media())}>
                <Media {...slots("media")}>{media()}</Media>
            </Show>
            <Show when={!layout().headerOutside}>{header(true)}</Show>
            <Show when={layout().sections} fallback={children()}>
                <Show when={layout().supportingText || isPresent(children())}>
                    <Content {...slots("content")}>
                        <Show when={layout().supportingText}>
                            <SupportingText {...slots("supportingText")}>
                                {supportingText()}
                            </SupportingText>
                        </Show>
                        {children()}
                    </Content>
                </Show>
            </Show>
        </>
    );
    const rest = () => (
        <>
            <Show when={isPresent(actions())}>
                <Actions {...slots("actions")}>{actions()}</Actions>
            </Show>
            <Show when={isPresent(footer())}>
                <Footer {...slots("footer")}>{footer()}</Footer>
            </Show>
        </>
    );
    return (
        <Show
            when={layout().actionArea}
            fallback={
                <Root {...own} padded={padded()} {...root}>
                    <Show when={interactive()}>
                        <TouchTarget {...slots("touchTarget")} />
                    </Show>
                    {body()}
                    {rest()}
                </Root>
            }
        >
            <Root
                {...rootOwnProps(props)}
                interactive={false}
                padded={padded()}
                {...root}
            >
                <Show when={layout().headerOutside}>{header(true)}</Show>
                <ActionArea
                    {...omit(own, "interactive", ...CARD_ROOT_PROPS)}
                    disabled={props.disabled}
                    {...slots("actionArea")}
                >
                    {body()}
                </ActionArea>
                {rest()}
            </Root>
        </Show>
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

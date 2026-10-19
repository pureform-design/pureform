// The list item: Root, a row that's a `<div>`, a link (`href`), or a button (`as="button"`), with
// its leading part, text (overline, headline, supporting text), and trailing parts as the preset
// draws them; and the ready-made ListItem over them. It has no machine: the app marks it selected
// or disabled. Inside a List, it takes the list's variants as its defaults.

import { listItemAnatomy } from "@pureform/anatomy";
import {
    isInteractiveListItem,
    isPresent,
    LIST_ITEM_ROOT_PROPS,
    listItemElement,
    listItemLines,
    listItemRootProps,
    listItemSelection,
    listItemVariants,
} from "@pureform/binding-core";
import type {
    ListItemContentProps,
    ListItemRootOwnProps,
    ListVariantProps,
} from "@pureform/binding-core";
import { createContext, type ElementType, type ReactNode, use } from "react";

import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof listItemAnatomy;

/** What Root shares with its parts. */
interface ListItemContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<ListItemContextValue>("ListItem");

/** The variants of the list around a list item: its defaults. Internal to the list. */
export const ListDefaults = createContext<ListVariantProps | null>(null);

/** Root's props: the variants and tokens, `selected` and `disabled`, `testId` and `unstyled` for
 *  every part, `href` (a link) or `as`, and the element's own props. */
export interface ListItemRootProps
    extends Omit<PartProps, keyof ListItemRootOwnProps>, ListItemRootOwnProps {
    /** Where the item leads: Root renders a link (`<a>`). */
    readonly href?: string | undefined;
    /** Another element or component to render instead of `<div>`: `"button"` for an item that
     *  acts. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface ListItemPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A leading or trailing part's props: a part's, and `mirror` to flip an icon under `rtl`. */
export interface ListItemIconProps extends ListItemPartProps {
    readonly mirror?: boolean | undefined;
}

/** The list item's root: the row. A link or a button is interactive: it takes the state layer and
 *  the focus ring. */
function Root(props: ListItemRootProps): ReactNode {
    const list = use(ListDefaults);
    const element = listItemElement<ElementType>({
        href: props.href,
        as: props.as,
    });
    const interactive = isInteractiveListItem(
        listItemVariants(list, props),
        element,
    );
    const source = useOwnInteractionSource(props.interactionSource);
    const handlers = useInteractionHandlers(
        source,
        !interactive || !!props.disabled,
    );
    const scope = useComponent(listItemAnatomy, {
        selection: listItemSelection(listItemVariants(list, props), element),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
        interactive,
    });
    const { as: _as, ...rest } = omitProps(props, LIST_ITEM_ROOT_PROPS);
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element,
                machine: interactive
                    ? combinePartProps([
                          listItemRootProps(props, element),
                          handlers,
                      ])
                    : listItemRootProps(props, element),
                props: rest,
            })}
        </context.Provider>
    );
}

const iconPart = (part: "leading" | "trailing", name: string) =>
    function IconPart({
        unstyled,
        mirror,
        ...props
    }: ListItemIconProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: { "aria-hidden": "true" },
            states: { mirrored: mirror },
            unstyled,
            props,
        });
    };

const textPart = (
    part:
        | "content"
        | "overline"
        | "headline"
        | "supportingText"
        | "trailingText",
    name: string,
    element: "div" | "span",
) =>
    function TextPart({ unstyled, ...props }: ListItemPartProps): ReactNode {
        const { scope } = context.use(name);
        return scope.render(part, { element, unstyled, props });
    };

/** An icon, avatar, or image before the text, hidden from assistive technology (give it
 *  `aria-hidden={false}` when it says something). */
const Leading = iconPart("leading", "Leading");
/** The text: the overline, headline, and supporting text. */
const Content = textPart("content", "Content", "div");
/** A line above the headline. */
const Overline = textPart("overline", "Overline", "span");
/** The item's main text. */
const Headline = textPart("headline", "Headline", "span");
/** Text under the headline. */
const SupportingText = textPart("supportingText", "SupportingText", "span");
/** An icon after the text, hidden from assistive technology. */
const Trailing = iconPart("trailing", "Trailing");
/** Text after the text, such as a count. */
const TrailingText = textPart("trailingText", "TrailingText", "span");

/** The ready-made list item's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and its content. `lines` follows the content unless given. */
export interface ListItemProps
    extends
        Omit<ListItemRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ListItemContentProps<ReactNode> {}

/** The ready-made list item: every part in the preset's structure that has content. */
function ReadyMade(props: ListItemProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        headline,
        overline,
        supportingText,
        leading,
        trailing,
        trailingText,
        mirrorLeading,
        mirrorTrailing,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root
            {...rootProps}
            lines={props.lines ?? listItemLines(props)}
            {...(slot("root") as object)}
        >
            {isPresent(leading) ? (
                <Leading mirror={mirrorLeading} {...slot("leading")}>
                    {leading}
                </Leading>
            ) : null}
            <Content {...slot("content")}>
                {isPresent(overline) ? (
                    <Overline {...slot("overline")}>{overline}</Overline>
                ) : null}
                <Headline {...slot("headline")}>{headline}</Headline>
                {isPresent(supportingText) ? (
                    <SupportingText {...slot("supportingText")}>
                        {supportingText}
                    </SupportingText>
                ) : null}
            </Content>
            {isPresent(trailing) ? (
                <Trailing mirror={mirrorTrailing} {...slot("trailing")}>
                    {trailing}
                </Trailing>
            ) : null}
            {isPresent(trailingText) ? (
                <TrailingText {...slot("trailingText")}>
                    {trailingText}
                </TrailingText>
            ) : null}
        </Root>
    );
}

/** Material's list item. Use it ready-made, `<ListItem headline="Inbox" supportingText="3 new"
 *  href="/inbox" />`, or compose its parts under `ListItem.Root`: `Leading`, `Content` holding
 *  `Overline`, `Headline`, and `SupportingText`, then `Trailing` and `TrailingText`. Put it in a
 *  `List`, or give it the element a list item needs (`as="li"`). */
export const ListItem = Object.assign(ReadyMade, {
    Root,
    Leading,
    Content,
    Overline,
    Headline,
    SupportingText,
    Trailing,
    TrailingText,
});

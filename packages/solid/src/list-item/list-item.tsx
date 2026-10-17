// The list item: Root, a row that's a `<div>`, a link (`href`), or a button (`as="button"`), with
// its leading part, text (overline, headline, supporting text), and trailing parts as the preset
// draws them; and the ready-made ListItem over them. It has no machine: the app marks it selected
// or disabled. Inside a List, it takes the list's variants as its defaults.

import { listItemAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    LIST_ITEM_CONTENT_PROPS,
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
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    omit,
    Show,
    useContext,
} from "solid-js";

import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof listItemAnatomy;

/** What Root shares with its parts. */
interface ListItemContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<ListItemContextValue>("ListItem");

/** The variants of the list around a list item: its defaults. Internal to the list. */
export const ListDefaults = createContext<Accessor<ListVariantProps> | null>(
    null,
);

/** Root's props: the variants and tokens, `selected` and `disabled`, `testId` and `unstyled` for
 *  every part, `href` (a link) or `as`, and the element's own props. */
export interface ListItemRootProps
    extends Omit<PartProps, keyof ListItemRootOwnProps>, ListItemRootOwnProps {
    /** Where the item leads: Root renders a link (`<a>`). */
    readonly href?: string | undefined;
    /** Another element or component to render instead of `<div>`: `"button"` for an item that
     *  acts. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: ListItemRootProps): JSX.Element {
    const list = useContext(ListDefaults);
    const element = createMemo(() =>
        listItemElement<ValidComponent>({ href: props.href, as: props.as }),
    );
    const scope = useComponent(listItemAnatomy, {
        selection: () =>
            listItemSelection(listItemVariants(list?.(), props), element()),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => (element() === "div" ? undefined : element()),
                machine: () => listItemRootProps(props, element()),
                props: omit(props, "as", ...LIST_ITEM_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const iconPart = (part: "leading" | "trailing", name: string) =>
    function IconPart(props: ListItemIconProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element: "span",
            machine: () => ({ "aria-hidden": "true" }),
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "mirror"),
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
    function TextPart(props: ListItemPartProps): JSX.Element {
        const { scope } = context.use(name);
        return scope.render(part, {
            element,
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
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

/** The ready-made list item's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its content. `lines` follows the content unless given. */
export interface ListItemProps
    extends
        Omit<ListItemRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        ListItemContentProps<JSX.Element> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...LIST_ITEM_CONTENT_PROPS,
] as const;

/** The ready-made list item: every part in the preset's structure that has content. */
function ReadyMade(props: ListItemProps): JSX.Element {
    const slot = (part: Parameters<typeof slotPartProps<Anatomy>>[1]) =>
        slotPartProps(props, part) as object;
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as ListItemRootProps)}
            lines={props.lines ?? listItemLines(props)}
            {...slot("root")}
        >
            <Show when={isPresent(props.leading)}>
                <Leading mirror={props.mirrorLeading} {...slot("leading")}>
                    {props.leading}
                </Leading>
            </Show>
            <Content {...slot("content")}>
                <Show when={isPresent(props.overline)}>
                    <Overline {...slot("overline")}>{props.overline}</Overline>
                </Show>
                <Headline {...slot("headline")}>{props.headline}</Headline>
                <Show when={isPresent(props.supportingText)}>
                    <SupportingText {...slot("supportingText")}>
                        {props.supportingText}
                    </SupportingText>
                </Show>
            </Content>
            <Show when={isPresent(props.trailing)}>
                <Trailing mirror={props.mirrorTrailing} {...slot("trailing")}>
                    {props.trailing}
                </Trailing>
            </Show>
            <Show when={isPresent(props.trailingText)}>
                <TrailingText {...slot("trailingText")}>
                    {props.trailingText}
                </TrailingText>
            </Show>
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

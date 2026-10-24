// The toolbar: Root, a bar (`toolbarAnatomy`) whose arrow keys move focus among its elements;
// and the ready-made Toolbar over it, an icon button or button per element, which with
// `overflow` moves those that don't fit into the menu component behind an overflow button.

import { toolbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    isUnstyled,
    TOOLBAR_CONTENT_PROPS,
    TOOLBAR_OVERFLOW_LABEL,
    TOOLBAR_ROOT_PROPS,
    toolbarMenuItems,
    toolbarMenuPositioning,
    toolbarMenuSelect,
    toolbarOverflowTestId,
    toolbarRootProps,
    toolbarSelection,
    unstyledToolbarProvidedTokens,
} from "@pureform/binding-core";
import type {
    ToolbarContentProps,
    ToolbarItem,
    ToolbarPart,
    ToolbarRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { moveToolbarFocus, watchOverflow } from "@pureform/binding-dom";
import type { JSX, ValidComponent } from "@solidjs/web";
import { createEffect, createSignal, For, merge, omit, Show } from "solid-js";

import { Button } from "../button";
import { MoreIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button";
import { Menu } from "../menu";
import { MENU_TRIGGER_ATTRIBUTES } from "../menu/menu";
import { useComponent } from "../parts";
import type { PartProps } from "../props";
import { ProvidedTokens } from "../provided-tokens";
import { useDirection, usePureform } from "../provider";

/** Root's props: the variants and tokens, `overflow`, `testId`, `as`, and the element's own
 *  props. Name the toolbar with `aria-label` or `aria-labelledby`. */
export interface ToolbarRootProps
    extends Omit<PartProps, keyof ToolbarRootOwnProps>, ToolbarRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** Opts the root out of the registry's styles. An unstyled `vibrant` toolbar still gives its
     *  icon buttons the accent that follows its content color. */
    readonly unstyled?: Unstyled<ToolbarPart> | undefined;
}

const HIDDEN: JSX.CSSProperties = { display: "none" };

/** The toolbar's root, a `<div role="toolbar">`. The arrow keys along its orientation, Home
 *  and End move focus among its elements. */
function Root(props: ToolbarRootProps): JSX.Element {
    const dir = useDirection();
    const state = usePureform();
    const scope = useComponent(toolbarAnatomy, {
        selection: () => toolbarSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const provided = () =>
        isUnstyled(props.unstyled, "root")
            ? unstyledToolbarProvidedTokens(props, state().defaults)
            : undefined;
    return scope.render("root", {
        element: "div",
        as: () => props.as,
        machine: () => ({
            ...toolbarRootProps(props),
            onKeyDown: (event: KeyboardEvent) => {
                const moved = moveToolbarFocus(
                    event.currentTarget as HTMLElement,
                    event.key,
                    props.orientation,
                    dir(),
                );
                if (moved) event.preventDefault();
            },
        }),
        props: merge(omit(props, "as", "unstyled", ...TOOLBAR_ROOT_PROPS), {
            get children() {
                return (
                    <ProvidedTokens tokens={provided()}>
                        {props.children}
                    </ProvidedTokens>
                );
            },
        }),
    });
}

/** The ready-made toolbar's props: Root's and the elements as data. */
export interface ToolbarProps
    extends
        Omit<ToolbarRootProps, "children">,
        ToolbarContentProps<JSX.Element> {}

const READY_MADE_PROPS = [...TOOLBAR_CONTENT_PROPS] as const;

const ITEM = "data-pf-toolbar-item";
const OVERFLOW = "data-pf-toolbar-overflow";

// One element in the row: an icon button named by its label, or a text button.
function Element(props: {
    readonly item: ToolbarItem<JSX.Element>;
    readonly hidden: boolean;
}): JSX.Element {
    const shared = () => ({
        [ITEM]: "",
        disabled: props.item.disabled,
        onClick: props.item.onClick,
        testId: props.item.testId,
        interactionSource: props.item.interactionSource,
        // The ready-made buttons take their style by part.
        style: props.hidden ? { root: HIDDEN } : undefined,
        ...(props.item.selected === undefined
            ? {}
            : {
                  selected: props.item.selected,
                  onSelectedChange: props.item.onSelectedChange,
              }),
    });
    return (
        <Show
            when={isPresent(props.item.icon)}
            fallback={
                <Button
                    {...(shared() as object)}
                    variant="text"
                    label={props.item.label}
                />
            }
        >
            <IconButton
                {...(shared() as object)}
                aria-label={props.item.label}
                icon={props.item.icon}
            />
        </Show>
    );
}

// The overflow button the menu's trigger renders: an icon button keeping its own part.
function OverflowButton(props: IconButtonProps): JSX.Element {
    const own = omit(
        props as IconButtonProps & Record<string, unknown>,
        ...MENU_TRIGGER_ATTRIBUTES,
    );
    return <IconButton {...(own as IconButtonProps)} />;
}

/** The ready-made toolbar: an icon button per element with an icon, a text button per element
 *  without, and with `overflow`, the overflow button opening a menu of those that don't fit. */
function ReadyMade(props: ToolbarProps): JSX.Element {
    const items = () => props.items ?? [];
    const [root, setRoot] = createSignal<HTMLElement | undefined>(undefined, {
        ownedWrite: true,
    });
    // How many elements stay in the row; all of them, with the overflow button, until measured.
    const [count, setCount] = createSignal<number>();
    createEffect(
        () =>
            [
                root(),
                !!props.overflow,
                props.orientation === "vertical",
                items(),
            ] as const,
        ([element, overflow, vertical]) => {
            if (!element || !overflow) return;
            const watcher = watchOverflow({
                root: element,
                elements: () => [
                    ...element.querySelectorAll<HTMLElement>(
                        `:scope > [${ITEM}]`,
                    ),
                ],
                trigger: () =>
                    element.querySelector<HTMLElement>(
                        `:scope > [${OVERFLOW}]`,
                    ),
                vertical: () => vertical,
                onCount: setCount,
            });
            return () => watcher.stop();
        },
    );
    const shown = () => count() ?? items().length;
    const overflowing = () =>
        !!props.overflow && (count() === undefined || shown() < items().length);
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as ToolbarRootProps)}
            ref={setRoot}
        >
            <For each={items()} keyed={(item) => item.value}>
                {(item, index) => (
                    <Element
                        item={item()}
                        hidden={!!props.overflow && index() >= shown()}
                    />
                )}
            </For>
            <Show when={props.overflow}>
                <Menu.Root
                    {...{ [OVERFLOW]: "" }}
                    style={overflowing() ? undefined : HIDDEN}
                    positioning={toolbarMenuPositioning(props.orientation)}
                    onSelect={(details) =>
                        toolbarMenuSelect(items(), details.value)
                    }
                >
                    <Menu.Trigger
                        as={OverflowButton}
                        aria-label={
                            props.overflowLabel ?? TOOLBAR_OVERFLOW_LABEL
                        }
                        icon={
                            isPresent(props.overflowIcon) ? (
                                props.overflowIcon
                            ) : (
                                <MoreIcon />
                            )
                        }
                        testId={toolbarOverflowTestId(props.testId)}
                    />
                    <Menu.Positioner>
                        <Menu.Content>
                            <Menu.Items
                                items={toolbarMenuItems(items(), shown())}
                            />
                        </Menu.Content>
                    </Menu.Positioner>
                </Menu.Root>
            </Show>
        </Root>
    );
}

/** M3 Expressive's docked and floating toolbars. Use it ready-made, `<Toolbar aria-label="Edit"
 *  overflow items={[{ value: "bold", label: "Bold", icon: <BoldIcon /> }, …]} />`, or put
 *  buttons and icon buttons in `Toolbar.Root` yourself (no overflow then). */
export const Toolbar = Object.assign(ReadyMade, { Root });

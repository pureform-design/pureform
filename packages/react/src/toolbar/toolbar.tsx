// The toolbar: Root, a bar (`toolbarAnatomy`) whose arrow keys move focus among its elements;
// and the ready-made Toolbar over it, an icon button or button per element, which with
// `overflow` moves those that don't fit into the menu component behind an overflow button.

import { toolbarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    isUnstyled,
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
import { moveToolbarFocus, watchOverflow } from "@pureform/binding-core/dom";
import type {
    CSSProperties,
    ElementType,
    KeyboardEvent,
    ReactNode,
} from "react";
import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "../button";
import { MoreIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button";
import { Menu } from "../menu";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { ProvidedTokens } from "../provided-tokens";
import { useDirection } from "../provider";

/** Root's props: the variants and tokens, `overflow`, `testId`, `as`, and the element's own
 *  props. Name the toolbar with `aria-label` or `aria-labelledby`. */
export interface ToolbarRootProps
    extends Omit<PartProps, keyof ToolbarRootOwnProps>, ToolbarRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** Opts the root out of the registry's styles. An unstyled `vibrant` toolbar still gives its
     *  icon buttons the accent that follows its content color. */
    readonly unstyled?: Unstyled<ToolbarPart> | undefined;
}

const HIDDEN: CSSProperties = { display: "none" };

/** The toolbar's root, a `<div role="toolbar">`. The arrow keys along its orientation, Home
 *  and End move focus among its elements. */
function Root(props: ToolbarRootProps): ReactNode {
    const dir = useDirection();
    const scope = useComponent(toolbarAnatomy, {
        selection: toolbarSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const {
        as,
        unstyled: _unstyled,
        ...rest
    } = omitProps(props, TOOLBAR_ROOT_PROPS);
    const provided = isUnstyled(props.unstyled, "root")
        ? unstyledToolbarProvidedTokens(props.color)
        : undefined;
    return scope.render("root", {
        element: "div",
        as,
        machine: {
            ...toolbarRootProps(props),
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                const moved = moveToolbarFocus(
                    event.currentTarget,
                    event.key,
                    props.orientation,
                    dir,
                );
                if (moved) event.preventDefault();
            },
        },
        props: provided
            ? {
                  ...rest,
                  children: (
                      <ProvidedTokens tokens={provided}>
                          {rest.children}
                      </ProvidedTokens>
                  ),
              }
            : rest,
    });
}

/** The ready-made toolbar's props: Root's and the elements as data. */
export interface ToolbarProps
    extends
        Omit<ToolbarRootProps, "children">,
        ToolbarContentProps<ReactNode> {}

const ITEM = "data-pf-toolbar-item";
const OVERFLOW = "data-pf-toolbar-overflow";

// One element in the row: an icon button named by its label, or a text button.
function Element({
    item,
    hidden,
}: {
    readonly item: ToolbarItem<ReactNode>;
    readonly hidden: boolean;
}): ReactNode {
    const shared = {
        [ITEM]: "",
        disabled: item.disabled,
        onClick: item.onClick,
        testId: item.testId,
        interactionSource: item.interactionSource,
        // The ready-made buttons take their style by part.
        style: hidden ? { root: HIDDEN } : undefined,
        ...(item.selected === undefined
            ? {}
            : {
                  selected: item.selected,
                  onSelectedChange: item.onSelectedChange,
              }),
    };
    return isPresent(item.icon) ? (
        <IconButton
            {...(shared as object)}
            aria-label={item.label}
            icon={item.icon}
        />
    ) : (
        <Button {...(shared as object)} variant="text" label={item.label} />
    );
}

// The overflow button the menu's trigger renders: an icon button keeping its own part.
function OverflowButton({
    "data-scope": _scope,
    "data-pf-part": _part,
    "data-testid": _testId,
    ...props
}: IconButtonProps & Record<string, unknown>): ReactNode {
    return <IconButton {...(props as IconButtonProps)} />;
}

/** The ready-made toolbar: an icon button per element with an icon, a text button per element
 *  without, and with `overflow`, the overflow button opening a menu of those that don't fit. */
function ReadyMade(props: ToolbarProps): ReactNode {
    const { items = [], overflowLabel, overflowIcon, ...rootProps } = props;
    const root = useRef<HTMLElement>(null);
    // How many elements stay in the row; all of them, with the overflow button, until measured.
    const [count, setCount] = useState<number>();
    const overflow = !!props.overflow;
    const vertical = props.orientation === "vertical";
    useLayoutEffect(() => {
        const element = root.current;
        if (!element || !overflow) return;
        const watcher = watchOverflow({
            root: element,
            elements: () => [
                ...element.querySelectorAll<HTMLElement>(`:scope > [${ITEM}]`),
            ],
            trigger: () =>
                element.querySelector<HTMLElement>(`:scope > [${OVERFLOW}]`),
            vertical: () => vertical,
            onCount: setCount,
        });
        return () => watcher.stop();
    }, [overflow, vertical, props.items]);
    const shown = count ?? items.length;
    const overflowing =
        overflow && (count === undefined || shown < items.length);
    return (
        <Root {...rootProps} ref={root}>
            {items.map((item, index) => (
                <Element
                    key={item.value}
                    item={item}
                    hidden={overflow && index >= shown}
                />
            ))}
            {overflow ? (
                <Menu.Root
                    {...{ [OVERFLOW]: "" }}
                    style={overflowing ? undefined : HIDDEN}
                    positioning={toolbarMenuPositioning(props.orientation)}
                    onSelect={(details) =>
                        toolbarMenuSelect(items, details.value)
                    }
                >
                    <Menu.Trigger
                        as={OverflowButton}
                        aria-label={overflowLabel ?? TOOLBAR_OVERFLOW_LABEL}
                        icon={
                            isPresent(overflowIcon) ? (
                                overflowIcon
                            ) : (
                                <MoreIcon />
                            )
                        }
                        testId={toolbarOverflowTestId(props.testId)}
                    />
                    <Menu.Positioner>
                        <Menu.Content>
                            {toolbarMenuItems(items, shown).map((item) => (
                                <Menu.ItemEntry key={item.value} item={item} />
                            ))}
                        </Menu.Content>
                    </Menu.Positioner>
                </Menu.Root>
            ) : null}
        </Root>
    );
}

/** M3 Expressive's docked and floating toolbars. Use it ready-made, `<Toolbar aria-label="Edit"
 *  overflow items={[{ value: "bold", label: "Bold", icon: <BoldIcon /> }, …]} />`, or put
 *  buttons and icon buttons in `Toolbar.Root` yourself (no overflow then). */
export const Toolbar = Object.assign(ReadyMade, { Root });

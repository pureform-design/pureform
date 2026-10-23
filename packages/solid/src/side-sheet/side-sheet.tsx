// The side sheet: Root on Zag's dialog machine, an unstyled element around the trigger and the
// sheet; the trigger, a `<button>` or any component (`as={Button}`); a modal sheet's backdrop,
// drawn by the scrim; Zag's positioner, against the end edge of the viewport (or in the page's
// layout, for a coplanar sheet); the sheet's surface (`Content`) with its header (back button,
// headline, close trigger), body and actions; and the ready-made SideSheet over them. Everything
// renders in place, inside Root: while a modal sheet is open, Zag keeps focus inside it, hides the
// rest of the page from assistive technology, and stops the page scrolling. A standard sheet
// (`modal={false}`) leaves the page usable.

import {
    sideSheetBackdropAnatomy,
    sideSheetOverlayAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    SIDE_SHEET_CONTENT_PROPS,
    SIDE_SHEET_ROOT_PROPS,
    sideSheetPositionerLayout,
    sideSheetSelection,
    isPresent,
    sideSheetContentLayout,
    sheetMachineProps,
    sheetModal,
} from "@pureform/binding-core";
import type {
    SideSheetContentProps,
    SideSheetPart,
    SideSheetRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    sideSheetDragToDismiss,
    springRoleVar,
} from "@pureform/binding-core/dom";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit, onSettled, Show, untrack } from "solid-js";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { createSlotProps } from "../parts";
import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection, usePureform } from "../provider";

type Anatomy = typeof sideSheetOverlayAnatomy;

/** Root's props: `modal`, `coplanar` and the tokens, the machine's props (`open`, `closeOnEscape`, …),
 *  `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SideSheetRootProps
    extends
        Omit<PartProps, keyof SideSheetRootOwnProps>,
        SideSheetRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SideSheetPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface SideSheetTriggerProps extends SideSheetPartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

const chrome = dialogParts({
    name: "SideSheet",
    anatomy: sideSheetOverlayAnatomy,
    backdropAnatomy: sideSheetBackdropAnatomy,
    rootProps: SIDE_SHEET_ROOT_PROPS,
    selection: (props: SideSheetRootProps) => sideSheetSelection(props),
    machineProps: sheetMachineProps,
    modal: sheetModal,
    positionerLayout: (present, props) =>
        sideSheetPositionerLayout(
            present,
            sheetModal(props),
            sideSheetSelection(props).coplanar === true,
        ),
    contentLayout: sideSheetContentLayout,
    onClose: (props) => props.onClose,
});

/** The sheet's root, a `<div>` around the trigger and the sheet. The registry doesn't style
 *  it. */
const Root: (props: SideSheetRootProps) => JSX.Element = chrome.Root;

/** The button that opens the sheet. */
const Trigger: (props: SideSheetTriggerProps) => JSX.Element = chrome.Trigger;

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
const Backdrop: (props: SideSheetPartProps) => JSX.Element = chrome.Backdrop;

/** Holds the sheet against the end edge of the viewport (in the page's layout when coplanar),
 *  stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: SideSheetPartProps) => JSX.Element =
    chrome.Positioner;

const { context } = chrome;
const Surface: (props: SideSheetPartProps) => JSX.Element = chrome.Content;

/** The sheet's surface. It stays while its exit animation runs. A touch or a pen dragging it
 *  sideways toward its edge moves it, and it settles back or closes once let go (asking
 *  `onClose` first), as MDC-Android's side sheet. A coplanar sheet gives its room in the
 *  page's layout up as it moves, so the content beside it widens. */
function Content(props: SideSheetPartProps): JSX.Element {
    const {
        surface,
        api,
        asker,
        onClose,
        props: root,
    } = context.use("Content");
    const dir = useDirection();
    const state = usePureform();
    onSettled(() => {
        const element = surface();
        if (!element) return;
        return sideSheetDragToDismiss(
            element,
            () => dir() === "rtl",
            (kept) => {
                api().setOpen(false);
                // Solid has rendered the close by now; a sheet still open was kept.
                queueMicrotask(() => {
                    if (api().open) kept();
                });
            },
            () => onClose()?.() ?? true,
            asker,
            // A coplanar sheet's positioner holds its place in the page's layout.
            () =>
                sideSheetSelection(root).coplanar === true
                    ? element.parentElement
                    : undefined,
            untrack(() => springRoleVar(state().registry, "spatialDefault")),
        );
    });
    return <Surface {...props} />;
}

/** The row at the top: the back button, the headline, and the close trigger. */
const Header: (props: SideSheetPartProps) => JSX.Element = chrome.part(
    "header",
    "Header",
    "div",
);

/** A button at the start of the header that goes back a step inside the sheet: `as={IconButton}`
 *  draws it as one. Name it with `aria-label`; what it does is yours. */
const BackButton: (props: SideSheetTriggerProps) => JSX.Element =
    chrome.trigger("backButton", "BackButton");

/** The title, an `<h2>`, which names the sheet. */
const Headline: (props: SideSheetPartProps) => JSX.Element = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** A button at the end of the header that closes the sheet: `as={IconButton}` draws it as one.
 *  Name it with `aria-label`. */
const CloseTrigger: (props: SideSheetTriggerProps) => JSX.Element =
    chrome.closeTrigger("closeTrigger", "CloseTrigger");

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
const Body: (props: SideSheetPartProps) => JSX.Element = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The buttons under the content, over a divider: the main one first. */
const Actions: (props: SideSheetPartProps) => JSX.Element = chrome.part(
    "actions",
    "Actions",
    "div",
);

/** The ready-made sheet's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  the trigger's label, the headline, the back and close buttons' names and icons, and the body
 *  and actions as content. */
export interface SideSheetProps
    extends
        Omit<SideSheetRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SideSheetContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<SideSheetPart>;
    readonly unstyled?: Unstyled<SideSheetPart>;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SIDE_SHEET_CONTENT_PROPS,
] as const;

/** The ready-made sheet: the trigger, drawn as a button, when given a label, a modal sheet's
 *  backdrop, and the sheet with its header (a back icon button when given `onBack`, the headline,
 *  and the close icon button), its body, and its actions when given. */
function ReadyMade(props: SideSheetProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SideSheetRootProps;
    const root = slots("root") as object;
    const trigger = slots("trigger") as object;
    const positioner = slots("positioner");
    const content = slots("content");
    const header = slots("header");
    const backButton = slots("backButton") as object;
    const headline = slots("headline");
    const closeTrigger = slots("closeTrigger") as object;
    const body = slots("body");
    const actions = slots("actions");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.trigger)}>
                <Trigger as={Button} label={props.trigger} {...trigger} />
            </Show>
            <Backdrop />
            <Positioner {...positioner}>
                <Content {...content}>
                    <Header {...header}>
                        <Show when={props.onBack}>
                            <BackButton
                                as={IconButton}
                                aria-label={props.backLabel ?? "Back"}
                                icon={
                                    isPresent(props.backIcon) ? (
                                        props.backIcon
                                    ) : (
                                        <BackIcon />
                                    )
                                }
                                mirrorIcon
                                onClick={() => props.onBack?.()}
                                {...backButton}
                            />
                        </Show>
                        <Show when={isPresent(props.headline)}>
                            <Headline {...headline}>{props.headline}</Headline>
                        </Show>
                        <CloseTrigger
                            as={IconButton}
                            aria-label={props.closeLabel ?? "Close"}
                            icon={
                                isPresent(props.closeIcon) ? (
                                    props.closeIcon
                                ) : (
                                    <CloseIcon />
                                )
                            }
                            {...closeTrigger}
                        />
                    </Header>
                    <Show when={isPresent(props.body)}>
                        <Body {...body}>{props.body}</Body>
                    </Show>
                    <Show when={isPresent(props.actions)}>
                        <Actions {...actions}>{props.actions}</Actions>
                    </Show>
                </Content>
            </Positioner>
        </Root>
    );
}

/** Material's side sheet. Use it ready-made, `<SideSheet trigger="Filters" headline="Filters"
 *  body={…} actions={…} />` (a standard sheet with `modal={false}`, in the page's layout with
 *  `coplanar`), or compose its parts under `SideSheet.Root`: `Trigger` (`as={Button}` draws it as
 *  a button), `Backdrop`, then `Positioner` holding `Content`, which holds `Header` (with
 *  `BackButton`, `Headline`, and `CloseTrigger`), `Body`, and `Actions`. */
export const SideSheet = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Backdrop,
    Positioner,
    Content,
    Header,
    BackButton,
    Headline,
    CloseTrigger,
    Body,
    Actions,
});

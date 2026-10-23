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
    isPresent,
    sideSheetContentLayout,
    sheetMachineProps,
    sheetModal,
    SIDE_SHEET_ROOT_PROPS,
    sideSheetPositionerLayout,
    sideSheetSelection,
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
import {
    type ElementType,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

import { Button } from "../button";
import { dialogParts } from "../dialog-parts";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useSlotProps } from "../parts";
import type { SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useComponentState, useDirection } from "../provider";

type Anatomy = typeof sideSheetOverlayAnatomy;

/** Root's props: `modal`, `coplanar` and the tokens, the machine's props (`open`,
 *  `closeOnEscape`, …), `testId` and `unstyled` for every part, `as`, and the element's own
 *  props. */
export interface SideSheetRootProps
    extends
        Omit<PartProps, keyof SideSheetRootOwnProps>,
        SideSheetRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SideSheetPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>` (`as={
 *  Button}`), which takes the rest of the props. */
export interface SideSheetTriggerProps extends SideSheetPartProps {
    readonly as?: ElementType | undefined;
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
const Root: (props: SideSheetRootProps) => ReactNode = chrome.Root;

/** The button that opens the sheet. */
const Trigger: (props: SideSheetTriggerProps) => ReactNode = chrome.Trigger;

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
const Backdrop: (props: SideSheetPartProps) => ReactNode = chrome.Backdrop;

/** Holds the sheet against the end edge of the viewport (in the page's layout when coplanar),
 *  stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
const Positioner: (props: SideSheetPartProps) => ReactNode = chrome.Positioner;

const { context } = chrome;
const Surface: (props: SideSheetPartProps) => ReactNode = chrome.Content;

/** The sheet's surface. It stays while its exit animation runs. A touch or a pen dragging it
 *  sideways toward its edge moves it, and it settles back or closes once let go (asking
 *  `onClose` first), as MDC-Android's side sheet; a coplanar sheet doesn't drag. */
function Content(props: SideSheetPartProps): ReactNode {
    const {
        surface,
        latestApi,
        asker,
        onClose,
        props: root,
    } = context.use("Content");
    const dir = useDirection();
    const rtl = useRef(dir === "rtl");
    rtl.current = dir === "rtl";
    const coplanar = useRef(false);
    const spring = springRoleVar(
        useComponentState().registry,
        "spatialDefault",
    );
    coplanar.current = sideSheetSelection(root).coplanar === true;
    // After a drag closed it: once that render has committed, a sheet still open (one the app
    // kept open) settles back.
    const [left, setLeft] = useState<{ readonly kept: () => void }>();
    useEffect(() => {
        if (left && latestApi.current.open) left.kept();
    }, [left, latestApi]);
    useEffect(() => {
        const element = surface.current;
        if (!element) return undefined;
        return sideSheetDragToDismiss(
            element,
            () => rtl.current,
            (kept) => {
                latestApi.current.setOpen(false);
                setLeft({ kept });
            },
            () => onClose()?.() ?? true,
            asker,
            () => !coplanar.current,
            spring,
        );
    }, [surface, latestApi, asker, onClose]);
    return <Surface {...props} />;
}

/** The row at the top: the back button, the headline, and the close trigger. */
const Header: (props: SideSheetPartProps) => ReactNode = chrome.part(
    "header",
    "Header",
    "div",
);

/** A button at the start of the header that goes back a step inside the sheet: `as={IconButton}`
 *  draws it as one. Name it with `aria-label`; what it does is yours. */
const BackButton: (props: SideSheetTriggerProps) => ReactNode = chrome.trigger(
    "backButton",
    "BackButton",
);

/** The title, an `<h2>`, which names the sheet. */
const Headline: (props: SideSheetPartProps) => ReactNode = chrome.part(
    "headline",
    "Headline",
    "h2",
    (api) => api.getTitleProps(),
);

/** A button at the end of the header that closes the sheet: `as={IconButton}` draws it as one.
 *  Name it with `aria-label`. */
const CloseTrigger: (props: SideSheetTriggerProps) => ReactNode =
    chrome.closeTrigger("closeTrigger", "CloseTrigger");

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
const Body: (props: SideSheetPartProps) => ReactNode = chrome.part(
    "body",
    "Body",
    "div",
    (api) => api.getDescriptionProps(),
);

/** The buttons under the content, over a divider: the main one first. */
const Actions: (props: SideSheetPartProps) => ReactNode = chrome.part(
    "actions",
    "Actions",
    "div",
);

/** The ready-made sheet's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, the trigger's label, the headline, the back and close buttons' names and icons, and the
 *  body and actions as content. */
export interface SideSheetProps
    extends
        Omit<SideSheetRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SideSheetContentProps<ReactNode> {
    readonly testId?: TestIdOverride<SideSheetPart>;
    readonly unstyled?: Unstyled<SideSheetPart>;
}

/** The ready-made sheet: the trigger, drawn as a button, when given a label, a modal sheet's
 *  backdrop, and the sheet with its header (a back icon button when given `onBack`, the headline,
 *  and the close icon button), its body, and its actions when given. */
function ReadyMade(props: SideSheetProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        trigger,
        headline,
        onBack,
        backLabel,
        backIcon,
        closeLabel,
        closeIcon,
        body,
        actions,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(trigger) ? (
                <Trigger as={Button} label={trigger} {...slot("trigger")} />
            ) : null}
            <Backdrop />
            <Positioner {...slot("positioner")}>
                <Content {...slot("content")}>
                    <Header {...slot("header")}>
                        {onBack ? (
                            <BackButton
                                as={IconButton}
                                aria-label={backLabel ?? "Back"}
                                icon={
                                    isPresent(backIcon) ? (
                                        backIcon
                                    ) : (
                                        <BackIcon />
                                    )
                                }
                                mirrorIcon
                                onClick={() => onBack()}
                                {...(slot("backButton") as object)}
                            />
                        ) : null}
                        {isPresent(headline) ? (
                            <Headline {...slot("headline")}>
                                {headline}
                            </Headline>
                        ) : null}
                        <CloseTrigger
                            as={IconButton}
                            aria-label={closeLabel ?? "Close"}
                            icon={
                                isPresent(closeIcon) ? closeIcon : <CloseIcon />
                            }
                            {...(slot("closeTrigger") as object)}
                        />
                    </Header>
                    {isPresent(body) ? (
                        <Body {...slot("body")}>{body}</Body>
                    ) : null}
                    {isPresent(actions) ? (
                        <Actions {...slot("actions")}>{actions}</Actions>
                    ) : null}
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

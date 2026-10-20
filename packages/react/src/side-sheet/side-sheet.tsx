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
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    dialogBackdropLayout,
    isPresent,
    presentProps,
    sheetContentLayout,
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
import { stackPositioner } from "@pureform/binding-core/dom";
import * as dialog from "@pureform/machines/dialog";
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    type RefObject,
    useId,
    useRef,
} from "react";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sideSheetOverlayAnatomy;
type BackdropAnatomy = typeof sideSheetBackdropAnatomy;

/** What Root shares with its parts. */
interface SideSheetContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: dialog.Api<PropTypes>;
    readonly presence: Presence;
    readonly modal: boolean;
    readonly coplanar: boolean;
    readonly positioner: RefObject<HTMLElement | null>;
}

const context = createPartContext<SideSheetContextValue>("SideSheet");

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

// The backdrop's test id and `unstyled`, from Root's, which name it `backdrop`.
const backdropTestId = (
    testId: TestIdOverride<SideSheetPart> | undefined,
): TestIdOverride<"root"> | undefined =>
    typeof testId !== "object"
        ? testId
        : testId.backdrop === undefined
          ? undefined
          : { root: testId.backdrop };

const backdropUnstyled = (
    unstyled: Unstyled<SideSheetPart> | undefined,
): Unstyled<"root"> | undefined =>
    typeof unstyled !== "object"
        ? unstyled
        : unstyled.backdrop === undefined
          ? undefined
          : { root: unstyled.backdrop };

/** The sheet's root, a `<div>` around the trigger and the sheet. The registry doesn't style
 *  it. */
function Root(props: SideSheetRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("SideSheet", "open", props);
    const service = useMachine(dialog.machine, {
        id,
        dir,
        ...sheetMachineProps(props),
        ...open.machineProps,
    });
    const api = dialog.connect(service, normalizeProps);
    const positioner = useRef<HTMLElement | null>(null);
    const presence = usePresence(api.open, (surface) =>
        positioner.current
            ? stackPositioner(positioner.current, surface)
            : undefined,
    );
    const selection = sideSheetSelection(props);
    const scope = useComponent(sideSheetOverlayAnatomy, {
        selection,
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const backdrop = useComponent(sideSheetBackdropAnatomy, {
        selection: {},
        testId: backdropTestId(props.testId),
        unstyled: backdropUnstyled(props.unstyled),
    });
    const { as, ...rest } = omitProps(props, SIDE_SHEET_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                backdrop,
                api,
                presence,
                modal: sheetModal(props),
                coplanar: selection.coplanar === true,
                positioner,
            }}
        >
            {scope.render("root", { element: "div", as, props: rest })}
        </context.Provider>
    );
}

/** The button that opens the sheet. */
function Trigger({ unstyled, as, ...props }: SideSheetTriggerProps): ReactNode {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getTriggerProps(),
        unstyled,
        props,
    });
}

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet renders none. */
function Backdrop({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { backdrop, api, presence, modal } = context.use("Backdrop");
    if (!modal) return null;
    return backdrop.render("root", {
        element: "div",
        machine: mergeProps(
            api.getBackdropProps(),
            normalizeProps.element(dialogBackdropLayout(presence.present)),
        ),
        unstyled,
        props,
    });
}

/** Holds the sheet against the end edge of the viewport (in the page's layout when coplanar),
 *  stacked at its surface's layer; hidden once it's closed and its exit animation is over. The
 *  registry doesn't style it. */
function Positioner({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope, api, presence, modal, coplanar, positioner } =
        context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: positioner,
        machine: mergeProps(
            api.getPositionerProps(),
            normalizeProps.element(
                sideSheetPositionerLayout(presence.present, modal, coplanar),
            ),
        ),
        unstyled,
        props,
    });
}

/** The sheet's surface. It stays while its exit animation runs. */
function Content({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope, api, presence } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: presence.ref,
        machine: mergeProps(
            presentProps(api.getContentProps(), presence.present),
            normalizeProps.element(sheetContentLayout),
        ),
        unstyled,
        props,
    });
}

/** The row at the top: the back button, the headline, and the close trigger. */
function Header({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope } = context.use("Header");
    return scope.render("header", { element: "div", unstyled, props });
}

/** A button at the start of the header that goes back a step inside the sheet: `as={IconButton}`
 *  draws it as one. Name it with `aria-label`; what it does is yours. */
function BackButton({
    unstyled,
    as,
    ...props
}: SideSheetTriggerProps): ReactNode {
    const { scope } = context.use("BackButton");
    return scope.render("backButton", {
        element: "button",
        as: as as ElementType | undefined,
        unstyled,
        props,
    });
}

/** The title, an `<h2>`, which names the sheet. */
function Headline({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: api.getTitleProps(),
        unstyled,
        props,
    });
}

/** A button at the end of the header that closes the sheet: `as={IconButton}` draws it as one.
 *  Name it with `aria-label`. */
function CloseTrigger({
    unstyled,
    as,
    ...props
}: SideSheetTriggerProps): ReactNode {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: as as ElementType | undefined,
        machine: api.getCloseTriggerProps(),
        unstyled,
        props,
    });
}

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
function Body({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** The buttons under the content, over a divider: the main one first. */
function Actions({ unstyled, ...props }: SideSheetPartProps): ReactNode {
    const { scope } = context.use("Actions");
    return scope.render("actions", { element: "div", unstyled, props });
}

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

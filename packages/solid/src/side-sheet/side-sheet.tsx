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
    dialogBackdropLayout,
    isPresent,
    presentProps,
    sheetContentLayout,
    sheetMachineProps,
    sheetModal,
} from "@pureform/binding-core";
import type {
    SideSheetContentProps,
    SideSheetPart,
    SideSheetRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { stackPositioner } from "@pureform/binding-core/dom";
import * as dialog from "@pureform/machines/dialog";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    omit,
    Show,
} from "solid-js";

import { Button } from "../button";
import { useControllable } from "../controllable";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { mergeProps, normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof sideSheetOverlayAnatomy;
type BackdropAnatomy = typeof sideSheetBackdropAnatomy;

/** What Root shares with its parts. */
interface SideSheetContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly backdrop: ComponentScope<BackdropAnatomy>;
    readonly api: Accessor<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    readonly modal: Accessor<boolean>;
    readonly coplanar: Accessor<boolean>;
    readonly setPositioner: (element: HTMLElement) => void;
    readonly setSurface: (element: HTMLElement) => void;
}

const context = createPartContext<SideSheetContextValue>("SideSheet");

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
function Root(props: SideSheetRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("SideSheet", "open", props);
    const service = useMachine(dialog.machine, () => ({
        id,
        dir: dir(),
        ...sheetMachineProps(props),
        ...open.machineProps(),
    }));
    const api = createMemo(() => dialog.connect(service, normalizeProps));
    let positioner: HTMLElement | undefined;
    const presence = usePresence(
        () => api().open,
        (element) =>
            positioner ? stackPositioner(positioner, element) : undefined,
    );
    const scope = useComponent(sideSheetOverlayAnatomy, {
        selection: () => sideSheetSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    const backdrop = useComponent(sideSheetBackdropAnatomy, {
        selection: () => ({}),
        testId: () => backdropTestId(props.testId),
        unstyled: () => backdropUnstyled(props.unstyled),
    });
    return (
        <context.Provider
            value={{
                scope,
                backdrop,
                api,
                presence,
                modal: () => sheetModal(props),
                coplanar: () => sideSheetSelection(props).coplanar === true,
                setPositioner: (element) => {
                    positioner = element;
                },
                setSurface: presence.ref,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                props: omit(props, "as", ...SIDE_SHEET_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The button that opens the sheet. */
function Trigger(props: SideSheetTriggerProps): JSX.Element {
    const { scope, api } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** Dims the page behind a modal sheet, drawn by the scrim; hidden once it's closed and its exit
 *  animation is over. A standard sheet's stays hidden. */
function Backdrop(props: SideSheetPartProps): JSX.Element {
    const { backdrop, api, presence, modal } = context.use("Backdrop");
    return backdrop.render("root", {
        element: "div",
        machine: () =>
            mergeProps(
                api().getBackdropProps(),
                normalizeProps.element(
                    dialogBackdropLayout(modal() && presence.present()),
                ),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** Holds the sheet against the end edge of the viewport (in the page's layout when coplanar),
 *  stacked at its surface's layer; hidden once
 *  it's closed and its exit animation is over. The registry doesn't style it. */
function Positioner(props: SideSheetPartProps): JSX.Element {
    const { scope, api, presence, modal, coplanar, setPositioner } =
        context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: setPositioner,
        machine: () =>
            mergeProps(
                api().getPositionerProps(),
                normalizeProps.element(
                    sideSheetPositionerLayout(
                        presence.present(),
                        modal(),
                        coplanar(),
                    ),
                ),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The sheet's surface. It stays while its exit animation runs. */
function Content(props: SideSheetPartProps): JSX.Element {
    const { scope, api, presence, setSurface } = context.use("Content");
    return scope.render("content", {
        element: "div",
        ref: setSurface,
        machine: () =>
            mergeProps(
                presentProps(api().getContentProps(), presence.present()),
                normalizeProps.element(sheetContentLayout),
            ),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The row at the top: the back button, the headline, and the close trigger. */
function Header(props: SideSheetPartProps): JSX.Element {
    const { scope } = context.use("Header");
    return scope.render("header", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button at the start of the header that goes back a step inside the sheet: `as={IconButton}`
 *  draws it as one. Name it with `aria-label`; what it does is yours. */
function BackButton(props: SideSheetTriggerProps): JSX.Element {
    const { scope } = context.use("BackButton");
    return scope.render("backButton", {
        element: "button",
        as: () => props.as,
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The title, an `<h2>`, which names the sheet. */
function Headline(props: SideSheetPartProps): JSX.Element {
    const { scope, api } = context.use("Headline");
    return scope.render("headline", {
        element: "h2",
        machine: () => api().getTitleProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button at the end of the header that closes the sheet: `as={IconButton}` draws it as one.
 *  Name it with `aria-label`. */
function CloseTrigger(props: SideSheetTriggerProps): JSX.Element {
    const { scope, api } = context.use("CloseTrigger");
    return scope.render("closeTrigger", {
        element: "button",
        as: () => props.as,
        machine: () => api().getCloseTriggerProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "as"),
    });
}

/** The content, which describes the sheet. It scrolls when it's taller than the sheet. */
function Body(props: SideSheetPartProps): JSX.Element {
    const { scope, api } = context.use("Body");
    return scope.render("body", {
        element: "div",
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The buttons under the content, over a divider: the main one first. */
function Actions(props: SideSheetPartProps): JSX.Element {
    const { scope } = context.use("Actions");
    return scope.render("actions", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

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

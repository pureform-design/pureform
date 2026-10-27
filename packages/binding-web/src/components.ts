// The web halves of the components' contracts: the props only the web has (element getters, the
// web's `File`) as extensions of binding-core's (`DialogFocusProps` beside `DialogRootOwnProps`),
// and the handlers that reach into the DOM (the FAB menu's keys).

import { POPOVER_ROOT_PROPS, RIPPLE_ROOT_PROPS } from "@pureform/binding-core";

import {
    popoverMachineProps,
    rippleMachineProps,
    searchViewDialogProps,
} from "./components/machines";

export * from "./components/card";
export * from "./components/copy-button";
export * from "./components/field-primitives";
export * from "./components/layout";
export * from "./components/list-item";
export * from "./components/machines";
export * from "./components/menu";
export * from "./components/navigation";
export * from "./components/page-transition";
export * from "./components/paginator";
export * from "./components/props";
export * from "./components/radio-group";
export * from "./components/search-view";
export * from "./components/select";
export * from "./components/toast";
export * from "./components/toolbar";
export * from "./components/tooltip";
import type {
    FileUploadBehaviorProps,
    FileUploadContentProps,
    FileUploadRootOwnProps,
    FileUploadValueDetails,
    PopoverBehaviorProps,
    PopoverRootOwnProps,
    RippleBehaviorProps,
    RippleRootOwnProps,
    SearchViewBehaviorProps,
} from "@pureform/binding-core";

/** The web's focus props of an overlay on Zag's dialog machine (the dialogs, the sheets). */
export interface DialogFocusProps {
    /** The element that takes focus when it opens: a function, so it's read then. @default the
     *  first focusable element inside, else the dialog */
    readonly initialFocusEl?: (() => HTMLElement | null) | undefined;
    /** The element that takes focus once it closes. @default the trigger */
    readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
}

/** The keys of `DialogFocusProps`, which Root keeps off its element. */
export const DIALOG_FOCUS_PROPS = [
    "initialFocusEl",
    "finalFocusEl",
] as const satisfies readonly (keyof DialogFocusProps)[];

/** Zag's dialog props from `DialogFocusProps`. */
export const dialogFocusMachineProps = (props: DialogFocusProps) => ({
    initialFocusEl: props.initialFocusEl,
    finalFocusEl: props.finalFocusEl,
});

/** The web's focus props of the popover. */
export interface PopoverFocusProps {
    /** The element that takes focus when it opens: a function, so it's read then. Return `false`
     *  to leave focus where it is. @default the first focusable element inside */
    readonly initialFocusEl?: (() => HTMLElement | null | false) | undefined;
    /** The element that takes focus once it closes. @default the trigger */
    readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
}

/** The popover's Root props on the web. */
export interface PopoverDomRootOwnProps
    extends PopoverRootOwnProps, PopoverFocusProps {}

/** The keys of `PopoverDomRootOwnProps`, which Root keeps off its element. */
export const POPOVER_DOM_ROOT_PROPS = [
    ...POPOVER_ROOT_PROPS,
    "initialFocusEl",
    "finalFocusEl",
] as const satisfies readonly (keyof PopoverDomRootOwnProps)[];

/** Zag's popover props from Root's on the web (`popoverMachineProps`, and the focus elements). */
export const popoverDomMachineProps = (
    props: PopoverBehaviorProps & PopoverFocusProps,
) => ({
    ...popoverMachineProps(props),
    initialFocusEl: props.initialFocusEl,
    finalFocusEl: props.finalFocusEl,
});

/** Zag's dialog props for the search view (`searchViewDialogProps`), with `input`, which finds
 *  the view's input, taking focus as it opens. */
export const searchViewDomDialogProps = (
    props: SearchViewBehaviorProps,
    input: () => HTMLElement | null,
) => ({ ...searchViewDialogProps(props), initialFocusEl: input });

/** What the ripple machine takes on the web besides binding-core's `RippleBehaviorProps`. */
export interface RippleDomProps {
    /** The surface whose presses ripple. @default the layer's parent element */
    readonly getSurfaceEl?:
        | ((layer: HTMLElement) => HTMLElement | null)
        | undefined;
}

/** The ripple's Root props on the web. */
export interface RippleDomRootOwnProps
    extends RippleRootOwnProps, RippleDomProps {}

/** The keys of `RippleDomRootOwnProps`, which Root keeps off its element. */
export const RIPPLE_DOM_ROOT_PROPS = [
    ...RIPPLE_ROOT_PROPS,
    "getSurfaceEl",
] as const satisfies readonly (keyof RippleDomRootOwnProps)[];

/** The ripple machine's props from Root's on the web (`rippleMachineProps`, and the surface). */
export const rippleDomMachineProps = (
    props: RippleBehaviorProps & RippleDomProps,
) => ({ ...rippleMachineProps(props), getSurfaceEl: props.getSurfaceEl });

/** The file upload's behaviour props over the web's `File`. */
export type FileUploadDomBehaviorProps = FileUploadBehaviorProps<File>;

/** The file upload's Root props over the web's `File`. */
export type FileUploadDomRootOwnProps = FileUploadRootOwnProps<File>;

/** What a change of the web's files reports. */
export type FileUploadDomValueDetails = FileUploadValueDetails<File>;

/** What the ready-made file upload renders, over the web's `File`. */
export type FileUploadDomContentProps<Node> = FileUploadContentProps<
    Node,
    File
>;

/** The keyboard event the list's Tab handling reads, in any binding. */
interface FabMenuTabEvent {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly target: EventTarget | null;
    readonly currentTarget: EventTarget | null;
    readonly defaultPrevented: boolean;
    preventDefault(): void;
}

// The keys Zag's menu moves its highlight with.
const HIGHLIGHT_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

/** The list's (the menu content's) props, with Tab from its last item going on to the FAB (Zag's
 *  menu keeps Tab inside its content at the last tabbable item; the FAB follows the list), and
 *  focus following the highlight: an arrow key (or Home, End) that moves Zag's highlight moves
 *  focus to the highlighted item, so arrows and Tab move one focus. */
export const fabMenuListProps = <P extends object>(
    content: P,
    getFab: () => HTMLElement | null | undefined,
): P => ({
    ...content,
    onKeyDown(event: FabMenuTabEvent) {
        if (event.key === "Tab" && !event.shiftKey && !event.defaultPrevented) {
            const list = event.currentTarget as HTMLElement | null;
            const items = list?.querySelectorAll<HTMLElement>(
                '[role^="menuitem"]:not([tabindex="-1"])',
            );
            const last = items?.[items.length - 1];
            const fab = getFab();
            if (fab && (last === undefined || event.target === last)) {
                event.preventDefault();
                fab.focus();
                return;
            }
        }
        (
            content as { onKeyDown?: (event: FabMenuTabEvent) => void }
        ).onKeyDown?.(event);
        if (HIGHLIGHT_KEYS.has(event.key)) {
            const list = event.currentTarget as HTMLElement | null;
            // Once the binding has drawn the new highlight.
            requestAnimationFrame(() => {
                const item = list?.querySelector<HTMLElement>(
                    '[role^="menuitem"][data-highlighted]',
                );
                if (item && item !== document.activeElement) {
                    item.focus({ preventScroll: true });
                }
            });
        }
    },
});

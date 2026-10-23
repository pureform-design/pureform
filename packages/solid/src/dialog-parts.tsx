// The parts every overlay on Zag's dialog machine shares (the dialog, the full-screen dialog, the
// bottom and side sheets): Root, which runs the machine and its presence and provides the scope;
// the trigger; the backdrop, drawn by the scrim; the positioner, stacked at its surface's layer;
// and the surface (`Content`), which stays while its exit animation runs. Each component passes
// its anatomy, selection, machine props and layouts, and builds its other parts with `part` and
// `trigger`.

import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    askingDismissProps,
    closeAsker,
    closeTriggerProps,
    dialogBackdropLayout,
    partAsRoot,
    presentProps,
} from "@pureform/binding-core";
import type {
    CloseAsker,
    CloseQuestion,
    Controllable,
    Unstyled,
} from "@pureform/binding-core";
import { stackPositioner } from "@pureform/binding-core/dom";
import * as dialog from "@pureform/machines/dialog";
import type { Selection } from "@pureform/styling";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    omit,
    onCleanup,
} from "solid-js";

import { useControllable } from "./controllable";
import { mergeProps, normalizeProps, useMachine } from "./internal/zag";
import type { PropTypes } from "./internal/zag";
import { createPartContext } from "./part-context";
import { useComponent } from "./parts";
import type { ComponentOf, ComponentScope } from "./parts";
import { usePresence } from "./presence";
import type { Presence } from "./presence";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Layout = Parameters<typeof normalizeProps.element>[0];

/** What a dialog-machine Root takes for the shared parts: `open`'s props, `testId`, `unstyled`
 *  and `as`. */
export interface DialogChromeRootProps extends Controllable<"open", boolean> {
    readonly testId?: TestIdOverride | undefined;
    readonly unstyled?: Unstyled | undefined;
    readonly as?: ValidComponent | undefined;
    readonly closeOnEscape?: boolean | undefined;
    readonly closeOnInteractOutside?: boolean | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DialogChromePartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>`. */
export interface DialogChromeTriggerProps extends DialogChromePartProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** What one overlay on the dialog machine sets. */
export interface DialogChromeOptions<
    A extends ComponentAnatomy,
    P extends DialogChromeRootProps,
> {
    /** The component's name, in the error a part outside Root throws. */
    readonly name: string;
    readonly anatomy: A;
    /** The scrim's anatomy for the backdrop, which Root's `testId` and `unstyled` name
     *  `backdrop`. */
    readonly backdropAnatomy?: ComponentAnatomy | undefined;
    /** The keys Root keeps off its element. */
    readonly rootProps: readonly string[];
    readonly selection: (props: P) => Selection<ComponentOf<A>>;
    /** Zag's dialog props, besides `id`, `dir` and the controllable `open`. */
    readonly machineProps: (props: P) => object;
    /** Whether the backdrop shows. Always, by default. */
    readonly modal?: ((props: P) => boolean) | undefined;
    /** What the positioner adds to Zag's props. */
    readonly positionerLayout: (present: boolean, props: P) => Layout;
    /** What the surface adds to Zag's props, if anything. */
    readonly contentLayout?: Layout | undefined;
    /** What the overlay asks before it closes by itself (Escape, a press outside, its own
     *  close controls), if anything. */
    readonly onClose?: ((props: P) => CloseQuestion | undefined) | undefined;
}

/** What Root shares with its parts. */
export interface DialogChromeContext<
    A extends ComponentAnatomy,
    P extends DialogChromeRootProps,
> {
    readonly scope: ComponentScope<A>;
    readonly backdrop: ComponentScope<ComponentAnatomy> | undefined;
    readonly api: Accessor<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    /** Root's props. */
    readonly props: P;
    readonly setPositioner: (element: HTMLElement) => void;
    readonly setSurface: (element: HTMLElement) => void;
    readonly surface: () => HTMLElement | undefined;
    /** Asks `onClose` for every way the overlay closes by itself. */
    readonly asker: CloseAsker;
    /** Asks `onClose`, if the overlay has one, then closes on a yes. */
    readonly requestClose: () => void;
    /** Root's `onClose`, if any. */
    readonly onClose: () => CloseQuestion | undefined;
}

/** Builds the shared parts of an overlay on Zag's dialog machine. */
export function dialogParts<
    A extends ComponentAnatomy,
    P extends DialogChromeRootProps,
>(options: DialogChromeOptions<A, P>) {
    const context = createPartContext<DialogChromeContext<A, P>>(options.name);
    const name = (part: string) => part as PartName<A>;

    function Root(props: P): JSX.Element {
        const id = createUniqueId();
        const dir = useDirection();
        const open = useControllable<"open", boolean>(
            options.name,
            "open",
            props as Controllable<"open", boolean>,
        );
        const asker = closeAsker();
        onCleanup(() => asker.cancel());
        const closeNow = () => api().setOpen(false);
        const onClose = () => options.onClose?.(props);
        const requestClose = () => asker.ask(onClose(), closeNow, () => {});
        const service = useMachine(dialog.machine, () => ({
            id,
            dir: dir(),
            ...options.machineProps(props),
            ...askingDismissProps(
                onClose(),
                {
                    closeOnEscape: props.closeOnEscape,
                    closeOnInteractOutside: props.closeOnInteractOutside,
                    modal: options.modal?.(props) ?? true,
                },
                asker,
                closeNow,
            ),
            ...open.machineProps(),
        }));
        const api = createMemo(() => dialog.connect(service, normalizeProps));
        let positioner: HTMLElement | undefined;
        let surface: HTMLElement | undefined;
        const presence = usePresence(
            () => api().open,
            (element) =>
                positioner ? stackPositioner(positioner, element) : undefined,
        );
        const scope = useComponent(options.anatomy, {
            selection: () => options.selection(props),
            testId: () =>
                props.testId as TestIdOverride<PartName<A>> | undefined,
            unstyled: () => props.unstyled as Unstyled<PartName<A>> | undefined,
        });
        const backdrop =
            options.backdropAnatomy &&
            useComponent(options.backdropAnatomy, {
                selection: () => ({}) as Selection<never>,
                testId: () => partAsRoot<string>(props.testId, "backdrop"),
                unstyled: () => partAsRoot<boolean>(props.unstyled, "backdrop"),
            });
        return (
            <context.Provider
                value={{
                    scope,
                    backdrop,
                    api,
                    presence,
                    props,
                    setPositioner: (element) => {
                        positioner = element;
                    },
                    setSurface: (element) => {
                        surface = element;
                        presence.ref(element);
                    },
                    surface: () => surface,
                    asker,
                    requestClose,
                    onClose,
                }}
            >
                {scope.render(name("root"), {
                    element: "div",
                    as: () => props.as,
                    props: omit(props, "as", ...(options.rootProps as [])),
                })}
            </context.Provider>
        );
    }

    /** A part with the machine's props for it, if any. */
    const part =
        (
            key: string,
            display: string,
            element: ValidComponent,
            machine?: (api: dialog.Api<PropTypes>) => object,
        ) =>
        (props: DialogChromePartProps): JSX.Element => {
            const { scope, api } = context.use(display);
            return scope.render(name(key), {
                element,
                ...(machine ? { machine: () => machine(api()) } : {}),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
            });
        };

    /** A `<button>` part, or `as`, with the machine's props for it, if any. */
    const trigger =
        (
            key: string,
            display: string,
            machine?: (api: dialog.Api<PropTypes>) => object,
        ) =>
        (props: DialogChromeTriggerProps): JSX.Element => {
            const { scope, api } = context.use(display);
            return scope.render(name(key), {
                element: "button",
                as: () => props.as,
                ...(machine ? { machine: () => machine(api()) } : {}),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "as"),
            });
        };

    const Trigger = trigger("trigger", "Trigger", (api) =>
        api.getTriggerProps(),
    );

    /** A close trigger: it asks `onClose` before it closes, if the overlay has one. */
    const closeTrigger =
        (key: string, display: string) =>
        (props: DialogChromeTriggerProps): JSX.Element => {
            const { scope, api, requestClose, onClose } = context.use(display);
            return scope.render(name(key), {
                element: "button",
                as: () => props.as,
                machine: () =>
                    closeTriggerProps(
                        api().getCloseTriggerProps(),
                        onClose(),
                        requestClose,
                    ),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled", "as"),
            });
        };

    function Backdrop(props: DialogChromePartProps): JSX.Element {
        const {
            backdrop,
            api,
            presence,
            props: root,
        } = context.use("Backdrop");
        const modal = () => options.modal?.(root) ?? true;
        return backdrop!.render("root", {
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

    function Positioner(props: DialogChromePartProps): JSX.Element {
        const {
            scope,
            api,
            presence,
            props: root,
            setPositioner,
        } = context.use("Positioner");
        return scope.render(name("positioner"), {
            element: "div",
            ref: setPositioner,
            machine: () =>
                mergeProps(
                    api().getPositionerProps(),
                    normalizeProps.element(
                        options.positionerLayout(presence.present(), root),
                    ),
                ),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    function Content(props: DialogChromePartProps): JSX.Element {
        const { scope, api, presence, setSurface } = context.use("Content");
        const layout = options.contentLayout;
        return scope.render(name("content"), {
            element: "div",
            ref: setSurface,
            machine: () =>
                layout
                    ? mergeProps(
                          presentProps(
                              api().getContentProps(),
                              presence.present(),
                          ),
                          normalizeProps.element(layout),
                      )
                    : presentProps(api().getContentProps(), presence.present()),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    }

    return {
        context,
        Root,
        Trigger,
        Backdrop,
        Positioner,
        Content,
        part,
        trigger,
        closeTrigger,
    };
}

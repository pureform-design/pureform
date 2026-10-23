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
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    type RefObject,
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";

import { useControllable } from "./controllable";
import { useMachine } from "./machine";
import { createPartContext } from "./part-context";
import { useComponent } from "./parts";
import type { ComponentOf, ComponentScope } from "./parts";
import { usePresence } from "./presence";
import type { Presence } from "./presence";
import { omitProps } from "./props";
import type { PartProps } from "./props";
import { useDirection } from "./provider";

type Layout = Parameters<typeof normalizeProps.element>[0];

/** What a dialog-machine Root takes for the shared parts: `open`'s props, `testId`, `unstyled`
 *  and `as`. */
export interface DialogChromeRootProps extends Controllable<"open", boolean> {
    readonly testId?: TestIdOverride | undefined;
    readonly unstyled?: Unstyled | undefined;
    readonly as?: ElementType | undefined;
    readonly closeOnEscape?: boolean | undefined;
    readonly closeOnInteractOutside?: boolean | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface DialogChromePartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, and `as` to render a component instead of `<button>`. */
export interface DialogChromeTriggerProps extends DialogChromePartProps {
    readonly as?: ElementType | undefined;
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
    readonly rootProps: readonly (keyof P)[];
    readonly selection: (props: P) => Selection<ComponentOf<A>>;
    /** Zag's dialog props, besides `id`, `dir` and the controllable `open`. */
    readonly machineProps: (props: P) => object;
    /** Whether the backdrop renders. Always, by default. */
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
    readonly api: dialog.Api<PropTypes>;
    /** The latest API, for handlers set up once. */
    readonly latestApi: RefObject<dialog.Api<PropTypes>>;
    readonly presence: Presence;
    /** Root's props. */
    readonly props: P;
    readonly positioner: RefObject<HTMLElement | null>;
    readonly surface: RefObject<HTMLElement | null>;
    /** Asks `onClose` for every way the overlay closes by itself. */
    readonly asker: CloseAsker;
    /** Asks `onClose`, if the overlay has one, then closes on a yes. */
    readonly requestClose: () => void;
    /** Root's latest `onClose`, for handlers set up once. */
    readonly onClose: () => CloseQuestion | undefined;
}

/** Builds the shared parts of an overlay on Zag's dialog machine. */
export function dialogParts<
    A extends ComponentAnatomy,
    P extends DialogChromeRootProps,
>(options: DialogChromeOptions<A, P>) {
    const context = createPartContext<DialogChromeContext<A, P>>(options.name);
    const name = (part: string) => part as PartName<A>;
    const backdropAnatomy = options.backdropAnatomy;

    function Root(props: P): ReactNode {
        const id = useId();
        const dir = useDirection();
        const open = useControllable<"open", boolean>(
            options.name,
            "open",
            props,
        );
        const [asker] = useState(closeAsker);
        useEffect(() => () => asker.cancel(), [asker]);
        const latestApi = useRef<dialog.Api<PropTypes>>(null!);
        const latestProps = useRef(props);
        latestProps.current = props;
        const closeNow = useCallback(
            () => latestApi.current.setOpen(false),
            [],
        );
        const onClose = useCallback(
            () => options.onClose?.(latestProps.current),
            [],
        );
        const requestClose = useCallback(
            () => asker.ask(onClose(), closeNow, () => {}),
            [asker, onClose, closeNow],
        );
        const service = useMachine(dialog.machine, {
            id,
            dir,
            ...options.machineProps(props),
            ...askingDismissProps(
                options.onClose?.(props),
                { ...props, modal: options.modal?.(props) ?? true },
                asker,
                closeNow,
            ),
            ...open.machineProps,
        });
        const api = dialog.connect(service, normalizeProps);
        latestApi.current = api;
        const positioner = useRef<HTMLElement | null>(null);
        const surface = useRef<HTMLElement | null>(null);
        const presence = usePresence(api.open, (element) =>
            positioner.current
                ? stackPositioner(positioner.current, element)
                : undefined,
        );
        const scope = useComponent(options.anatomy, {
            selection: options.selection(props),
            testId: props.testId as TestIdOverride<PartName<A>> | undefined,
            unstyled: props.unstyled as Unstyled<PartName<A>> | undefined,
        });
        // The options are fixed per component, so this hook runs on every render or none.
        const backdrop = backdropAnatomy
            ? useComponent(backdropAnatomy, {
                  selection: {} as Selection<never>,
                  testId: partAsRoot<string>(props.testId, "backdrop"),
                  unstyled: partAsRoot<boolean>(props.unstyled, "backdrop"),
              })
            : undefined;
        const { as, ...rest } = omitProps(props, options.rootProps) as {
            as?: ElementType | undefined;
        };
        return (
            <context.Provider
                value={{
                    scope,
                    backdrop,
                    api,
                    latestApi,
                    presence,
                    props,
                    positioner,
                    surface,
                    asker,
                    requestClose,
                    onClose,
                }}
            >
                {scope.render(name("root"), {
                    element: "div",
                    as,
                    props: rest,
                })}
            </context.Provider>
        );
    }

    /** A part with the machine's props for it, if any. */
    const part =
        (
            key: string,
            display: string,
            element: ElementType,
            machine?: (api: dialog.Api<PropTypes>) => object,
        ) =>
        ({ unstyled, ...props }: DialogChromePartProps): ReactNode => {
            const { scope, api } = context.use(display);
            return scope.render(name(key), {
                element,
                ...(machine ? { machine: machine(api) } : {}),
                unstyled,
                props,
            });
        };

    /** A `<button>` part, or `as`, with the machine's props for it, if any. */
    const trigger =
        (
            key: string,
            display: string,
            machine?: (api: dialog.Api<PropTypes>) => object,
        ) =>
        ({ unstyled, as, ...props }: DialogChromeTriggerProps): ReactNode => {
            const { scope, api } = context.use(display);
            return scope.render(name(key), {
                element: "button",
                as: as as ElementType | undefined,
                ...(machine ? { machine: machine(api) } : {}),
                unstyled,
                props,
            });
        };

    const Trigger = trigger("trigger", "Trigger", (api) =>
        api.getTriggerProps(),
    );

    /** A close trigger: it asks `onClose` before it closes, if the overlay has one. */
    const closeTrigger =
        (key: string, display: string) =>
        ({ unstyled, as, ...props }: DialogChromeTriggerProps): ReactNode => {
            const { scope, api, requestClose, onClose } = context.use(display);
            const close = api.getCloseTriggerProps();
            return scope.render(name(key), {
                element: "button",
                as: as as ElementType | undefined,
                machine: closeTriggerProps(close, onClose(), requestClose),
                unstyled,
                props,
            });
        };

    function Backdrop({
        unstyled,
        ...props
    }: DialogChromePartProps): ReactNode {
        const {
            backdrop,
            api,
            presence,
            props: root,
        } = context.use("Backdrop");
        if (options.modal && !options.modal(root)) return null;
        return backdrop!.render("root", {
            element: "div",
            machine: mergeProps(
                api.getBackdropProps(),
                normalizeProps.element(dialogBackdropLayout(presence.present)),
            ),
            unstyled,
            props,
        });
    }

    function Positioner({
        unstyled,
        ...props
    }: DialogChromePartProps): ReactNode {
        const {
            scope,
            api,
            presence,
            props: root,
            positioner,
        } = context.use("Positioner");
        return scope.render(name("positioner"), {
            element: "div",
            ref: positioner,
            machine: mergeProps(
                api.getPositionerProps(),
                normalizeProps.element(
                    options.positionerLayout(presence.present, root),
                ),
            ),
            unstyled,
            props,
        });
    }

    function Content({ unstyled, ...props }: DialogChromePartProps): ReactNode {
        const { scope, api, presence, surface } = context.use("Content");
        const { ref: presenceRef } = presence;
        const ref = useCallback(
            (element: HTMLElement | null) => {
                surface.current = element;
                presenceRef(element);
            },
            [surface, presenceRef],
        );
        const machine = presentProps(api.getContentProps(), presence.present);
        return scope.render(name("content"), {
            element: "div",
            ref,
            machine: options.contentLayout
                ? mergeProps(
                      machine,
                      normalizeProps.element(options.contentLayout),
                  )
                : machine,
            unstyled,
            props,
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

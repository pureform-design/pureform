// The toast: a toaster (Zag's toast store) that the app calls, `toaster.success({ title: "Saved"
// })`, and the region that shows its toasts, stacked at a corner or edge of the screen. Group runs
// Zag's toast group machine over the store and renders each toast through its children; Root runs
// Zag's toast machine for one toast, with its icon, title, description, action and close button;
// the ready-made Toaster renders them all. Outside Material 3; Material's own message is the
// snackbar.

import { toastAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    isToastType,
    TOAST_STACK_STYLE,
    TOASTER_PROPS,
    toasterOptions,
    toastGroupStyle,
    toastSelection,
} from "@pureform/binding-core";
import type {
    InteractionSourceProps,
    ToasterOptions,
    ToasterOwnProps,
    ToastType,
} from "@pureform/binding-core";
import * as toast from "@pureform/machines/toast";
import type { JSX } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    omit,
    Show,
} from "solid-js";

import { CloseIcon, ToastIcon } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof toastAnatomy;

/** A toaster: Zag's toast store. Call `create`, `success`, `error`, `warning`, `info`, `loading`,
 *  `promise`, `update` and `dismiss` on it. */
export type ToastStore = toast.Store<JSX.Element>;

/** A new toaster, with pureform's defaults (bottom end, at most 3, 5 s each, stacked). */
export const createToaster = (options?: ToasterOptions): ToastStore =>
    toast.createStore(toasterOptions(options));

/** One toast's data, as Group hands it to its children. */
export type ToastData = toast.Props<JSX.Element>;

interface GroupContextValue {
    readonly service: toast.GroupService;
    readonly props: ToasterOwnProps;
}

interface ToastContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<toast.Api<PropTypes>>;
}

const groupContext = createPartContext<GroupContextValue>("Toast");
const context = createPartContext<ToastContextValue>("Toast");

/** Group's props: the toaster, the toasts' tokens, `testId` and `unstyled` for every part, the
 *  region's `label`, the element's own props, and a function rendering each toast. */
export interface ToastGroupProps
    extends
        Omit<PartProps, keyof ToasterOwnProps | "children">,
        ToasterOwnProps {
    readonly toaster: ToastStore;
    readonly children: (
        toast: Accessor<ToastData>,
        index: Accessor<number>,
    ) => JSX.Element;
}

/** The region the toasts stack in: Zag places it at the toaster's placement. */
function Group(props: ToastGroupProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const service = useMachine(toast.group.machine, () => ({
        id,
        dir: dir(),
        store: props.toaster,
    }));
    const api = createMemo(() => toast.group.connect(service, normalizeProps));
    const scope = useComponent(toastAnatomy, {
        selection: () => toastSelection(undefined, props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
    });
    return (
        <groupContext.Provider value={{ service, props }}>
            {scope.render("group", {
                element: "div",
                machine: () => {
                    const machine = api().getGroupProps({ label: props.label });
                    return {
                        ...machine,
                        style: toastGroupStyle(
                            machine.style as JSX.CSSProperties,
                        ),
                    };
                },
                props: {
                    ...omit(props, "toaster", "children", ...TOASTER_PROPS),
                    get children() {
                        return (
                            <For
                                each={api().getToasts() as ToastData[]}
                                keyed={(item: ToastData) => item.id}
                            >
                                {(item, index) => props.children(item, index)}
                            </For>
                        );
                    },
                },
            })}
        </groupContext.Provider>
    );
}

/** Root's props: the toast's data and its place in the group, and the element's own props. */
export interface ToastRootProps extends PartProps {
    readonly toast: ToastData;
    readonly index: number;
}

/** One toast, on Zag's toast machine: it closes after its duration (held while the pointer is
 *  over the group or focus is in it), by its action, its close button, or Escape. */
function Root(props: ToastRootProps): JSX.Element {
    const group = groupContext.use("Root");
    const dir = useDirection();
    const service = useMachine(toast.machine, () => ({
        ...props.toast,
        dir: dir(),
        index: props.index,
        parent: group.service,
    }));
    const api = createMemo(() => toast.connect(service, normalizeProps));
    const scope = useComponent(toastAnatomy, {
        selection: () => toastSelection(api().type, group.props),
        testId: () => group.props.testId,
        unstyled: () => group.props.unstyled,
        indication: () => group.props.indication,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                machine: () => {
                    const machine = api().getRootProps();
                    return {
                        ...machine,
                        style: {
                            ...(machine.style as JSX.CSSProperties),
                            ...TOAST_STACK_STYLE,
                            "z-index": "var(--z-index)",
                        },
                    };
                },
                props: {
                    ...omit(props, "toast", "index"),
                    get children() {
                        return (
                            <>
                                <div {...api().getGhostBeforeProps()} />
                                {props.children}
                                <div {...api().getGhostAfterProps()} />
                            </>
                        );
                    },
                },
            })}
        </context.Provider>
    );
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface ToastPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon, in the type's color. */
function Icon(props: ToastPartProps): JSX.Element {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The title, which names the toast. */
function Title(props: ToastPartProps): JSX.Element {
    const { scope, api } = context.use("Title");
    return scope.render("title", {
        element: "div",
        machine: () => api().getTitleProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The description, which describes it. */
function Description(props: ToastPartProps): JSX.Element {
    const { scope, api } = context.use("Description");
    return scope.render("description", {
        element: "div",
        machine: () => api().getDescriptionProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** A button's props: a part's, and the interaction source its presses are emitted to. */
export interface ToastButtonProps
    extends ToastPartProps, InteractionSourceProps {}

const toastButton = (part: "actionTrigger" | "closeTrigger", name: string) =>
    function ToastButton(props: ToastButtonProps): JSX.Element {
        const { scope, api } = context.use(name);
        const source = useOwnInteractionSource(() => props.interactionSource);
        const handlers = useInteractionHandlers(source, () => false);
        return scope.render(part, {
            element: "button",
            interactionSource: source,
            machine: () =>
                combinePartProps([
                    (part === "actionTrigger"
                        ? api().getActionTriggerProps()
                        : api().getCloseTriggerProps()) as Readonly<
                        Record<string, unknown>
                    >,
                    handlers(),
                ]),
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled", "interactionSource"),
        });
    };

/** The action, a text button: it runs the toast's `action.onClick`, then the toast closes. */
const ActionTrigger = toastButton("actionTrigger", "ActionTrigger");

/** The close button, an icon button. */
const CloseTrigger = toastButton("closeTrigger", "CloseTrigger");

/** The ready-made toaster's props: Group's, with `class`, `style` and `slotProps` keyed by part,
 *  and no children. */
export interface ToasterProps
    extends
        Omit<ToastGroupProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

/** The ready-made toaster: each toast with its type's icon, its title, description, action
 *  (when it has one) and close button (unless `closable: false`). */
function Toaster(props: ToasterProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, "class", "style", "slotProps") as Omit<
        ToastGroupProps,
        "children"
    >;
    return (
        <Group {...own} {...(slots("group") as object)}>
            {(item, index) => (
                <Root
                    toast={item()}
                    index={index()}
                    {...(slots("root") as object)}
                >
                    <Icon {...slots("icon")}>
                        <ToastIcon
                            type={
                                isToastType(item().type)
                                    ? (item().type as ToastType)
                                    : "info"
                            }
                        />
                    </Icon>
                    <Show when={isPresent(item().title)}>
                        <Title {...slots("title")}>{item().title}</Title>
                    </Show>
                    <Show when={isPresent(item().description)}>
                        <Description {...slots("description")}>
                            {item().description}
                        </Description>
                    </Show>
                    <Show when={item().action}>
                        <ActionTrigger {...slots("actionTrigger")}>
                            {item().action?.label}
                        </ActionTrigger>
                    </Show>
                    <Show when={item().closable !== false}>
                        <CloseTrigger
                            aria-label={props.closeLabel ?? "Dismiss"}
                            {...slots("closeTrigger")}
                        >
                            <CloseIcon />
                        </CloseTrigger>
                    </Show>
                </Root>
            )}
        </Group>
    );
}

/** A notification outside Material 3: `const toaster = createToaster()`, `<Toaster
 *  toaster={toaster} />`, then `toaster.success({ title: "Saved" })`. Compose its parts under
 *  `Toast.Group`: `Root`, `Icon`, `Title`, `Description`, `ActionTrigger` and `CloseTrigger`. */
export const Toast = Object.assign(Toaster, {
    Group,
    Root,
    Icon,
    Title,
    Description,
    ActionTrigger,
    CloseTrigger,
});

export { Toaster };

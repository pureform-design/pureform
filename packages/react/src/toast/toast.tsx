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
} from "@pureform/binding-core";
import * as toast from "@pureform/machines/toast";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type CSSProperties, type ReactNode, useId } from "react";

import { CloseIcon, ToastIcon } from "../glyphs";
import {
    useInteractionHandlers,
    useOwnInteractionSource,
} from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof toastAnatomy;

/** A toaster: Zag's toast store. Call `create`, `success`, `error`, `warning`, `info`, `loading`,
 *  `promise`, `update` and `dismiss` on it. */
export type ToastStore = toast.Store<ReactNode>;

/** A new toaster, with pureform's defaults (bottom end, at most 3, 5 s each, stacked). Make it once
 *  (outside a component, or in `useState`). */
export const createToaster = (options?: ToasterOptions): ToastStore =>
    toast.createStore(toasterOptions(options));

/** One toast's data, as Group hands it to its children. */
export type ToastData = toast.Props<ReactNode>;

interface GroupContextValue {
    readonly service: toast.GroupService;
    readonly props: ToasterOwnProps;
}

interface ToastContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: toast.Api<PropTypes>;
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
    readonly children: (toast: ToastData, index: number) => ReactNode;
}

/** The region the toasts stack in: Zag places it at the toaster's placement. */
function Group(props: ToastGroupProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const service = useMachine(toast.group.machine, {
        id,
        dir,
        store: props.toaster,
    });
    const api = toast.group.connect(service, normalizeProps);
    const group = api.getGroupProps({ label: props.label }) as {
        style?: CSSProperties;
    };
    const scope = useComponent(toastAnatomy, {
        selection: toastSelection(undefined, props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
    });
    const {
        toaster: _toaster,
        children,
        ...rest
    } = omitProps(props, TOASTER_PROPS);
    return (
        <groupContext.Provider value={{ service, props }}>
            {scope.render("group", {
                element: "div",
                machine: {
                    ...group,
                    style: toastGroupStyle(group.style),
                },
                props: {
                    ...rest,
                    children: (api.getToasts() as ToastData[]).map(
                        (item, index) => children(item, index),
                    ),
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
 *  over the group or focus is in it), by its action, its close button, or Escape. Give it a `key`
 *  (the toast's id). */
function Root({
    toast: data,
    index,
    children,
    ...props
}: ToastRootProps): ReactNode {
    const group = groupContext.use("Root");
    const dir = useDirection();
    const service = useMachine(toast.machine, {
        ...data,
        dir,
        index,
        parent: group.service,
    });
    const api = toast.connect(service, normalizeProps);
    const scope = useComponent(toastAnatomy, {
        selection: toastSelection(api.type, group.props),
        testId: group.props.testId,
        unstyled: group.props.unstyled,
        indication: group.props.indication,
    });
    const machine = api.getRootProps() as { style?: CSSProperties };
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "div",
                machine: {
                    ...machine,
                    style: {
                        ...machine.style,
                        ...TOAST_STACK_STYLE,
                        zIndex: "var(--z-index)",
                    },
                },
                props: {
                    ...props,
                    children: (
                        <>
                            <div {...api.getGhostBeforeProps()} />
                            {children}
                            <div {...api.getGhostAfterProps()} />
                        </>
                    ),
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
function Icon({ unstyled, ...props }: ToastPartProps): ReactNode {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        unstyled,
        props,
    });
}

/** The title, which names the toast. */
function Title({ unstyled, ...props }: ToastPartProps): ReactNode {
    const { scope, api } = context.use("Title");
    return scope.render("title", {
        element: "div",
        machine: api.getTitleProps(),
        unstyled,
        props,
    });
}

/** The description, which describes it. */
function Description({ unstyled, ...props }: ToastPartProps): ReactNode {
    const { scope, api } = context.use("Description");
    return scope.render("description", {
        element: "div",
        machine: api.getDescriptionProps(),
        unstyled,
        props,
    });
}

/** A button's props: a part's, and the interaction source its presses are emitted to. */
export interface ToastButtonProps
    extends ToastPartProps, InteractionSourceProps {}

const toastButton = (part: "actionTrigger" | "closeTrigger", name: string) =>
    function ToastButton({
        unstyled,
        interactionSource,
        ...props
    }: ToastButtonProps): ReactNode {
        const { scope, api } = context.use(name);
        const source = useOwnInteractionSource(interactionSource);
        const handlers = useInteractionHandlers(source, false);
        return scope.render(part, {
            element: "button",
            interactionSource: source,
            machine: combinePartProps([
                (part === "actionTrigger"
                    ? api.getActionTriggerProps()
                    : api.getCloseTriggerProps()) as Readonly<
                    Record<string, unknown>
                >,
                handlers,
            ]),
            unstyled,
            props,
        });
    };

/** The action, a text button: it runs the toast's `action.onClick`, then the toast closes. */
const ActionTrigger = toastButton("actionTrigger", "ActionTrigger");

/** The close button, an icon button. */
const CloseTrigger = toastButton("closeTrigger", "CloseTrigger");

/** The ready-made toaster's props: Group's, with `className`, `style` and `slotProps` keyed by
 *  part, and no children. */
export interface ToasterProps
    extends
        Omit<ToastGroupProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

/** The ready-made toaster: each toast with its type's icon, its title, description, action
 *  (when it has one) and close button (unless `closable: false`). */
function Toaster(props: ToasterProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...groupProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Group {...groupProps} {...(slot("group") as object)}>
            {(item, index) => (
                <Root
                    key={item.id}
                    toast={item}
                    index={index}
                    {...(slot("root") as object)}
                >
                    <Icon {...slot("icon")}>
                        <ToastIcon
                            type={isToastType(item.type) ? item.type : "info"}
                        />
                    </Icon>
                    {isPresent(item.title) ? (
                        <Title {...slot("title")}>{item.title}</Title>
                    ) : null}
                    {isPresent(item.description) ? (
                        <Description {...slot("description")}>
                            {item.description}
                        </Description>
                    ) : null}
                    {item.action ? (
                        <ActionTrigger {...slot("actionTrigger")}>
                            {item.action.label}
                        </ActionTrigger>
                    ) : null}
                    {item.closable !== false ? (
                        <CloseTrigger
                            aria-label={props.closeLabel ?? "Dismiss"}
                            {...slot("closeTrigger")}
                        >
                            <CloseIcon />
                        </CloseTrigger>
                    ) : null}
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

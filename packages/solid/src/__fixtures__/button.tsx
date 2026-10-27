// An example component built on the binding core, as the components phase will write them: a
// button wired from its anatomy to its machine to the registry. The specs use it with a fake
// registry.

import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { buttonAnatomy } from "@pureform/anatomy";
import * as button from "@pureform/machines/button";
import type { ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createMemo,
    createUniqueId,
    omit,
    useContext,
} from "solid-js";

import { slotPartProps, useComponent, useControllable, useDirection } from "..";
import type {
    ComponentScope,
    Controllable,
    PartProps,
    SlotKeyedProps,
    Unstyled,
} from "..";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";

type Anatomy = typeof buttonAnatomy;

const ButtonContext = createContext<{
    scope: ComponentScope<Anatomy>;
    api: Accessor<button.Api<PropTypes>>;
}>();

export interface RootProps
    extends PartProps, Controllable<"selected", boolean> {
    variant?: "filled" | "text" | undefined;
    tokens?: { radius?: string | undefined } | undefined;
    disabled?: boolean | undefined;
    as?: ValidComponent | undefined;
    testId?: TestIdOverride<PartName<Anatomy>> | undefined;
    unstyled?: Unstyled<PartName<Anatomy>> | undefined;
}

const ROOT_PROPS = [
    "variant",
    "tokens",
    "disabled",
    "as",
    "testId",
    "unstyled",
    "selected",
    "defaultSelected",
    "onSelectedChange",
] as const;

export function Root(props: RootProps) {
    const id = createUniqueId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, () => ({
        id,
        dir: dir(),
        disabled: props.disabled,
        ...selected.machineProps(),
    }));
    const api = createMemo(() => button.connect(service, normalizeProps));
    const scope = useComponent(buttonAnatomy, {
        selection: () => ({ variant: props.variant, tokens: props.tokens }),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const rest = omit(props, ...ROOT_PROPS);
    return (
        <ButtonContext value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().pressed }),
                props: rest,
            })}
        </ButtonContext>
    );
}

export interface PartComponentProps extends PartProps {
    unstyled?: boolean | undefined;
}

export function Label(props: PartComponentProps) {
    const { scope, api } = useContext(ButtonContext);
    const rest = omit(props, "unstyled");
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

export function Icon(
    props: PartComponentProps & { mirror?: boolean | undefined },
) {
    const { scope, api } = useContext(ButtonContext);
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The ready-made button: Root and Label, addressed by slot-keyed props. */
export function Button(
    props: SlotKeyedProps<Anatomy> & {
        label: string;
        variant?: "filled" | "text";
    },
) {
    return (
        <Root
            variant={props.variant}
            testId={props.testId}
            unstyled={props.unstyled}
            {...slotPartProps(props, "root")}
        >
            <Label {...slotPartProps(props, "label")}>{props.label}</Label>
        </Root>
    );
}

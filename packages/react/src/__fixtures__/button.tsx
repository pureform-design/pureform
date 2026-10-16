// An example component built on the binding core, as the components phase will write them: a
// button wired from its anatomy to its machine to the registry. The specs use it with a fake
// registry.

import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { buttonAnatomy } from "@pureform/anatomy";
import * as button from "@pureform/machines/button";
import { normalizeProps, useMachine } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    createContext,
    type ElementType,
    type ReactNode,
    use,
    useId,
} from "react";

import { slotPartProps, useComponent, useControllable, useDirection } from "..";
import type {
    ComponentScope,
    Controllable,
    PartProps,
    SlotKeyedProps,
    Unstyled,
} from "..";

type Anatomy = typeof buttonAnatomy;

const ButtonContext = createContext<{
    scope: ComponentScope<Anatomy>;
    api: button.Api<PropTypes>;
} | null>(null);

const useButton = () => {
    const context = use(ButtonContext);
    if (!context) throw new Error("Button parts go inside Button.Root");
    return context;
};

export interface RootProps
    extends PartProps, Controllable<"selected", boolean> {
    variant?: "filled" | "text" | undefined;
    tokens?: { radius?: string | undefined } | undefined;
    disabled?: boolean | undefined;
    as?: ElementType | undefined;
    testId?: TestIdOverride<PartName<Anatomy>> | undefined;
    unstyled?: Unstyled<PartName<Anatomy>> | undefined;
}

export function Root(props: RootProps): ReactNode {
    const {
        variant,
        tokens,
        disabled,
        as,
        testId,
        unstyled,
        selected: _selected,
        defaultSelected: _defaultSelected,
        onSelectedChange: _onSelectedChange,
        ...rest
    } = props;
    const id = useId();
    const dir = useDirection();
    const selected = useControllable("Button", "selected", props);
    const service = useMachine(button.machine, {
        id,
        dir,
        disabled,
        ...selected.machineProps,
    });
    const api = button.connect(service, normalizeProps);
    const scope = useComponent(buttonAnatomy, {
        selection: { variant, tokens },
        testId,
        unstyled,
    });
    return (
        <ButtonContext value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </ButtonContext>
    );
}

export interface PartComponentProps extends PartProps {
    unstyled?: boolean | undefined;
}

export function Label({ unstyled, ...props }: PartComponentProps): ReactNode {
    const { scope, api } = useButton();
    return scope.render("label", {
        element: "span",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

export function Icon({
    unstyled,
    mirror,
    ...props
}: PartComponentProps & { mirror?: boolean | undefined }): ReactNode {
    const { scope, api } = useButton();
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The ready-made button: Root and Label, addressed by slot-keyed props. */
export function Button(
    props: SlotKeyedProps<Anatomy> & {
        label: string;
        variant?: "filled" | "text";
    },
): ReactNode {
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

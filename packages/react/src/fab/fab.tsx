// The FAB: Root on the button machine (press and focus; a FAB doesn't toggle), its TouchTarget,
// Container, Icon, and Label parts, and the ready-made Fab over them, which is extended when it
// has a label.

import { fabAnatomy } from "@pureform/anatomy";
import {
    FAB_ROOT_PROPS,
    fabMachineProps,
    fabSelection,
    hasAccessibleName,
    isPresent,
    missingNameMessage,
    warnOnce,
} from "@pureform/binding-core";
import type {
    FabContentProps,
    FabRootOwnProps,
    IconOnlyName,
} from "@pureform/binding-core";
import type * as button from "@pureform/machines/button";
import type { PropTypes } from "@zag-js/react";
import type { ElementType, ReactNode } from "react";

import { isDev } from "../env";
import { createPartContext } from "../part-context";
import { slotPartProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePressable } from "../pressable";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof fabAnatomy;

/** What Root shares with its parts. */
interface FabContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: button.Api<PropTypes>;
}

const context = createPartContext<FabContextValue>("Fab");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `type`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface FabRootProps
    extends Omit<PartProps, keyof FabRootOwnProps>, FabRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface FabPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The icon's props: a part's, and `mirror` to flip a pointing icon under right to left. */
export interface FabIconProps extends FabPartProps {
    readonly mirror?: boolean | undefined;
}

/** The FAB's root: a native `<button>` that runs the machine and shares it with its parts. */
function Root(props: FabRootProps): ReactNode {
    const { api, source } = usePressable(
        "Fab",
        { interactionSource: props.interactionSource },
        fabMachineProps(props),
    );
    const scope = useComponent(fabAnatomy, {
        selection: fabSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication: props.indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, FAB_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as,
                machine: api.getRootProps(),
                states: { pressed: api.pressed },
                props: rest,
            })}
        </context.Provider>
    );
}

/** The 48px touch target around a small FAB. Empty. */
function TouchTarget({ unstyled, ...props }: FabPartProps): ReactNode {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The container, which takes the fill, the shape, and the elevation, and holds the icon and
 *  label. */
function Container({ unstyled, ...props }: FabPartProps): ReactNode {
    const { scope } = context.use("Container");
    return scope.render("container", { element: "span", unstyled, props });
}

/** The icon's box, hidden from assistive technology. */
function Icon({ unstyled, mirror, ...props }: FabIconProps): ReactNode {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: api.getIconProps(),
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The extended FAB's text. */
function Label({ unstyled, ...props }: FabPartProps): ReactNode {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: api.getLabelProps(),
        unstyled,
        props,
    });
}

/** The ready-made FAB's props: Root's, with `className`, `style`, and `slotProps` keyed by part,
 *  the icon and label as content, and an accessible name when there's no label. */
export type FabProps = Omit<
    FabRootProps,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    FabContentProps<ReactNode> &
    ({ readonly label: ReactNode } | IconOnlyName);

/** The ready-made FAB: Root, its touch target, and the container holding the icon and, when
 *  given, the label, which makes it extended. */
function ReadyMade(props: FabProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        icon,
        label,
        mirrorIcon,
        extended,
        ...rootProps
    } = props;
    const hasLabel = isPresent(label);
    if (isDev && !hasLabel && !hasAccessibleName(props)) {
        warnOnce(missingNameMessage("Fab"));
    }
    return (
        <Root
            {...rootProps}
            {...slotPartProps(props, "root")}
            extended={extended ?? hasLabel}
        >
            <TouchTarget {...slotPartProps(props, "touchTarget")} />
            <Container {...slotPartProps(props, "container")}>
                <Icon mirror={mirrorIcon} {...slotPartProps(props, "icon")}>
                    {icon}
                </Icon>
                {hasLabel ? (
                    <Label {...slotPartProps(props, "label")}>{label}</Label>
                ) : null}
            </Container>
        </Root>
    );
}

/** Material's floating action button. Use it ready-made, `<Fab icon={<EditIcon />}
 *  aria-label="Compose" />` or `<Fab icon={<EditIcon />} label="Compose" />` (extended), or
 *  compose its parts under `Fab.Root`: `TouchTarget` and `Container` holding `Icon` and
 *  `Label`. */
export const Fab = Object.assign(ReadyMade, {
    Root,
    TouchTarget,
    Container,
    Icon,
    Label,
});

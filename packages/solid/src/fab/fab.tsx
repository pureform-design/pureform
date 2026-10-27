// The FAB: Root on the button machine (press and focus; a FAB doesn't toggle), its TouchTarget,
// Container, Icon, and Label parts, and the ready-made Fab over them, which is extended when it
// has a label.

import { fabAnatomy } from "@pureform/anatomy";
import {
    FAB_CONTENT_PROPS,
    FAB_ROOT_PROPS,
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
import { fabMachineProps } from "@pureform/binding-web";
import type * as button from "@pureform/machines/button";
import { isDev } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, createMemo, omit, Show, untrack } from "solid-js";

import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePressable } from "../pressable";
import type { PartProps } from "../props";

type Anatomy = typeof fabAnatomy;

/** What Root shares with its parts. */
interface FabContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<button.Api<PropTypes>>;
}

const context = createPartContext<FabContextValue>("Fab");

/** Root's props: the variants and tokens, the machine's props (`disabled`, `type`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface FabRootProps
    extends Omit<PartProps, keyof FabRootOwnProps>, FabRootOwnProps {
    /** Another element or component to render instead of `<button>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: FabRootProps): JSX.Element {
    const { api, source } = usePressable("Fab", props, () =>
        fabMachineProps(props),
    );
    const scope = useComponent(fabAnatomy, {
        selection: () => fabSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication: () => props.indication,
        interactionSource: source,
    });
    return (
        <context.Provider value={{ scope, api }}>
            {scope.render("root", {
                element: "button",
                as: () => props.as,
                machine: () => api().getRootProps(),
                states: () => ({ pressed: api().pressed }),
                props: omit(props, "as", ...FAB_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The 48px touch target around a small FAB. Empty. */
function TouchTarget(props: FabPartProps): JSX.Element {
    const { scope } = context.use("TouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The container, which takes the fill, the shape, and the elevation, and holds the icon and
 *  label. */
function Container(props: FabPartProps): JSX.Element {
    const { scope } = context.use("Container");
    return scope.render("container", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The icon's box, hidden from assistive technology. */
function Icon(props: FabIconProps): JSX.Element {
    const { scope, api } = context.use("Icon");
    return scope.render("icon", {
        element: "span",
        machine: () => api().getIconProps(),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The extended FAB's text. */
function Label(props: FabPartProps): JSX.Element {
    const { scope, api } = context.use("Label");
    return scope.render("label", {
        element: "span",
        machine: () => api().getLabelProps(),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made FAB's props: Root's, with `class`, `style`, and `slotProps` keyed by part, the
 *  icon and label as content, and an accessible name when there's no label. */
export type FabProps = Omit<
    FabRootProps,
    keyof SlotKeyedProps<Anatomy> | "children"
> &
    SlotKeyedProps<Anatomy> &
    FabContentProps<JSX.Element> &
    ({ readonly label: JSX.Element } | IconOnlyName);

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...FAB_CONTENT_PROPS,
] as const;

/** The ready-made FAB: Root, its touch target, and the container holding the icon and, when
 *  given, the label, which makes it extended. */
function ReadyMade(props: FabProps): JSX.Element {
    const hasLabel = createMemo(() => isPresent(props.label));
    if (
        isDev &&
        !untrack(hasLabel) &&
        !untrack(() => hasAccessibleName(props))
    ) {
        warnOnce(missingNameMessage("Fab"));
    }
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as FabRootProps;
    // The root's slot props are an element's, whose `id` also takes `false`.
    const root = slots("root") as object;
    const touchTarget = slots("touchTarget");
    const container = slots("container");
    const icon = slots("icon");
    const label = slots("label");
    return (
        <Root {...own} {...root} extended={props.extended ?? hasLabel()}>
            <TouchTarget {...touchTarget} />
            <Container {...container}>
                <Icon mirror={props.mirrorIcon} {...icon}>
                    {props.icon}
                </Icon>
                <Show when={hasLabel()}>
                    <Label {...label}>{props.label}</Label>
                </Show>
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

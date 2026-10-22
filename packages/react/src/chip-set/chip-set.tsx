// The chip set: Root, a row of chips (`chipSetAnatomy`) that wraps or scrolls on one line, on Zag's
// toggle group when selectable; its Chip, a chip in the set's variants and selection; and the
// ready-made ChipSet over them.

import { chipSetAnatomy } from "@pureform/anatomy";
import {
    buttonGroupRootProps,
    toggleGroupItemProps,
    CHIP_SET_ROOT_PROPS,
    chipSetChipVariants,
    chipSetMachineProps,
    chipSetSelection,
} from "@pureform/binding-core";
import type {
    ChipSetContentProps,
    ChipSetItem,
    ChipSetRootOwnProps,
} from "@pureform/binding-core";
import * as toggleGroup from "@pureform/machines/button-group";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { Chip } from "../chip/chip";
import type { ChipProps } from "../chip/chip";
import { useControllable } from "../controllable";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its chips. */
interface ChipSetContextValue {
    readonly api: toggleGroup.Api<PropTypes>;
    readonly props: ChipSetRootProps;
}

const context = createPartContext<ChipSetContextValue>("ChipSet");

/** Root's props: the set's `singleLine` and `setTokens`, the chips' variants, the selection
 *  (`selectable`, `value`, …), `testId`, `as`, and the element's own props. Name the set with
 *  `aria-label` or `aria-labelledby`. */
export interface ChipSetRootProps
    extends Omit<PartProps, keyof ChipSetRootOwnProps>, ChipSetRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A chip in the set: a chip's props, and its value in a selectable set. */
export type ChipSetChipProps = Omit<ChipProps, "value"> & {
    readonly value?: string | undefined;
};

/** The set's root, a `<div role="group">` that runs the toggle group when selectable. */
function Root(props: ChipSetRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>("ChipSet", "value", props);
    const service = useMachine(toggleGroup.machine, {
        id: props.id ?? id,
        dir,
        ...chipSetMachineProps(props),
        ...value.machineProps,
    });
    const api = toggleGroup.connect(service, normalizeProps);
    const scope = useComponent(chipSetAnatomy, {
        selection: chipSetSelection(props),
        testId: props.testId,
    });
    const { as, ...rest } = omitProps(props, CHIP_SET_ROOT_PROPS);
    return (
        <context.Provider value={{ api, props }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: props.selectable
                    ? buttonGroupRootProps(api.getRootProps())
                    : { role: "group" },
                props: rest,
            })}
        </context.Provider>
    );
}

/** A chip in the set, in its variants and, given a `value` in a selectable set, a filter chip
 *  on the set's selection. */
function SetChip({ value, ...props }: ChipSetChipProps): ReactNode {
    const { api, props: set } = context.use("Chip");
    const own = {
        ...props,
        ...chipSetChipVariants(set, props),
        disabled: props.disabled || set.disabled,
    };
    if (!set.selectable || value === undefined) {
        return <Chip {...(own as ChipProps)} />;
    }
    const item = { value, disabled: props.disabled };
    return (
        <Chip
            {...(own as ChipProps)}
            {...(toggleGroupItemProps(api, item) as object)}
        />
    );
}

/** The ready-made set's props: Root's and the chips as data. */
export interface ChipSetProps
    extends
        Omit<ChipSetRootProps, "children">,
        ChipSetContentProps<ReactNode> {}

/** The ready-made set: a chip per item, a filter chip in a selectable set. */
function ReadyMade({ items = [], ...props }: ChipSetProps): ReactNode {
    const one = (item: ChipSetItem<ReactNode>, index: number) => ({
        value: item.value ?? (props.selectable ? String(index) : undefined),
        label: item.label,
        icon: item.icon,
        trailingIcon: item.trailingIcon,
        disabled: item.disabled,
        onClick: item.onClick,
        testId: item.testId,
        interactionSource: item.interactionSource,
    });
    return (
        <Root {...props}>
            {items.map((item, index) => (
                <SetChip
                    key={item.value ?? index}
                    {...(one(item, index) as object)}
                />
            ))}
        </Root>
    );
}

/** A set of Material chips. Use it ready-made, `<ChipSet selectable="multiple"
 *  aria-label="Filters" items={[{ label: "Vegan" }, { label: "Nut free" }]} />`, or compose it:
 *  `ChipSet.Root` holding `ChipSet.Chip`s, each with its `value` in a selectable set. */
export const ChipSet = Object.assign(ReadyMade, { Root, Chip: SetChip });

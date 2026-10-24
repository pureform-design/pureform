// The accordion: a column of items, each a tile holding its header (a pressable row: an optional
// leading icon, the title over an optional description, and the expand indicator, which turns over
// while the item is expanded) and, while expanded, its content. React Native has no Zag machine:
// the expanded items are React state, and each header says it's expanded to assistive technology.

import { accordionAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { accordionSelection, isPresent } from "@pureform/binding-core";
import type {
    AccordionBehaviorProps,
    AccordionInstances,
    AccordionItem,
    AccordionItemInstance,
    AccordionPart,
    AccordionVariantProps,
    IndicationProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { Expanding } from "../expand";
import { iconParts, ownText } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps, PartSlots } from "../slot-props";
import { useComponentSlots } from "../styles";

const [INDICATION] = accordionAnatomy.indication!;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface AccordionHosts {
    readonly leading: "View";
    readonly indicator: "View";
    readonly item: "View";
    readonly trigger: "Pressable";
    readonly text: "View";
    readonly title: "Text";
    readonly description: "Text";
    readonly content: "View";
    readonly root: "View";
}

/** The accordion's props, with `style` and `slotProps` keyed by part (an item's parts also by
 *  item, `AccordionItemInstance`). */
export interface AccordionProps
    extends
        AccordionVariantProps,
        Omit<AccordionBehaviorProps, "id" | "ids">,
        IndicationProps,
        NativeSlotProps<AccordionHosts, AccordionInstances<ReactNode>> {
    readonly items: readonly AccordionItem<ReactNode>[];
    readonly testId?: TestIdOverride<AccordionPart> | undefined;
}

interface ItemProps {
    /** The accordion's per-part props. */
    readonly slot: PartSlots;
    readonly item: AccordionItem<ReactNode>;
    readonly index: number;
    readonly selection: AccordionVariantProps;
    readonly expanded: boolean;
    readonly disabled: boolean;
    readonly onToggle: () => void;
    readonly indication: AccordionProps["indication"];
    readonly testId: AccordionProps["testId"];
}

const ITEM_PARTS = [
    "item",
    "trigger",
    "leading",
    "text",
    "title",
    "description",
    "indicator",
    "content",
] as const;

// The accordion's per-part props for one item: each part's function of the copy gets the item.
const forItem = (
    slot: PartSlots,
    instance: () => AccordionItemInstance<ReactNode>,
): PartSlots => {
    if (!ITEM_PARTS.some((part) => slot.each(part))) return slot;
    const each = instance();
    return {
        props: (part) => slot.props(part, each),
        style: (part, own) => slot.style(part, own, each),
        on: (part, name, own) => slot.on(part, name, own, each),
        with: (part, own) => slot.with(part, own, each),
        each: slot.each,
    };
};

function Item(props: ItemProps): ReactNode {
    const { item } = props;
    const indication = useSurfaceIndication(INDICATION!, {
        indication: props.indication,
        interactionSource: item.interactionSource,
        disabled: props.disabled,
    });
    const slots = useComponentSlots<AccordionPart>(
        "accordion",
        indication.select(accordionSelection(props.selection)),
        indication.states({
            expanded: props.expanded,
            ...(props.disabled ? { disabled: true } : {}),
            ...(item.mirrorLeading ? { mirrored: true } : {}),
        }),
    );
    const { styles: s, selected, views: v } = slots;
    const id = (part: AccordionPart) =>
        testIdOf(accordionAnatomy, part, props.testId);
    const slot = forItem(props.slot, () => ({
        index: props.index,
        item,
        expanded: props.expanded,
    }));
    const icon = iconParts(slots, id, slot);
    return (
        <v.item.View
            {...slot.props("item")}
            style={slot.style("item", s.item)}
            testID={id("item")}
        >
            <v.trigger.Pressable
                {...slot.props("trigger")}
                {...slot.with("trigger", indication.handlers)}
                role="button"
                aria-expanded={props.expanded}
                onPress={slot.on("trigger", "onPress", props.onToggle)}
                disabled={props.disabled}
                style={slot.style("trigger", withUnselectable(s.trigger))}
                testID={id("trigger")}
            >
                {icon("leading", item.leading)}
                <v.text.View
                    {...slot.props("text")}
                    style={slot.style("text", s.text)}
                    testID={id("text")}
                >
                    <v.title.Text
                        {...slot.props("title")}
                        selectable={false}
                        style={slot.style("title", s.title)}
                        testID={id("title")}
                    >
                        {item.title}
                    </v.title.Text>
                    {isPresent(item.description) ? (
                        <v.description.Text
                            {...slot.props("description")}
                            selectable={false}
                            style={slot.style("description", s.description)}
                            testID={id("description")}
                        >
                            {item.description}
                        </v.description.Text>
                    ) : null}
                </v.text.View>
                {icon("indicator", "⌄")}
                {indication.layer(selected)}
            </v.trigger.Pressable>
            <Expanding open={props.expanded}>
                <v.content.View
                    {...slot.props("content")}
                    style={slot.style("content", s.content)}
                    testID={id("content")}
                >
                    {typeof item.content === "string" ? (
                        <v.content.Text style={ownText(s.content)}>
                            {item.content}
                        </v.content.Text>
                    ) : (
                        item.content
                    )}
                </v.content.View>
            </Expanding>
        </v.item.View>
    );
}

function AccordionImpl(props: AccordionProps): ReactNode {
    const slot = nativeSlots(props);
    const [value, setValue] = useControllable<"value", string[]>(
        "Accordion",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        [],
    );
    const { styles: s, views: v } = useComponentSlots<AccordionPart>(
        "accordion",
        accordionSelection(props),
    );
    const collapsible = props.collapsible ?? true;
    const toggle = (item: string) => {
        if (value.includes(item)) {
            if (collapsible || value.length > 1)
                setValue(value.filter((open) => open !== item));
            return;
        }
        setValue(props.multiple ? [...value, item] : [item]);
    };
    return (
        <v.root.View
            {...slot.props("root")}
            style={slot.style("root", s.root)}
            testID={testIdOf(accordionAnatomy, "root", props.testId)}
        >
            {props.items.map((item, index) => (
                <Item
                    slot={slot}
                    key={item.value}
                    item={item}
                    index={index}
                    selection={props}
                    expanded={value.includes(item.value)}
                    disabled={!!(item.disabled || props.disabled)}
                    onToggle={() => toggle(item.value)}
                    indication={props.indication}
                    testId={props.testId}
                />
            ))}
        </v.root.View>
    );
}

/** Expansion panels, as Angular Material calls them, drawn as Material list rows:
 *  `<Accordion items={[{ value: "a", title: "Shipping", content: "…" }]} />`. */
export const Accordion = withEngine(AccordionImpl, "Accordion");

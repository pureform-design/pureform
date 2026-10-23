// The accordion: a column of items, each a tile holding its header (a pressable row: an optional
// leading icon, the title over an optional description, and the expand indicator, which turns over
// while the item is expanded) and, while expanded, its content. React Native has no Zag machine:
// the expanded items are React state, and each header says it's expanded to assistive technology.

import { accordionAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { accordionSelection, isPresent } from "@pureform/binding-core";
import type {
    AccordionBehaviorProps,
    AccordionItem,
    AccordionPart,
    AccordionVariantProps,
    IndicationProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { Expanding } from "../expand";
import { iconParts, ownText } from "../icon-style";
import { useSurfaceIndication } from "../indication";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

const [INDICATION] = accordionAnatomy.indication!;

export interface AccordionProps
    extends
        AccordionVariantProps,
        Omit<AccordionBehaviorProps, "id" | "ids">,
        IndicationProps {
    readonly items: readonly AccordionItem<ReactNode>[];
    readonly testId?: TestIdOverride<AccordionPart> | undefined;
}

interface ItemProps {
    readonly item: AccordionItem<ReactNode>;
    readonly selection: AccordionVariantProps;
    readonly expanded: boolean;
    readonly disabled: boolean;
    readonly onToggle: () => void;
    readonly indication: AccordionProps["indication"];
    readonly testId: AccordionProps["testId"];
}

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
    const icon = iconParts(slots, id);
    return (
        <v.item.View style={s.item} testID={id("item")}>
            <v.trigger.Pressable
                {...indication.handlers}
                role="button"
                aria-expanded={props.expanded}
                onPress={props.onToggle}
                disabled={props.disabled}
                style={{ ...s.trigger, ...unselectable }}
                testID={id("trigger")}
            >
                {icon("leading", item.leading)}
                <v.text.View style={s.text} testID={id("text")}>
                    <v.title.Text
                        selectable={false}
                        style={s.title}
                        testID={id("title")}
                    >
                        {item.title}
                    </v.title.Text>
                    {isPresent(item.description) ? (
                        <v.description.Text
                            selectable={false}
                            style={s.description}
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
                <v.content.View style={s.content} testID={id("content")}>
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
            style={s.root}
            testID={testIdOf(accordionAnatomy, "root", props.testId)}
        >
            {props.items.map((item) => (
                <Item
                    key={item.value}
                    item={item}
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

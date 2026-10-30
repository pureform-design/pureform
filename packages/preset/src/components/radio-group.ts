// A radio group's layout is styled separately from its radios. Orientation is shared with the
// binding's accessibility and keyboard behavior; the group is vertical unless requested otherwise.
import { typed } from "@pureform/core";
import { column, flex, row, start, wrap } from "@pureform/core/ast";

const pf = typed();

export const radioGroup = pf.slotComponent({
    name: "radioGroup",
    $meta: {
        description:
            "A group of radios laid out vertically by default, or in a wrapping horizontal row.",
    },
    slots: ["root"],
    variants: { orientation: ["vertical", "horizontal"] },
    recipe: () => ({
        base: { root: { display: flex, alignItems: start } },
        variants: {
            orientation: {
                vertical: { root: { flexDirection: column } },
                horizontal: { root: { flexDirection: row, flexWrap: wrap } },
            },
        },
        defaultVariants: { orientation: "vertical" },
    }),
});

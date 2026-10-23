// The pureform native select: a styled native `<select>` (with `<optgroup>`s) in the theme's plain
// form look, and a chevron in the theme's color. The platform draws and handles the list, so
// there is nothing to open, position or close. Material 3 has no such control (its select is the
// field with a menu, `select`), so the design is pureform's own: one box, no variants.
//
// The box is the plain input's (`plain-box.ts`): an outline in the theme's outline color, the theme's extra small
// radius, the body type, a state layer on hover and focus (on the root, following the select, under
// its transparent box), and the focus ring through the indication tokens. An invalid select
// (`aria-invalid`) takes the error color, and a disabled one the disabled colors. The chevron is a
// sibling that ignores the pointer, over the select's end padding (it reads the invalid and
// disabled states from the root, which holds the select); the select keeps its own arrow off
// (`appearance: none`).
//
//   <span class={root}>
//     <select class={select} id="size">
//       <optgroup class={group} label="Sizes">  (an `option` sits in a group or straight in the select)
//         <option class={option} value="s">Small</option>
//       </optgroup>
//     </select>
//     <span class={icon} aria-hidden="true">▾</span>
//   </span>

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    center,
    inlineFlex,
    none,
    notAllowed,
    pct,
    pointer,
    px,
    relative,
    slot,
    translateY,
    transparent,
    unitless,
    when,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import { size as sizeToken, spacing } from "@pureform/theme";

import type { IndicationToken } from "../state-layer";
import { PLAIN_BOX_TOKENS, plainBoxStyle } from "./plain-box";
import {
    componentTokens,
    DENSITY_TOKEN,
    disabledColor,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    slotStateLayer,
    sys,
} from "./shared";

const { tokens, ref } = componentTokens("nativeSelect", {
    ...PLAIN_BOX_TOKENS,
    height: px(40),
    iconColor: sys("onSurfaceVariant"),
    iconSize: sizeToken("iconMedium"),
    iconInset: spacing("3"),
    // The list's own colors, which browsers draw from these.
    listContainer: sys("surfaceContainer"),
    listColor: sys("onSurface"),
    ...DENSITY_TOKEN,
});

const FOCUS = (token: IndicationToken) => ref(token);

const pf = typed();

/** The native select: a box (`select`) in a `root` with a chevron (`icon`), and the list's
 *  `option` and `group` colors. */
export const createNativeSelect = () =>
    pf.slotComponent({
        name: "nativeSelect",
        $meta: {
            description:
                "Native select (pureform's own, not in M3): a styled native <select> with optgroups, drawn as the plain input and a chevron in the theme's color. The platform draws the list. Mark errors with aria-invalid.",
        },
        tokens,
        slots: ["root", "select", "icon", "group", "option"],
        indication: [
            {
                trigger: "select",
                surface: "root",
                centered: false,
                focus: "select",
            },
        ],
        structure: {
            root: ["select", "icon"],
            select: ["group", "option"],
        },
        recipe: () => ({
            base: {
                root: {
                    ...INDICATION_ROOT,
                    position: relative,
                    display: inlineFlex,
                    alignItems: center,
                    // The state layer, following the select inside it, under the select's transparent box.
                    borderRadius: ref("radius"),
                    backgroundColor: slotStateLayer(FOCUS, "select", {
                        base: ref("container"),
                        content: ref("inputColor"),
                        disabled: ref("container"),
                    }),
                },
                select: {
                    // The select's own states: `:has(:disabled)` would match a disabled option.
                    ...plainBoxStyle(ref, {
                        hover: "hover",
                        invalid: slot("select", "invalid"),
                        disabled: "disabled",
                    }),
                    appearance: none,
                    cursor: when().on("disabled", notAllowed).else(pointer),
                    width: pct(100),
                    height: add(ref("height"), ref("densityOffset")),
                    backgroundColor: transparent,
                    // Clear of the chevron.
                    paddingInlineEnd: add(
                        add(ref("iconInset"), ref("iconSize")),
                        spacing("2"),
                    ),
                    paddingBlockStart: px(0),
                    paddingBlockEnd: px(0),
                } satisfies StyleMap,
                icon: {
                    position: absolute,
                    top: pct(50),
                    insetInlineEnd: ref("iconInset"),
                    pointerEvents: none,
                    ...iconBox(ref("iconSize"), {
                        fill: iconFill(unitless(0)),
                        transform: [translateY(pct(-50))],
                    }),
                    color: when()
                        .on(slot("root", "invalid"), ref("errorColor"))
                        .on(
                            slot("root", "disabled"),
                            disabledColor("disabledContent"),
                        )
                        .else(ref("iconColor")),
                },
                group: {
                    color: ref("listColor"),
                    backgroundColor: ref("listContainer"),
                },
                option: {
                    color: ref("listColor"),
                    backgroundColor: ref("listContainer"),
                },
            },
        }),
    });

export const nativeSelect = createNativeSelect();

// The pureform file upload: a drop zone, a trigger button, and the list of chosen files. Material
// has no file upload; this is pureform's own, built from its parts: the trigger is a `button`,
// each file a `listItem` (the preview as its leading part, the name and size as its text, an
// `iconButton` to remove it as its trailing part) with an optional `linearProgress` under it for
// the progress the app reports, and a rejected file shows its error as supporting text.
//
// Markup: the label, the dropzone holding an icon, a headline, supporting text (the accepted
// types and limits) and the trigger, then the list. The dropzone is a drop target, not a button: it
// holds the trigger, which opens the file dialog and is what the keyboard reaches (a button inside
// a button is invalid); the hidden file input sits beside it, out of the way.
//
//   <div class={root}>
//     <label class={label}>Attachments</label>
//     <div class={dropzone}>
//       <span class={icon}>↑</span>
//       <span class={headline}>Drop files here</span>
//       <span class={supportingText}>PNG or PDF, up to 5 MB</span>
//       <button class="button">Choose files</button>
//     </div>
//     <ul class={itemGroup}>
//       <li class={item}><div class="listItem">…</div><div class="linearProgress">…</div></li>
//     </ul>
//   </div>
//
// The dropzone is outlined with a dashed line. While files are dragged over it (the `dragged`
// state) it takes the color group's container and a solid outline; `error` outlines it in the
// error color (a group not named `invalid`, which React Native would read as the state). The color group sets the drag-over color, as a button's sets its fill. It has no
// state layer or focus ring of its own: the trigger, a `button`, shows those.

import { typed } from "@pureform/core";
import {
    center,
    column,
    dashed,
    flex,
    none,
    px,
    solid,
    stretch,
    transparent,
} from "@pureform/core/ast";
import type { StyleMap } from "@pureform/core/ast";
import {
    colorRole,
    radius,
    size as sizeToken,
    spacing,
    textStyle,
} from "@pureform/theme";

import {
    DEFAULT_GROUP,
    componentTokens,
    defaultGroups,
    disabledColor,
    groupTokens,
    iconBox,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups } from "./shared";

const { tokens, ref } = componentTokens("fileUpload", {
    ...groupTokens(DEFAULT_GROUP),
    radius: radius("medium"),
    padding: spacing("6"),
    gap: spacing("2"),
    listGap: spacing("2"),
    container: sys("surface"),
    content: sys("onSurface"),
    supportingColor: sys("onSurfaceVariant"),
    iconSize: sizeToken("iconMedium"),
    outlineWidth: px(1),
    outlineColor: sys("outline"),
    errorColor: colorRole("error"),
});

const pf = typed();

/** Build the file upload with a `color` variant per group in `groups`, which colors the drop
 *  zone while files are dragged over it. */
export const createFileUpload = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "fileUpload",
            $meta: {
                description:
                    "File upload: a label, a dropzone (an icon, a headline, supporting text and the trigger button) and a list of files, each a list item with an optional progress bar under it. Set error for the error outline; dragged files tint the dropzone with the color group. A rejected file's reason goes in the error slot.",
            },
            tokens,
            slots: [
                "root",
                "label",
                "dropzone",
                "icon",
                "headline",
                "supportingText",
                "itemGroup",
                "item",
                "error",
            ],
            structure: {
                root: ["label", "dropzone", "itemGroup"],
                dropzone: ["icon", "headline", "supportingText"],
                itemGroup: ["item"],
                item: ["error"],
            },
            variants: {
                color: groups as ColorGroups,
                error: ["true", "false"],
            },
            recipe: () => ({
                base: {
                    root: {
                        display: flex,
                        flexDirection: column,
                        gap: ref("gap"),
                        color: ref("content"),
                    },
                    label: { textStyle: textStyle("labelLarge") },
                    dropzone: {
                        transition: stateTransition,
                        display: flex,
                        flexDirection: column,
                        alignItems: center,
                        gap: ref("gap"),
                        paddingBlockStart: ref("padding"),
                        paddingBlockEnd: ref("padding"),
                        paddingInlineStart: ref("padding"),
                        paddingInlineEnd: ref("padding"),
                        borderRadius: ref("radius"),
                        borderWidth: ref("outlineWidth"),
                        borderStyle: dashed,
                        borderColor: ref("outlineColor"),
                        backgroundColor: ref("container"),
                        color: ref("content"),
                        states: {
                            dragged: {
                                backgroundColor: ref("accentContainer"),
                                color: ref("onAccentContainer"),
                                borderStyle: solid,
                                borderColor: ref("accent"),
                            },
                            disabled: {
                                backgroundColor: transparent,
                                color: disabledColor("disabledContent"),
                                borderColor: disabledColor("disabledContainer"),
                                pointerEvents: none,
                            },
                        },
                    },
                    icon: iconBox(ref("iconSize")),
                    headline: { textStyle: textStyle("titleMedium") },
                    supportingText: {
                        textStyle: textStyle("bodyMedium"),
                        color: ref("supportingColor"),
                    },
                    itemGroup: {
                        display: flex,
                        flexDirection: column,
                        gap: ref("listGap"),
                    },
                    item: {
                        display: flex,
                        flexDirection: column,
                        alignItems: stretch,
                    },
                    error: {
                        textStyle: textStyle("bodyMedium"),
                        color: ref("errorColor"),
                    },
                } satisfies Record<string, StyleMap>,
                variants: {
                    // The default group's tokens are the base's.
                    color: Object.fromEntries(
                        groups.map((group) => [
                            group,
                            group === DEFAULT_GROUP
                                ? {}
                                : { root: { tokens: groupTokens(group) } },
                        ]),
                    ),
                    error: {
                        true: {
                            dropzone: { borderColor: ref("errorColor") },
                            supportingText: { color: ref("errorColor") },
                        },
                        false: {},
                    },
                },
                defaultVariants: { color: DEFAULT_GROUP, error: "false" },
            }),
        }),
    );

export const fileUpload = createFileUpload();

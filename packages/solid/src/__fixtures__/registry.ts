// A fake registry for the specs: button and checkbox classes that name the selection, so a test can
// read what the factory was given, plus a lazy chip whose loader the test controls.

import { createRegistry, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ComponentShape } from "@pureform/styling";

export type ButtonShape = {
    variants: { variant: "filled" | "text"; size: "small" | "large" };
    slots: "root" | "label" | "icon" | "touchTarget";
    tokens: "radius";
};

export type ChipShape = {
    variants: { variant: "assist" | "filter" };
    slots: "root" | "label";
    lazy: true;
} & ComponentShape;

const vars = { radius: "--pf-button-radius" } as const;

export const button: ClassFactory<ButtonShape> = (s) =>
    withTokenStyle(
        {
            root: {
                class: `button button--${String(s.variant ?? "filled")} button--${String(s.size ?? "small")}`,
            },
            label: { class: "button__label" },
            icon: { class: "button__icon" },
            touchTarget: { class: "button__touch-target" },
        },
        s.tokens,
        vars,
    );

export type CheckboxShape = {
    variants: { color: "primary" | "error" };
    slots:
        | "root"
        | "touchTarget"
        | "input"
        | "box"
        | "checkIcon"
        | "indeterminateIcon";
    tokens: "boxSize";
};

export const checkbox: ClassFactory<CheckboxShape> = (s) =>
    withTokenStyle(
        {
            root: {
                class: `checkbox checkbox--${String(s.color ?? "primary")}`,
            },
            touchTarget: { class: "checkbox__touch-target" },
            input: { class: "checkbox__input" },
            box: { class: "checkbox__box" },
            checkIcon: { class: "checkbox__check-icon" },
            indeterminateIcon: { class: "checkbox__indeterminate-icon" },
        },
        s.tokens,
        { boxSize: "--pf-checkbox-box-size" },
    );

export const chip: ClassFactory<ChipShape> = (s) => ({
    root: { class: `chip chip--${String(s.variant ?? "assist")}` },
    label: { class: "chip__label" },
});

/** A loader the test resolves by hand, counting its calls. */
export const deferredLoader = () => {
    let resolve!: (module: { chip: typeof chip }) => void;
    const promise = new Promise<{ chip: typeof chip }>((r) => {
        resolve = r;
    });
    const loader = { calls: 0, resolve: () => resolve({ chip }) };
    return {
        loader,
        lazy: () => {
            loader.calls++;
            return promise;
        },
    };
};

export const fakeRegistry = (lazy: () => Promise<unknown>) =>
    createRegistry({ button, checkbox, chip: { lazy } });

/** A static factory whose root class names the component and its selection
 *  (`icon-button icon-button--variant-filled icon-button--toggle-true`), and each other slot
 *  `<component>__<slot>`. */
const named =
    (
        component: string,
        slots: readonly string[],
    ): ClassFactory<ComponentShape> =>
    (s) => {
        const selected = Object.entries(s)
            .filter(([key, value]) => key !== "tokens" && value !== undefined)
            .map(([key, value]) => `${component}--${key}-${String(value)}`);
        return Object.fromEntries(
            slots.map((slot) => [
                slot,
                {
                    class:
                        slot === "root"
                            ? [component, ...selected].join(" ")
                            : `${component}__${slot}`,
                },
            ]),
        ) as never;
    };

/** The toggles' fake factories, all static: the switch, radio, chip, icon button, and FAB. */
export const togglesRegistry = () =>
    createRegistry({
        switchControl: named("switch", [
            "root",
            "touchTarget",
            "input",
            "track",
            "stateLayer",
            "handle",
            "icon",
        ]),
        radio: named("radio", ["root", "touchTarget", "input", "ring", "dot"]),
        chip: named("chip", ["root", "icon", "label", "touchTarget"]),
        iconButton: named("icon-button", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "outline",
        ]),
        fab: named("fab", [
            "root",
            "touchTarget",
            "container",
            "icon",
            "label",
        ]),
    });

const FIELD_SLOTS = [
    "root",
    "container",
    "leadingIcon",
    "input",
    "label",
    "trailingIcon",
    "supportingText",
] as const;

/** The text inputs' fake factories, all static: the text field, text area, select, and the menu
 *  the select draws its list with. */
export const textInputsRegistry = () =>
    createRegistry({
        textField: named("text-field", FIELD_SLOTS),
        textArea: named("text-area", FIELD_SLOTS),
        select: named("select", FIELD_SLOTS),
        menu: named("menu", ["root", "item", "itemLabel"]),
    });

/** The overlays' fake factories, all static: the menu, tooltip, dialog, scrim, and snackbar, and
 *  the button their ready-made triggers draw. */
export const overlaysRegistry = () =>
    createRegistry({
        menu: named("menu", [
            "root",
            "item",
            "itemLeading",
            "itemLabel",
            "itemTrailing",
            "itemTrailingText",
        ]),
        tooltip: named("tooltip", [
            "root",
            "subhead",
            "supportingText",
            "actions",
        ]),
        dialog: named("dialog", [
            "root",
            "icon",
            "headline",
            "body",
            "actions",
        ]),
        scrim: named("scrim", ["root"]),
        snackbar: named("snackbar", [
            "root",
            "supportingText",
            "action",
            "close",
        ]),
        button: named("button", ["root", "touchTarget", "icon", "label"]),
    });

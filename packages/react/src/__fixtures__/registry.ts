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

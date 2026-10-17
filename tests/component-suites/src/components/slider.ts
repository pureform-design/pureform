// The slider: `value` from 40 to 50, by a click in the middle of the native range input, which
// submits, resets, and takes the arrow keys by direction (the browser's own). The root's value
// token follows the value.

import { testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId } from "./types";

const ids = testIds.slider;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

/** The input's value, checked against the root's value token (a percentage of 0 to 100, so the
 *  value itself). */
const read = (host: HTMLElement): number => {
    const value = Number(input(host).value);
    const root = byTestId(host, ids.root);
    const token = [...root.style].find((name) => name.endsWith("value"));
    const percent = token && root.style.getPropertyValue(token).trim();
    if (percent !== String(value)) {
        throw new Error(
            `the input holds ${value}, the root's value token ${String(percent)}`,
        );
    }
    return value;
};

const click = (host: HTMLElement, options: ActOptions = {}) =>
    userEvent.click(input(host), options);

const step = (by: number) => 40 + by;

export const slider: ComponentCase = {
    component: "Slider",
    props: { "aria-label": "Volume" },
    root: ids.root,
    examples: {
        "at 40": { defaultValue: 40 },
        empty: { defaultValue: 0 },
        full: { defaultValue: 100 },
        "secondary color": { defaultValue: 60, color: "secondary" },
        "from 1 to 5": { min: 1, max: 5, defaultValue: 3 },
        disabled: { defaultValue: 40, disabled: true },
        "read-only": { defaultValue: 40, readOnly: true },
    },
    state: { prop: "value", from: 40, to: 50, act: click, read },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "volume", defaultValue: 40 },
            entries: [["volume", "40"]],
        },
        resets: true,
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: input,
        keys: [
            { key: "{Enter}", does: "nothing" },
            { key: " ", does: "nothing" },
            { key: "{Home}", does: "change", to: 0 },
            { key: "{End}", does: "change", to: 100 },
        ],
        arrows: {
            ltr: [
                { key: "{ArrowLeft}", does: "change", to: step(-1) },
                { key: "{ArrowRight}", does: "change", to: step(1) },
                { key: "{ArrowUp}", does: "change", to: step(1) },
                { key: "{ArrowDown}", does: "change", to: step(-1) },
            ],
            rtl: [
                { key: "{ArrowLeft}", does: "change", to: step(1) },
                { key: "{ArrowRight}", does: "change", to: step(-1) },
                { key: "{ArrowUp}", does: "change", to: step(1) },
                { key: "{ArrowDown}", does: "change", to: step(-1) },
            ],
        },
    },
};

// The slider: `value` from 40 to 50, by a click in the middle of the root (Zag's control), which
// submits through its hidden input, resets, and takes the arrow keys by direction on its handle.
// The root's value token, and the handle's `aria-valuenow`, follow the value.

import { sliderAnatomy, testIds } from "@pureform/anatomy";
import { userEvent } from "vitest/browser";

import type { ActOptions, ComponentCase } from "./types";
import { byTestId, ownSource } from "./types";

const ids = testIds.slider;

const handle = (host: HTMLElement) => byTestId(host, ids.handle);

/** The handle's value, checked against the root's value token (a percentage of 0 to 100, so the
 *  value itself). */
const read = (host: HTMLElement): number => {
    const value = Number(handle(host).getAttribute("aria-valuenow"));
    const root = byTestId(host, ids.root);
    const token = [...root.style].find((name) => name.endsWith("value"));
    const percent = token && root.style.getPropertyValue(token).trim();
    if (percent !== String(value)) {
        throw new Error(
            `the handle holds ${value}, the root's value token ${String(percent)}`,
        );
    }
    return value;
};

const click = (host: HTMLElement, options: ActOptions = {}) =>
    userEvent.click(byTestId(host, ids.root), options);

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
        round: { defaultValue: 40, handleShape: "round" },
        large: { defaultValue: 40, size: "large" },
        "from 1 to 5": { min: 1, max: 5, defaultValue: 3 },
        range: { defaultValue: [20, 60], "aria-label": ["From", "To"] },
        centered: { defaultValue: 30, centered: true },
        stops: { min: 0, max: 10, defaultValue: 4, stops: true },
        "value indicator": { defaultValue: 40, valueIndicator: true },
        vertical: {
            defaultValue: 40,
            orientation: "vertical",
            style: { height: "200px" },
        },
        disabled: { defaultValue: 40, disabled: true },
        "read-only": { defaultValue: 40, readOnly: true },
    },
    state: { prop: "value", from: 40, to: 50, act: click, read },
    form: {
        control: (host) =>
            byTestId<HTMLInputElement>(host, ids.input),
        aria: handle,
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
        focusable: handle,
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
    // The round slider: its state layer is the surface the anatomy declares. M3 Expressive's bar
    // slider (the default) draws none, only its handle narrowing on a press.
    indication: ownSource(sliderAnatomy, {
        props: { defaultValue: 40, handleShape: "round" },
        drags: true,
    }),
};

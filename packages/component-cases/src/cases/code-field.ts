// The code field: `value`, a character per cell, which typing fills (moving focus to the next
// cell); a hidden input submits the code. Only one cell is in the tab order: the focused one, else
// the first empty one. The arrow keys move between cells and change nothing.

import { testIds } from "@pureform/anatomy";

import { textValueOf } from "../aria";
import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.codeField;

const cells = (host: HTMLElement) => [
    ...host.querySelectorAll<HTMLInputElement>(`[data-testid="${ids.input}"]`),
];

/** The cell Tab reaches. */
const tabbable = (host: HTMLElement): HTMLInputElement =>
    cells(host).find((cell) => cell.tabIndex === 0) ?? cells(host)[0]!;

const hidden = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>('input[name="code"]');

/** The cells' characters: each textbox's value. */
const read = (host: HTMLElement): string[] =>
    cells(host).map((cell) => textValueOf(cell));

export const codeField: ComponentCase = {
    component: "CodeField",
    props: { label: "Verification code" },
    root: ids.root,
    examples: {
        empty: {},
        filled: { defaultValue: ["1", "2", "3", "4"] },
        partly: { defaultValue: ["1", "2"] },
        outlined: { variant: "outlined", defaultValue: ["1", "2"] },
        "six cells": { length: 6, otp: true },
        masked: { mask: true, defaultValue: ["1", "2", "3"] },
        placeholder: { placeholder: "○" },
        "supporting text": { supportingText: "Sent by text message" },
        error: { error: "That code is wrong", defaultValue: ["9", "9"] },
        "secondary color": { color: "secondary", defaultValue: ["1"] },
        compact: { density: "compact", defaultValue: ["1"] },
        disabled: { disabled: true, defaultValue: ["1", "2"] },
    },
    state: {
        prop: "value",
        from: ["1", "", "", ""],
        to: ["1", "2", "", ""],
        act: async (host, options: ActOptions = {}) => {
            await userEvent.click(cells(host)[1]!, options);
            await userEvent.keyboard("2");
        },
        read,
    },
    form: {
        control: (host) => hidden(host) ?? cells(host)[0]!,
        aria: (host) => cells(host)[0]!,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "code", defaultValue: ["1", "2", "3", "4"] },
            entries: [["code", "1234"]],
        },
        invalid: { props: { invalid: true } },
    },
    keyboard: {
        focusable: tabbable,
        keys: [
            { key: "2", does: "change" },
            { key: "{Enter}", does: "nothing" },
        ],
    },
};

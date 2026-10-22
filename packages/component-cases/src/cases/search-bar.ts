// The search bar: `value` from "" to "a", typed into the native search input, which submits and
// resets with the form; `required` blocks submitting until the user types.

import { testIds } from "@pureform/anatomy";

import type { ActOptions, ComponentCase } from "../types";
import { byTestId } from "../types";
import { userEvent } from "../user-event";

const ids = testIds.searchBar;

const input = (host: HTMLElement) =>
    byTestId<HTMLInputElement>(host, ids.input);

// A click to focus the input, then one key.
const type = async (host: HTMLElement, options: ActOptions = {}) => {
    await userEvent.click(input(host), options);
    await userEvent.keyboard("a");
};

export const searchBar: ComponentCase = {
    component: "SearchBar",
    props: { "aria-label": "Search mail", placeholder: "Search mail" },
    root: ids.root,
    examples: {
        empty: {},
        "with a leading icon": { leading: "⌕" },
        "with a mirrored leading icon": { leading: "←", mirrorLeading: true },
        "with a trailing icon": { leading: "⌕", trailing: "🎤" },
        "with a value": { defaultValue: "pureform" },
        disabled: { disabled: true, leading: "⌕" },
    },
    state: {
        prop: "value",
        from: "",
        to: "a",
        act: type,
        read: (host) => input(host).value,
    },
    form: {
        control: input,
        disabled: (host) =>
            byTestId(host, ids.root).hasAttribute("data-disabled"),
        submits: {
            props: { name: "q", defaultValue: "Ada" },
            entries: [["q", "Ada"]],
        },
        resets: true,
        required: { props: { name: "q", required: true }, satisfy: type },
    },
    keyboard: {
        focusable: input,
        keys: [
            { key: "a", does: "change" },
            { key: " ", does: "change", to: " " },
            { key: "{Enter}", does: "nothing" },
        ],
    },
};

// The Solid adapter on its own, with no warnings from Solid's dev diagnostics when the args and
// the theme change: a Button mounted through it, updated in place (a variant change keeps the
// element), and remounted when the args' keys change; and the Toast and GridList scenes, whose
// forwarded props follow the args. A hand-written story, out of the generated ones; it runs in
// the Solid project and skips the others.

import { Button } from "@pureform/solid/button";
import { CodeField } from "@pureform/solid/code-field";
import * as solidHooks from "@pureform/solid/storybook";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor } from "storybook/test";

import { solidAdapter } from "../solid/adapter";
import { GridList, Toast } from "../solid/scenes";

const DIAGNOSTIC = /^\[(STRICT_READ_UNTRACKED|IMMUTABLE_UPDATE_IN_STORE)\]/;

export default {
    title: "Tests/Solid adapter",
    parameters: { a11y: { test: "off" } },
} satisfies Meta;

export const Updates = {
    render: () => document.createElement("div"),
    play: async ({ globals, canvasElement }) => {
        if (globals["renderer"] !== "solid") return;
        const warned: string[] = [];
        const original = { warn: console.warn, error: console.error };
        for (const level of ["warn", "error"] as const) {
            console[level] = (...args: unknown[]) => {
                if (DIAGNOSTIC.test(String(args[0])))
                    warned.push(String(args[0]));
                original[level].apply(console, args);
            };
        }
        const host = document.createElement("div");
        canvasElement.append(host);
        const context = (
            name: string | undefined,
            scheme?: "light" | "dark",
        ) => ({
            theme: { scheme, name },
            globals: { renderer: "solid", scheme },
            decorators: solidHooks.decorators,
        });
        const handle = solidAdapter.mount(
            host,
            Button,
            { label: "Save", variant: "filled" },
            context(undefined, "light"),
        );
        try {
            const button = host.querySelector("button");
            await expect(button).not.toBeNull();
            for (const variant of ["tonal", "outlined", "text"]) {
                handle.update(
                    { label: "Save", variant },
                    context(undefined, "dark"),
                );
                await Promise.resolve();
            }
            handle.update(
                { label: "Saved", variant: "text" },
                context(undefined, "light"),
            );
            await expect(host.querySelector("button")).toBe(button);
            await expect(button!.textContent).toContain("Saved");
            // A key the first props lacked: remounted, with the new prop applied.
            handle.update(
                { label: "Saved", variant: "text", disabled: true },
                context(undefined),
            );
            await expect(host.querySelector("button")!.disabled).toBe(true);
            await expect(warned).toEqual([]);
        } finally {
            handle.unmount();
            host.remove();
            Object.assign(console, original);
        }
    },
} satisfies StoryObj;

/** The scenes (Toast's and GridList's, which take data besides props) forward the props they
 *  pass on lazily: a control changes them after the mount, with no warnings. */
export const Scenes = {
    render: () => document.createElement("div"),
    play: async ({ globals, canvasElement }) => {
        if (globals["renderer"] !== "solid") return;
        const warned: string[] = [];
        const original = { warn: console.warn, error: console.error };
        for (const level of ["warn", "error"] as const) {
            console[level] = (...args: unknown[]) => {
                if (DIAGNOSTIC.test(String(args[0])))
                    warned.push(String(args[0]));
                original[level].apply(console, args);
            };
        }
        const context = {
            theme: { scheme: undefined, name: undefined },
            globals: { renderer: "solid" },
            decorators: solidHooks.decorators,
        };
        const mounted: { unmount(): void }[] = [];
        const hosts: HTMLElement[] = [];
        const host = () => {
            const el = document.createElement("div");
            canvasElement.append(el);
            hosts.push(el);
            return el;
        };
        try {
            const toastHost = host();
            const toasts = [{ title: "Saved" }];
            const toast = solidAdapter.mount(
                toastHost,
                Toast,
                { toasts, closeLabel: "Dismiss" },
                context,
            );
            mounted.push(toast);
            const closer = (label: string) =>
                toastHost.querySelector(`button[aria-label="${label}"]`);
            await waitFor(() => expect(closer("Dismiss")).not.toBeNull());
            toast.update({ toasts, closeLabel: "Close" }, context);
            await waitFor(() => expect(closer("Close")).not.toBeNull());

            const gridHost = host();
            const tiles = [{ src: "", header: "One" }];
            const grid = solidAdapter.mount(
                gridHost,
                GridList,
                { "aria-label": "Photos", tiles },
                context,
            );
            mounted.push(grid);
            const named = (label: string) =>
                gridHost.querySelector(`[aria-label="${label}"]`);
            await waitFor(() => expect(named("Photos")).not.toBeNull());
            grid.update({ "aria-label": "Pictures", tiles }, context);
            await waitFor(() => expect(named("Pictures")).not.toBeNull());
            await expect(warned).toEqual([]);
        } finally {
            for (const handle of mounted) handle.unmount();
            for (const el of hosts) el.remove();
            Object.assign(console, original);
        }
    },
} satisfies StoryObj;

/** A control that changes a prop the machine takes (the code field's `length`) applies at once,
 *  without switching the renderer. */
export const MachineProps = {
    render: () => document.createElement("div"),
    play: async ({ globals, canvasElement }) => {
        if (globals["renderer"] !== "solid") return;
        const host = document.createElement("div");
        canvasElement.append(host);
        const context = {
            theme: { scheme: undefined, name: undefined },
            globals: { renderer: "solid" },
            decorators: solidHooks.decorators,
        };
        const handle = solidAdapter.mount(
            host,
            CodeField,
            { "aria-label": "Code", length: 4 },
            context,
        );
        try {
            const cells = () => host.querySelectorAll("input[data-index]");
            await expect(cells()).toHaveLength(4);
            for (const length of [6, 3]) {
                handle.update({ "aria-label": "Code", length }, context);
                await waitFor(() => expect(cells()).toHaveLength(length));
            }
        } finally {
            handle.unmount();
            host.remove();
        }
    },
} satisfies StoryObj;

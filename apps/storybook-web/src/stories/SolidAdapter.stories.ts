// The Solid adapter on its own, with no warnings from Solid's dev diagnostics when the args and
// the theme change: a Button mounted through it, updated in place (a variant change keeps the
// element), and remounted when the args' keys change. A hand-written story, out of the
// generated ones; it runs in the Solid project and skips the others.

import { Button } from "@pureform/solid/button";
import { CodeField } from "@pureform/solid/code-field";
import * as solidHooks from "@pureform/solid/storybook";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, waitFor } from "storybook/test";

import { solidAdapter } from "../solid/adapter";

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

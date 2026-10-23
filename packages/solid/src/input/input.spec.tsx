// Input and Textarea's text: controlled, uncontrolled and the form reset, beside the native
// handlers.

import { testIds } from "@pureform/anatomy";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Input } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";
import { Textarea } from "../textarea";

const withRegistry = async (view: () => unknown) => {
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));
    await settle();
};

describe.each([
    ["Input", Input, testIds.input.root],
    ["Textarea", Textarea, testIds.plainTextarea.root],
] as const)("%s's text", (_, Control, root) => {
    const element = () => byTestId<HTMLInputElement>(root);

    it("changes on its own uncontrolled, reporting once, and still calls onInput", async () => {
        const onValueChange = vi.fn();
        const onInput = vi.fn();
        await withRegistry(() => (
            <Control
                aria-label="Name"
                defaultValue="Ada"
                onValueChange={onValueChange}
                onInput={onInput}
            />
        ));
        expect(element().value).toBe("Ada");
        await userEvent.type(element(), "!");
        await settle();
        expect(element().value).toBe("Ada!");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "Ada!" });
        expect(onInput).toHaveBeenCalledTimes(1);
    });

    it("asks when controlled, goes back if the owner doesn't move, and follows the prop", async () => {
        const onValueChange = vi.fn();
        const [value, setValue] = createSignal("Ada");
        await withRegistry(() => (
            <Control
                aria-label="Name"
                value={value()}
                onValueChange={onValueChange}
            />
        ));
        await userEvent.type(element(), "!");
        await settle();
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "Ada!" });
        expect(element().value).toBe("Ada");
        setValue("Grace");
        await settle();
        expect(element().value).toBe("Grace");
        expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it("follows the owner who takes the change", async () => {
        const [value, setValue] = createSignal("Ada");
        await withRegistry(() => (
            <Control
                aria-label="Name"
                value={value()}
                onValueChange={(details) => setValue(details.value)}
            />
        ));
        await userEvent.type(element(), "!");
        await settle();
        expect(element().value).toBe("Ada!");
        expect(value()).toBe("Ada!");
    });

    it("goes back to its default on a form reset uncontrolled, reporting the reason", async () => {
        const onValueChange = vi.fn();
        await withRegistry(() => (
            <form data-testid="form">
                <Control
                    aria-label="Name"
                    name="name"
                    defaultValue="Ada"
                    onValueChange={onValueChange}
                />
            </form>
        ));
        await userEvent.type(element(), "!");
        const form = byTestId<HTMLFormElement>("form");
        expect(new FormData(form).get("name")).toBe("Ada!");
        form.reset();
        await vi.waitFor(() => expect(element().value).toBe("Ada"));
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "Ada",
                reason: "reset",
            }),
        );
    });

    it("reports its default on a form reset controlled, and waits for the owner", async () => {
        const onValueChange = vi.fn();
        await withRegistry(() => (
            <form data-testid="form">
                <Control
                    aria-label="Name"
                    value="Ada!"
                    defaultValue="Ada"
                    onValueChange={onValueChange}
                />
            </form>
        ));
        byTestId<HTMLFormElement>("form").reset();
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "Ada",
                reason: "reset",
            }),
        );
        await settle();
        expect(element().value).toBe("Ada!");
    });
});

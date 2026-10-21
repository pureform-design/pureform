import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TextField } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import {
    Errored,
    interact,
    mount,
    outside,
    quietly,
    settle,
} from "../testing/render";
import { TextArea } from "../text-area";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.textField;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={textInputsRegistry()}>
            {view}
        </PureformProvider>,
    );

const parts = (root: Element) =>
    [...root.querySelectorAll("[data-pf-part]")].map((part) =>
        part.getAttribute("data-pf-part"),
    );

describe("TextField, ready-made", () => {
    it("renders the field in the anatomy's structure, the label naming the input", async () => {
        withRegistry(
            <TextField label="Name" variant="outlined" autoComplete="name" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("text-field text-field--variant-outlined");
        expect(parts(root)).toEqual(["container", "input", "label"]);
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.placeholder).toBe(" ");
        expect(input.getAttribute("autocomplete")).toBe("name");
        expect(input.labels?.[0]).toBe(byTestId(ids.label));
        expect(byTestId(ids.label).textContent).toBe("Name");
    });

    it("renders the icons and supporting text only when given, and makes room for the icons", async () => {
        withRegistry(
            <TextField
                label="Search"
                leadingIcon="@"
                trailingIcon="×"
                supportingText="Any word"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(parts(root)).toEqual([
            "container",
            "leading-icon",
            "input",
            "label",
            "trailing-icon",
            "supporting-text",
        ]);
        expect(root.className).toContain("text-field--leadingIcon-true");
        expect(root.className).toContain("text-field--trailingIcon-true");
        expect(byTestId(ids.leadingIcon).getAttribute("aria-hidden")).toBe(
            "true",
        );
        expect(byTestId(ids.input).getAttribute("aria-describedby")).toBe(
            byTestId(ids.supportingText).id,
        );
    });

    it("takes typing, reports each change once, and marks the container filled", async () => {
        const onValueChange = vi.fn();
        withRegistry(<TextField label="Name" onValueChange={onValueChange} />);
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            false,
        );
        await interact(() => userEvent.type(input, "Ad"));
        expect(onValueChange.mock.calls.map(([d]) => d)).toEqual([
            { value: "A" },
            { value: "Ad" },
        ]);
        expect(byTestId(ids.container).hasAttribute("data-pf-filled")).toBe(
            true,
        );
    });

    it("controlled: shows the typed text only once the owner takes it", async () => {
        const value = outside("Ada");
        const onValueChange = vi.fn();
        withRegistry(
            <value.Holder>
                {(current) => (
                    <TextField
                        label="Name"
                        value={current}
                        onValueChange={onValueChange}
                    />
                )}
            </value.Holder>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await interact(() => userEvent.type(input, "m"));
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "Adam",
        });
        expect(input.value).toBe("Ada");
        await value.set("Grace");
        await settle();
        expect(input.value).toBe("Grace");
    });

    it("shows an error in place of the supporting text, and blocks submitting", async () => {
        withRegistry(
            <form>
                <TextField
                    label="Name"
                    name="name"
                    supportingText="As on your passport"
                    error="That name is taken"
                />
            </form>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.validationMessage).toBe("That name is taken");
        expect(byTestId(ids.supportingText).textContent).toBe(
            "That name is taken",
        );
        expect(input.form!.checkValidity()).toBe(false);
    });

    it("shows the browser's message under validate=native once the form is checked", async () => {
        withRegistry(
            <form>
                <TextField label="Name" required validate="native" />
            </form>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.hasAttribute("aria-invalid")).toBe(false);
        input.form!.checkValidity();
        await settle();
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(byTestId(ids.supportingText).textContent).toBe(
            input.validationMessage,
        );
    });

    it("resets to its default with the form, reported with reason reset", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <form>
                <TextField
                    label="Name"
                    defaultValue="Ada"
                    onValueChange={onValueChange}
                />
            </form>,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await interact(() => userEvent.type(input, "m"));
        input.form!.reset();
        await settle();
        await settle();
        expect(input.value).toBe("Ada");
        expect(onValueChange).toHaveBeenLastCalledWith({
            value: "Ada",
            reason: "reset",
        });
    });

    it("throws for a part outside Root", () => {
        quietly(() =>
            mount(
                <Errored>
                    <TextField.Input />
                </Errored>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<TextField.Input> must be inside <TextField.Root>/,
        );
    });
});

describe("TextArea, ready-made", () => {
    it("renders a native text area with its rows, and grows with autoGrow", async () => {
        withRegistry(
            <TextArea label="Bio" rows={4} autoGrow defaultValue="Hi" />,
        );
        await settle();
        const input = byTestId<HTMLTextAreaElement>(testIds.textArea.input);
        expect(input.tagName).toBe("TEXTAREA");
        expect(input.rows).toBe(4);
        expect(input.value).toBe("Hi");
        expect(byTestId(testIds.textArea.root).className).toContain(
            "text-area--autoGrow-true",
        );
    });
});

describe("TextField, affixes, counter and secure", () => {
    it("renders the prefix and suffix around the input, and makes room for them", async () => {
        withRegistry(
            <TextField label="Price" prefixText="$" suffixText=".00" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(parts(root)).toEqual([
            "container",
            "prefix-text",
            "input",
            "suffix-text",
            "label",
        ]);
        expect(root.className).toContain("text-field--prefixText-true");
        expect(root.className).toContain("text-field--suffixText-true");
        expect(byTestId(ids.prefixText).textContent).toBe("$");
    });

    it("counts toward counterMax beside the supporting text, and turns invalid past it", async () => {
        withRegistry(
            <TextField
                label="Name"
                supportingText="Your name"
                counterMax={3}
                defaultValue="Ada"
            />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(parts(root)).toEqual([
            "container",
            "input",
            "label",
            "supporting-text",
            "counter",
        ]);
        expect(byTestId(ids.counter).textContent).toBe("3 / 3");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-invalid")).toBeNull();
        await userEvent.type(input, "!");
        await settle();
        expect(byTestId(ids.counter).textContent).toBe("4 / 3");
        expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    it("keeps supporting text out of a row without a counter", async () => {
        withRegistry(<TextField label="Name" supportingText="Your name" />);
        await settle();
        expect(parts(byTestId(ids.root))).toEqual([
            "container",
            "input",
            "label",
            "supporting-text",
        ]);
    });

    it("hides a secure field's text until its trailing icon reveals it", async () => {
        withRegistry(<TextField label="Password" secure />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toContain("text-field--secure-true");
        expect(root.className).toContain("text-field--trailingIcon-true");
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.type).toBe("password");
        const toggle = byTestId<HTMLButtonElement>(ids.trailingIcon);
        expect(toggle.tagName).toBe("BUTTON");
        expect(toggle.getAttribute("aria-label")).toBe("Show password");
        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(toggle);
        await settle();
        expect(input.type).toBe("text");
        expect(toggle.getAttribute("aria-pressed")).toBe("true");
    });
});

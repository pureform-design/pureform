// The plain form primitives: Field connects the label, the control, the description and the error.

import { testIds } from "@pureform/anatomy";
import type { ChangeEventHandler, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Description, ErrorText, Field, Input, Label, Textarea } from ".";
import { FieldContext, useField } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const withRegistry = async (view: ReactNode) => {
    mount(
        <PureformProvider registry={displayRegistry()}>
            {view}
        </PureformProvider>,
    );
    await settle();
};

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};

describe("Field", () => {
    it("connects the label, the description and the error to the input", async () => {
        await withRegistry(
            <Field controlId="name" required invalid>
                <Label>Name</Label>
                <Input />
                <Description>As on your passport</Description>
                <ErrorText>Required</ErrorText>
            </Field>,
        );
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        const label = byTestId<HTMLLabelElement>(testIds.label.root);
        expect(byTestId(testIds.field.root).className).toBe("field");
        expect(label.htmlFor).toBe("name");
        expect(input.id).toBe("name");
        expect(input.labels?.[0]).toBe(label);
        expect(input.required).toBe(true);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.getAttribute("aria-describedby")).toBe(
            "name-description name-error",
        );
        expect(byTestId(testIds.description.root).id).toBe("name-description");
        expect(byTestId(testIds.errorText.root).id).toBe("name-error");
        const mark = byTestId(testIds.label.requiredIndicator);
        expect(mark.getAttribute("aria-hidden")).toBe("true");
        expect(mark.className).toBe("label__requiredIndicator");
    });

    it("gives the required mark the label's slotProps", async () => {
        await withRegistry(
            <Field required>
                <Label slotProps={{ requiredIndicator: { className: "mark" } }}>
                    Name
                </Label>
                <Input />
            </Field>,
        );
        expect(
            byTestId(testIds.label.requiredIndicator).classList.contains(
                "mark",
            ),
        ).toBe(true);
    });

    it("disables the control and dims the label", async () => {
        await withRegistry(
            <Field disabled>
                <Label>Bio</Label>
                <Textarea />
            </Field>,
        );
        const textarea = byTestId<HTMLTextAreaElement>(
            testIds.plainTextarea.root,
        );
        expect(textarea.tagName).toBe("TEXTAREA");
        expect(textarea.disabled).toBe(true);
        expect(textarea.labels?.length).toBe(1);
        expect(byTestId(testIds.label.root).getAttribute("aria-disabled")).toBe(
            "true",
        );
        expect(textarea.hasAttribute("aria-describedby")).toBe(false);
    });

    it("lets a piece's own state win, and keeps the control's own description", async () => {
        await withRegistry(
            <Field invalid disabled>
                <Input
                    invalid={false}
                    disabled={false}
                    aria-describedby="hint"
                />
                <Description>More</Description>
            </Field>,
        );
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.hasAttribute("aria-invalid")).toBe(false);
        expect(input.disabled).toBe(false);
        expect(input.getAttribute("aria-describedby")).toMatch(
            /^hint \S+-description$/,
        );
    });

    it("renders the ready-made pieces from its content", async () => {
        await withRegistry(
            <Field
                label="Email"
                description="We never share it"
                error="Taken"
            />,
        );
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.labels?.[0]?.textContent).toBe("Email");
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([
            byTestId(testIds.description.root).id,
            byTestId(testIds.errorText.root).id,
        ]);
    });

    it("works without a field, the date types keeping the browser's picker", async () => {
        await withRegistry(<Input type="date" aria-label="Day" invalid />);
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.type).toBe("date");
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.className).toBe("input");
    });

    it("is invalid while it holds an ErrorText, unless `invalid` says otherwise", async () => {
        await withRegistry(
            <>
                <Field controlId="a">
                    <Input />
                    <ErrorText>Required</ErrorText>
                </Field>
                <Field controlId="b" invalid={false}>
                    <Textarea />
                    <ErrorText>Required</ErrorText>
                </Field>
            </>,
        );
        expect(document.getElementById("a")?.getAttribute("aria-invalid")).toBe(
            "true",
        );
        expect(document.getElementById("b")?.hasAttribute("aria-invalid")).toBe(
            false,
        );
    });

    it("shares its state through FieldContext, for other controls", async () => {
        let seen: string | undefined;
        const Probe = () => {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            seen = useField()?.state.ids.control;
            return null;
        };
        await withRegistry(
            <Field controlId="probe">
                <Probe />
            </Field>,
        );
        expect(seen).toBe("probe");
        expect(FieldContext).toBeDefined();
    });
});

describe("Input and Textarea, value", () => {
    it("uncontrolled: keeps its own text and reports each change", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        const onChange = vi.fn<ChangeEventHandler<HTMLInputElement>>();
        await withRegistry(
            <Input
                aria-label="Name"
                defaultValue="Ada"
                onValueChange={onValueChange}
                onChange={onChange}
            />,
        );
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        await userEvent.type(input, "!");
        expect(input.value).toBe("Ada!");
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "Ada!",
        });
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("controlled: asks, and stays until the owner moves it", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        await withRegistry(
            <Textarea
                aria-label="Bio"
                value="Ada"
                onValueChange={onValueChange}
            />,
        );
        const textarea = byTestId<HTMLTextAreaElement>(
            testIds.plainTextarea.root,
        );
        await userEvent.click(textarea);
        await userEvent.keyboard("{End}!");
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith({
            value: "Ada!",
        });
        await vi.waitFor(() => expect(textarea.value).toBe("Ada"));
    });

    it("a form reset puts it back, reported with reason reset", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        await withRegistry(
            <form data-testid="form">
                <Input
                    aria-label="Name"
                    name="name"
                    defaultValue="Ada"
                    onValueChange={onValueChange}
                />
            </form>,
        );
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        await userEvent.type(input, "!");
        byTestId<HTMLFormElement>("form").reset();
        await vi.waitFor(() => expect(input.value).toBe("Ada"));
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "Ada",
                reason: "reset",
            }),
        );
    });
});

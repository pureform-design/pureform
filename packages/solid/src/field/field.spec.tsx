// The plain form primitives: Field connects the label, the control, the description and the error.

import { testIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { Description, ErrorText, Field, Input, Label, Textarea } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const withRegistry = async (view: () => unknown) => {
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));
    await settle();
};

describe("Field", () => {
    it("connects the label, the description and the error to the input", async () => {
        await withRegistry(() => (
            <Field controlId="name" required invalid>
                <Label>Name</Label>
                <Input />
                <Description>As on your passport</Description>
                <ErrorText>Required</ErrorText>
            </Field>
        ));
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

    it("disables the control and dims the label", async () => {
        await withRegistry(() => (
            <Field disabled>
                <Label>Bio</Label>
                <Textarea />
            </Field>
        ));
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
        await withRegistry(() => (
            <Field invalid disabled>
                <Input
                    invalid={false}
                    disabled={false}
                    aria-describedby="hint"
                />
                <Description>More</Description>
            </Field>
        ));
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.hasAttribute("aria-invalid")).toBe(false);
        expect(input.disabled).toBe(false);
        expect(input.getAttribute("aria-describedby")).toMatch(
            /^hint \S+-description$/,
        );
    });

    it("renders the ready-made pieces from its content", async () => {
        await withRegistry(() => (
            <Field
                label="Email"
                description="We never share it"
                error="Taken"
            />
        ));
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.labels?.[0]?.textContent).toBe("Email");
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([
            byTestId(testIds.description.root).id,
            byTestId(testIds.errorText.root).id,
        ]);
    });

    it("works without a field, the date types keeping the browser's picker", async () => {
        await withRegistry(() => (
            <Input type="date" aria-label="Day" invalid />
        ));
        const input = byTestId<HTMLInputElement>(testIds.input.root);
        expect(input.type).toBe("date");
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.className).toBe("input");
    });

    it("is marked invalid by a mounted ErrorText, unless invalid says otherwise", async () => {
        await withRegistry(() => (
            <>
                <Field controlId="a">
                    <Input data-testid="a" />
                    <ErrorText>Taken</ErrorText>
                </Field>
                <Field controlId="b" invalid={false}>
                    <Input data-testid="b" />
                    <ErrorText>Taken</ErrorText>
                </Field>
            </>
        ));
        expect(byTestId("a").getAttribute("aria-invalid")).toBe("true");
        expect(byTestId("a").getAttribute("aria-describedby")).toBe("a-error");
        expect(byTestId("b").hasAttribute("aria-invalid")).toBe(false);
    });
});

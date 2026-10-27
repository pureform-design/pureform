import { useState } from "react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Description, ErrorText, Field, Input, Label, Textarea } from ".";
import type { ChangeDetails } from "..";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, computed, interact, mount } from "../testing/render";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "field",
        "label",
        "input",
        "plainTextarea",
        "description",
        "errorText",
    ]);
});

const render = (view: ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

describe("Field", () => {
    it("labels the input by the label, and marks it required and invalid", async () => {
        await render(
            <Field required invalid>
                <Label>Name</Label>
                <Input />
                <Description>As on your passport</Description>
                <ErrorText>Required</ErrorText>
            </Field>,
        );
        const input = byTestId("pf-input-root");
        const label = byTestId("pf-label-root");
        expect(input.getAttribute("aria-labelledby")).toBe(label.id);
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.getAttribute("aria-required")).toBe("true");
        expect(byTestId("pf-label-required-indicator").textContent).toBe("*");
        expect(computed("pf-field-root").flexDirection).toBe("column");
        // The error color, not the outline's.
        expect(computed("pf-input-root").borderTopColor).toBe(
            computed("pf-error-text-root").color,
        );
    });

    it("disables the textarea and dims the label", async () => {
        await render(
            <Field disabled>
                <Label>Bio</Label>
                <Textarea />
            </Field>,
        );
        const textarea = byTestId(
            "pf-plain-textarea-root",
        ) as HTMLTextAreaElement;
        expect(textarea.tagName).toBe("TEXTAREA");
        expect(textarea.disabled).toBe(true);
        expect(computed("pf-label-root").color).not.toBe(
            computed("pf-plain-textarea-root").borderTopColor,
        );
    });

    it("renders the ready-made pieces and takes typing", async () => {
        await render(<Field label="Email" description="We never share it" />);
        const input = byTestId("pf-input-root") as HTMLInputElement;
        expect(byTestId("pf-label-root").textContent).toBe("Email");
        expect(byTestId("pf-description-root").textContent).toBe(
            "We never share it",
        );
        await interact(() => userEvent.type(input, "ada"));
        expect(input.value).toBe("ada");
    });

    it("marks the field invalid while an ErrorText is mounted, unless invalid says otherwise", async () => {
        await render(
            <>
                <Field testId="a">
                    <Input testId="a-input" />
                    <ErrorText>Wrong</ErrorText>
                </Field>
                <Field invalid={false}>
                    <Input testId="b-input" />
                    <ErrorText>Wrong</ErrorText>
                </Field>
            </>,
        );
        expect(byTestId("a-input-root").getAttribute("aria-invalid")).toBe(
            "true",
        );
        expect(byTestId("b-input-root").getAttribute("aria-invalid")).not.toBe(
            "true",
        );
    });
});

describe("Input and Textarea's value", () => {
    it("keeps its own text uncontrolled, and reports each change once", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        const onChangeText = vi.fn<(text: string) => unknown>();
        await render(
            <Textarea
                defaultValue="a"
                onValueChange={onValueChange}
                onChangeText={onChangeText}
            />,
        );
        const textarea = byTestId(
            "pf-plain-textarea-root",
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe("a");
        await interact(() => userEvent.fill(textarea, "ab"));
        expect(textarea.value).toBe("ab");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "ab" });
        expect(onChangeText).toHaveBeenLastCalledWith("ab");
    });

    it("only moves with the prop controlled", async () => {
        const onValueChange =
            vi.fn<(details: ChangeDetails<"value", string>) => void>();
        await render(<Input value="fixed" onValueChange={onValueChange} />);
        const input = byTestId("pf-input-root") as HTMLInputElement;
        await interact(() => userEvent.type(input, "x"));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "fixedx" });
        expect(input.value).toBe("fixed");
    });

    it("follows its owner controlled", async () => {
        function Owner() {
            const [value, setValue] = useState("");
            return (
                <Input
                    value={value}
                    onValueChange={(details) =>
                        setValue(details.value.toUpperCase())
                    }
                />
            );
        }
        await render(<Owner />);
        const input = byTestId("pf-input-root") as HTMLInputElement;
        await interact(() => userEvent.type(input, "ab"));
        expect(input.value).toBe("AB");
    });
});

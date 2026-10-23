import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Description, ErrorText, Field, Input, Label, Textarea } from ".";
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
        "textarea",
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
        const textarea = byTestId("pf-textarea-root") as HTMLTextAreaElement;
        expect(textarea.tagName).toBe("TEXTAREA");
        expect(textarea.disabled).toBe(true);
        expect(computed("pf-label-root").color).not.toBe(
            computed("pf-textarea-root").borderTopColor,
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
});

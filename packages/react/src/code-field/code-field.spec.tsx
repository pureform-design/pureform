import { testIds } from "@pureform/anatomy";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CodeField } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const ids = testIds.codeField;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={textInputsRegistry()}>
            {view}
        </PureformProvider>,
    );

const paste = (target: HTMLElement, text: string) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    target.dispatchEvent(
        new ClipboardEvent("paste", {
            clipboardData,
            bubbles: true,
            cancelable: true,
        }),
    );
};

const cells = () => screen.getAllByTestId(ids.input) as HTMLInputElement[];

describe("CodeField, ready-made", () => {
    it("renders the label, a cell per character and the supporting text", async () => {
        withRegistry(
            <CodeField
                label="Code"
                length={6}
                otp
                variant="outlined"
                supportingText="Sent by text"
            />,
        );
        await settle();
        const root = screen.getByTestId(ids.root);
        expect(root.className).toBe("code-field code-field--variant-outlined");
        expect(cells()).toHaveLength(6);
        expect(cells()[0]!.getAttribute("autocomplete")).toBe("one-time-code");
        expect(cells()[0]!.getAttribute("aria-label")).toBe("pin code 1 of 6");
        expect(screen.getByTestId(ids.label).textContent).toBe("Code");
    });

    it("moves to the next cell as it's typed, and back with Backspace", async () => {
        const onValueComplete = vi.fn();
        withRegistry(
            <CodeField label="Code" onValueComplete={onValueComplete} />,
        );
        await settle();
        cells()[0]!.focus();
        await userEvent.keyboard("12");
        await settle();
        expect(document.activeElement).toBe(cells()[2]);
        // Backspace in the empty third cell clears the second and moves there.
        await userEvent.keyboard("{Backspace}");
        await settle();
        expect(document.activeElement).toBe(cells()[1]);
        expect(cells().map((cell) => cell.value)).toEqual(["1", "", "", ""]);
        await userEvent.keyboard("234");
        await settle();
        expect(onValueComplete).toHaveBeenCalledWith(
            expect.objectContaining({ valueAsString: "1234" }),
        );
    });

    it("fills every cell from a pasted code", async () => {
        withRegistry(<CodeField label="Code" />);
        await settle();
        cells()[0]!.focus();
        paste(cells()[0]!, "9876");
        // Zag fills the cells a frame after the paste.
        await expect
            .poll(() => cells().map((cell) => cell.value))
            .toEqual(["9", "8", "7", "6"]);
    });

    it("masks a PIN, and marks the cells invalid with an error", async () => {
        withRegistry(<CodeField label="PIN" mask error="Wrong PIN" />);
        await settle();
        expect(cells()[0]!.type).toBe("password");
        expect(cells()[0]!.getAttribute("aria-invalid")).toBe("true");
        expect(screen.getByTestId(ids.supportingText).textContent).toBe(
            "Wrong PIN",
        );
    });
});

describe("CodeField, changed props", () => {
    it("follows a changed length", async () => {
        const view = (length: number) => (
            <PureformProvider registry={textInputsRegistry()}>
                <CodeField label="Code" length={length} />
            </PureformProvider>
        );
        const { rerender } = render(view(4));
        await settle();
        expect(cells()).toHaveLength(4);
        rerender(view(6));
        await settle();
        expect(cells()).toHaveLength(6);
        rerender(view(3));
        await settle();
        expect(cells()).toHaveLength(3);
    });
});

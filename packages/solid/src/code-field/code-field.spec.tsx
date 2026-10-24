import { testIds } from "@pureform/anatomy";
import { flush, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { CodeField } from ".";
import { PureformProvider } from "..";
import { textInputsRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.codeField;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={textInputsRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

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

const cells = () => [
    ...document.querySelectorAll<HTMLInputElement>(
        `[data-testid="${ids.input}"]`,
    ),
];

describe("CodeField, ready-made", () => {
    it("takes a function of each cell in the input's keys", async () => {
        withRegistry(() => (
            <CodeField
                label="Code"
                length={3}
                defaultValue={["1", "2"]}
                class={{
                    input: (cell) => (cell.value ? "filled" : undefined),
                    control: "row",
                }}
                style={{ input: (cell) => ({ opacity: (cell.index + 1) / 4 }) }}
                slotProps={{
                    input: (cell) => ({ title: `cell ${cell.index}` }),
                }}
                unstyled={{ input: (cell) => cell.index === 2 }}
            />
        ));
        await settle();
        const [first, second, third] = cells();
        expect(first!.classList.contains("filled")).toBe(true);
        expect(second!.classList.contains("filled")).toBe(true);
        expect(third!.className).toBe("");
        expect(second!.style.opacity).toBe("0.5");
        expect(third!.title).toBe("cell 2");
        expect(byTestId(ids.control).classList.contains("row")).toBe(true);
    });

    it("renders the label, a cell per character and the supporting text", async () => {
        withRegistry(() => (
            <CodeField
                label="Code"
                length={6}
                otp
                variant="outlined"
                supportingText="Sent by text"
            />
        ));
        await settle();
        expect(byTestId(ids.root).className).toBe(
            "code-field code-field--variant-outlined",
        );
        expect(cells()).toHaveLength(6);
        expect(cells()[0]!.getAttribute("autocomplete")).toBe("one-time-code");
        expect(cells()[0]!.getAttribute("aria-label")).toBe("pin code 1 of 6");
        expect(byTestId(ids.label).textContent).toBe("Code");
    });

    it("moves to the next cell as it's typed, and back with Backspace", async () => {
        const onValueComplete = vi.fn();
        withRegistry(() => (
            <CodeField label="Code" onValueComplete={onValueComplete} />
        ));
        await settle();
        cells()[0]!.focus();
        await userEvent.keyboard("12");
        await settle();
        expect(document.activeElement).toBe(cells()[2]);
        // Backspace in the empty third cell clears the second and moves there.
        await userEvent.keyboard("{Backspace}");
        await settle();
        expect(document.activeElement).toBe(cells()[1]);
        await expect
            .poll(() => cells().map((cell) => cell.value))
            .toEqual(["1", "", "", ""]);
        await userEvent.keyboard("234");
        await settle();
        expect(onValueComplete).toHaveBeenCalledWith(
            expect.objectContaining({ valueAsString: "1234" }),
        );
    });

    it("fills every cell from a pasted code", async () => {
        withRegistry(() => <CodeField label="Code" />);
        await settle();
        cells()[0]!.focus();
        paste(cells()[0]!, "9876");
        // Zag fills the cells a frame after the paste.
        await expect
            .poll(() => cells().map((cell) => cell.value))
            .toEqual(["9", "8", "7", "6"]);
    });

    it("masks a PIN, and marks the cells invalid with an error", async () => {
        withRegistry(() => <CodeField label="PIN" mask error="Wrong PIN" />);
        await settle();
        expect(cells()[0]!.type).toBe("password");
        expect(cells()[0]!.getAttribute("aria-invalid")).toBe("true");
        expect(byTestId(ids.supportingText).textContent).toBe("Wrong PIN");
    });
});

describe("CodeField, reactive props", () => {
    it("follows a changed length without a remount", async () => {
        const [length, setLength] = createSignal(4);
        withRegistry(() => <CodeField label="Code" length={length()} />);
        await settle();
        expect(cells()).toHaveLength(4);
        const first = cells()[0]!;
        setLength(6);
        flush();
        await settle();
        expect(cells()).toHaveLength(6);
        expect(cells()[0]).toBe(first);
        setLength(3);
        flush();
        await settle();
        expect(cells()).toHaveLength(3);
    });
});

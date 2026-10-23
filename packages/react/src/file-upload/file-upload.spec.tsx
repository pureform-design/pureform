import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { FileUpload } from ".";
import { PureformProvider } from "..";
import { fileUploadRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.fileUpload;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={fileUploadRegistry()}>
            {view}
        </PureformProvider>,
    );

const file = (name: string, size = 10, type = "text/plain") =>
    new File([new Uint8Array(size)], name, { type });

const hiddenInput = () =>
    document.querySelector<HTMLInputElement>('input[type="file"]')!;

const names = () =>
    [...document.querySelectorAll('[data-pf-part="headline"]')]
        .filter((node) => node.closest("li"))
        .map((node) => node.textContent);

describe("FileUpload, ready-made", () => {
    it("renders the label, the drop zone with its trigger, and no list while empty", async () => {
        withRegistry(
            <FileUpload label="Attachments" supportingText="Up to 5 MB" />,
        );
        await settle();
        const root = byTestId(ids.root);
        expect(root.className).toBe("file-upload");
        expect(byTestId(ids.label).textContent).toBe("Attachments");
        expect(byTestId(ids.headline).textContent).toBe("Drop files here");
        expect(byTestId(ids.supportingText).textContent).toBe("Up to 5 MB");
        const trigger = byTestId(ids.dropzone).querySelector("button")!;
        expect(trigger.textContent).toBe("Choose files");
        expect(document.querySelector("ul")).toBeNull();
        // The drop zone takes drops; it isn't a button around the trigger.
        expect(byTestId(ids.dropzone).getAttribute("role")).not.toBe("button");
    });

    it("lists the files chosen, each a list item with its size and a remove button", async () => {
        const onFileChange = vi.fn();
        withRegistry(
            <FileUpload label="Files" maxFiles={3} onFileChange={onFileChange} />,
        );
        await userEvent.upload(hiddenInput(), [file("a.txt"), file("b.txt", 2048)]);
        await settle();
        expect(names()).toEqual(["a.txt", "b.txt"]);
        expect(onFileChange).toHaveBeenCalled();
        await userEvent.click(
            screen.getByRole("button", { name: "Remove a.txt" }),
        );
        await settle();
        expect(names()).toEqual(["b.txt"]);
    });

    it("shows why a file was rejected, in place of its size", async () => {
        withRegistry(
            <FileUpload label="Files" maxFiles={3} maxFileSize={100} />,
        );
        await userEvent.upload(hiddenInput(), [file("big.txt", 500)]);
        await settle();
        const item = document.querySelector<HTMLElement>('li[data-type="rejected"]')!;
        expect(item.querySelector('[data-pf-part="error"]')?.textContent).toBe(
            "The file is too large",
        );
    });

    it("shows a progress bar under a file while the app reports one", async () => {
        withRegistry(
            <FileUpload
                label="Files"
                defaultAcceptedFiles={[file("a.txt"), file("b.txt")]}
                maxFiles={2}
                progress={(item) => (item.name === "a.txt" ? 40 : undefined)}
            />,
        );
        await settle();
        const bars = document.querySelectorAll('[role="progressbar"]');
        expect(bars).toHaveLength(1);
        expect(bars[0]?.getAttribute("aria-valuenow")).toBe("40");
    });

    it("marks the drop zone invalid and shows an error message", async () => {
        withRegistry(<FileUpload label="Files" error="Add a file" />);
        await settle();
        expect(byTestId(ids.root).className).toContain("file-upload--invalid-true");
        expect(byTestId(ids.supportingText).textContent).toBe("Add a file");
    });

    it("tints the drop zone while files are dragged over it", async () => {
        withRegistry(<FileUpload label="Files" />);
        const zone = byTestId(ids.dropzone);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file("a.txt"));
        zone.dispatchEvent(
            new DragEvent("dragover", { dataTransfer, bubbles: true, cancelable: true }),
        );
        await settle();
        expect(zone.hasAttribute("data-pf-dragging")).toBe(true);
        zone.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
        await settle();
        expect(zone.hasAttribute("data-pf-dragging")).toBe(false);
    });

    it("takes the file dialog's files through the hidden input, which submits under its name", async () => {
        withRegistry(<FileUpload label="Files" name="docs" />);
        await settle();
        expect(hiddenInput().name).toBe("docs");
    });

    it("prefixes the item parts' test ids from Root's", async () => {
        withRegistry(
            <FileUpload
                label="Files"
                testId="docs"
                defaultAcceptedFiles={[file("a.txt")]}
            />,
        );
        await settle();
        expect(byTestId("docs-root")).toBeTruthy();
        expect(byTestId("docs-item-headline").textContent).toBe("a.txt");
    });
});

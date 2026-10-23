import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import * as fileUpload from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

afterEach(() => {
    document.body.innerHTML = "";
});

const MARKUP = `<div data-root>
    <div data-dropzone><button data-trigger>Choose</button><input data-input></div>
</div>`;

const render = (props: MachineProps<fileUpload.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = MARKUP;
    document.body.append(host);
    const $ = <E extends Element>(selector: string) =>
        host.querySelector<E>(selector)!;
    const running = run(
        fileUpload.machine,
        fileUpload.connect,
        { id: "files", ...props },
        (api, spread) => {
            spread($("[data-root]"), api.getRootProps());
            spread($("[data-dropzone]"), api.getDropzoneProps());
            spread($("[data-trigger]"), api.getTriggerProps());
            spread($("[data-input]"), api.getHiddenInputProps());
        },
    );
    return { ...running, $ };
};

const file = (name: string, size = 10, type = "text/plain") =>
    new File([new Uint8Array(size)], name, { type });

describe("file upload machine", () => {
    it("is Zag's file upload, its dropzone a button the keyboard reaches", () => {
        const { $, stop } = render({});
        const zone = $<HTMLElement>("[data-dropzone]");
        expect(zone.getAttribute("role")).toBe("button");
        expect(zone.tabIndex).toBe(0);
        expect($("[data-input]").getAttribute("type")).toBe("file");
        stop();
    });

    it("accepts the files chosen and rejects the ones over the size limit", async () => {
        const { $, api, stop } = render({ maxFiles: 3, maxFileSize: 100 });
        await userEvent.upload($<HTMLInputElement>("[data-input]"), [
            file("a.txt"),
            file("big.txt", 500),
        ]);
        await settle();
        expect(api().acceptedFiles.map((item) => item.name)).toEqual(["a.txt"]);
        expect(api().rejectedFiles.map((item) => item.errors)).toEqual([
            ["FILE_TOO_LARGE"],
        ]);
        stop();
    });

    it("shows the drag over the dropzone", async () => {
        const { $, api, stop } = render({});
        const zone = $<HTMLElement>("[data-dropzone]");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file("a.txt"));
        zone.dispatchEvent(
            new DragEvent("dragover", {
                dataTransfer,
                bubbles: true,
                cancelable: true,
            }),
        );
        await settle();
        expect(api().dragging).toBe(true);
        expect($("[data-root]").hasAttribute("data-dragging")).toBe(true);
        zone.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
        await settle();
        expect(api().dragging).toBe(false);
        stop();
    });

    it("removes a file", async () => {
        const { api, stop } = render({
            defaultAcceptedFiles: [file("a.txt"), file("b.txt")],
            maxFiles: 2,
        });
        api().deleteFile(api().acceptedFiles[0]!);
        await settle();
        expect(api().acceptedFiles.map((item) => item.name)).toEqual(["b.txt"]);
        stop();
    });
});

// The props a ready-made takes for the components it draws (`menuProps`, `selectProps`, …) reach
// those components' parts.

import { compositeTestIds } from "@pureform/anatomy";
import { describe, expect, it } from "vitest";

import { PureformProvider } from ".";
import {
    colorPickerRegistry,
    datePickersRegistry,
    displayRegistry,
    fileUploadRegistry,
    overlaysRegistry,
    paginatorRegistry,
    textInputsRegistry,
} from "./__fixtures__/registry";
import { ColorPicker } from "./color-picker";
import { DateInput } from "./date-input";
import { Field } from "./field";
import { FileUpload } from "./file-upload";
import { Paginator } from "./paginator";
import { Select } from "./select";
import { SplitButton } from "./split-button";
import { Table } from "./table";
import { byTestId, mount, settle } from "./testing/mount";

const all = (selector: string) => [
    ...document.querySelectorAll<HTMLElement>(selector),
];
const ITEMS = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
];

describe("props of drawn components", () => {
    it("Select: menuProps reach the list's parts and its test ids", async () => {
        mount(() => (
            <PureformProvider registry={textInputsRegistry()}>
                <Select
                    label="Size"
                    items={ITEMS}
                    defaultOpen
                    menuProps={{
                        class: { item: "row", root: "list" },
                        testId: "sizes",
                    }}
                />
            </PureformProvider>
        ));
        await settle();
        const items = all('[data-testid="sizes-item"]');
        expect(items).toHaveLength(2);
        for (const item of items) expect(item.className).toContain("row");
        expect(byTestId("sizes-content").className.split(" ")).toContain(
            "list",
        );
    });

    it("SplitButton: menuProps reach the menu's items", async () => {
        mount(() => (
            <PureformProvider registry={overlaysRegistry()}>
                <SplitButton
                    label="Save"
                    items={ITEMS}
                    defaultOpen
                    menuProps={{ class: { item: "row" } }}
                />
            </PureformProvider>
        ));
        await settle();
        const items = all(`[data-testid="${compositeTestIds.menu.item}"]`);
        expect(items).toHaveLength(2);
        for (const item of items) expect(item.className).toContain("row");
    });

    it("DateInput: cancelButtonProps and confirmButtonProps reach each button", async () => {
        mount(() => (
            <PureformProvider registry={datePickersRegistry()}>
                <DateInput
                    locale="en-GB"
                    cancelButtonProps={{ class: { root: "cancel" } }}
                    confirmButtonProps={{ testId: "ok" }}
                />
            </PureformProvider>
        ));
        await settle();
        expect(
            [...document.querySelectorAll("button")].find(
                (b) => b.textContent === "Cancel",
            )!.className,
        ).toContain("cancel");
        expect(byTestId("ok-root").textContent).toBe("OK");
    });

    it("Paginator: selectProps reach the page-size select", async () => {
        mount(() => (
            <PureformProvider registry={paginatorRegistry()}>
                <Paginator count={95} selectProps={{ testId: "size" }} />
            </PureformProvider>
        ));
        await settle();
        expect(byTestId("size-root")).toBeTruthy();
    });

    it("Table: checkboxProps reach every selection checkbox", async () => {
        mount(() => (
            <PureformProvider registry={displayRegistry()}>
                <Table
                    columns={[{ id: "name", header: "Name" }]}
                    rows={[
                        { id: "h", name: "Hydrogen" },
                        { id: "he", name: "Helium" },
                    ]}
                    selectionMode="multiple"
                    checkboxProps={{ testId: "pick" }}
                />
            </PureformProvider>
        ));
        await settle();
        expect(all('[data-testid="pick-root"]')).toHaveLength(3);
    });

    it("Field: the pieces' props reach the ready-made pieces", async () => {
        mount(() => (
            <PureformProvider registry={displayRegistry()}>
                <Field
                    label="Name"
                    inputProps={{ placeholder: "Ada", class: "wide" }}
                    labelProps={{ testId: "name-label" }}
                />
            </PureformProvider>
        ));
        await settle();
        const input = document.querySelector<HTMLElement>(
            '[placeholder="Ada"]',
        )!;
        expect(input.className).toContain("wide");
        expect(byTestId("name-label-root").textContent).toBe("Name");
    });

    it("ColorPicker: textFieldProps reach the hex field", async () => {
        mount(() => (
            <PureformProvider registry={colorPickerRegistry()}>
                <ColorPicker
                    defaultValue="#ff0000"
                    textFieldProps={{ testId: "hex" }}
                />
            </PureformProvider>
        ));
        await settle();
        expect((byTestId("hex-input") as HTMLInputElement).value).toBe(
            "FF0000",
        );
    });

    it("FileUpload: buttonProps reach the trigger", async () => {
        mount(() => (
            <PureformProvider registry={fileUploadRegistry()}>
                <FileUpload label="Files" buttonProps={{ testId: "pick" }} />
            </PureformProvider>
        ));
        await settle();
        expect(byTestId("pick-root").textContent).toContain("Choose files");
    });
});

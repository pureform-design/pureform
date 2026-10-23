import { testIds } from "@pureform/anatomy";
import { Platform } from "react-native";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NativeSelect } from ".";
import { PureformProvider } from "..";
import { Description, ErrorText, Field, Label } from "../field";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";
import { MISSING_MENU_MESSAGE } from "./native-select";

const ids = testIds.nativeSelect;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "nativeSelect",
        "menu",
        "ripple",
        "button",
        "iconButton",
        "list",
        "listItem",
        "scrim",
        "field",
        "label",
        "description",
        "errorText",
    ]);
});

afterEach(() => {
    Platform.OS = "web";
});

const withRegistry = (view: React.ReactNode) =>
    mount(
        <PureformProvider registry={registry} motion="reduce">
            {view}
        </PureformProvider>,
    );

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium", group: "Sizes" },
    { value: "l", label: "Large", group: "Sizes", disabled: true },
];

describe("NativeSelect on React Native", () => {
    it("renders a real <select> on the web, with its groups, and takes a choice", async () => {
        const onValueChange = vi.fn();
        await withRegistry(
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                placeholder="Pick"
                name="size"
                onValueChange={onValueChange}
            />,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.localName).toBe("select");
        expect(select.name).toBe("size");
        expect(select.getAttribute("aria-label")).toBe("Size");
        expect(select.querySelectorAll("optgroup")).toHaveLength(1);
        expect([...select.options].map((option) => option.value)).toEqual([
            "",
            "s",
            "m",
            "l",
        ]);
        await interact(() => userEvent.selectOptions(select, "m"));
        expect(select.value).toBe("m");
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "m" });
    });

    it("marks it invalid and disabled", async () => {
        await withRegistry(
            <NativeSelect aria-label="Size" items={ITEMS} invalid disabled />,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.getAttribute("aria-invalid")).toBe("true");
        expect(select.disabled).toBe(true);
    });

    it("falls back to the Material menu where the platform menu isn't installed, and says so", async () => {
        Platform.OS = "ios";
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const onValueChange = vi.fn();
        await withRegistry(
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                defaultValue="s"
                onValueChange={onValueChange}
            />,
        );
        const trigger = byTestId(ids.select);
        expect(trigger.getAttribute("role")).toBe("combobox");
        expect(trigger.textContent).toBe("Small");
        expect(warn).toHaveBeenCalledWith(MISSING_MENU_MESSAGE);
        await interact(() => userEvent.click(trigger));
        const option = [...document.querySelectorAll('[role="menuitem"]')].find(
            (item) => item.textContent === "Medium",
        );
        expect(option).toBeDefined();
        await interact(() => userEvent.click(option as HTMLElement));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "m" });
        warn.mockRestore();
    });

    it("takes the Field's id, states and descriptions, its own props winning", async () => {
        await withRegistry(
            <Field required controlId="size">
                <Label>Size</Label>
                <NativeSelect items={ITEMS} />
                <Description>Pick one</Description>
                <ErrorText>Required</ErrorText>
            </Field>,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.id).toBe("size");
        expect(select.required).toBe(true);
        expect(select.getAttribute("aria-invalid")).toBe("true");
        expect(select.getAttribute("aria-labelledby")).toBe(
            byTestId("pf-label-root").id,
        );
        const describedBy = select.getAttribute("aria-describedby")!.split(" ");
        expect(describedBy).toEqual([
            byTestId("pf-description-root").id,
            byTestId("pf-error-text-root").id,
        ]);
    });

    it("joins its own aria-describedby with the Field's", async () => {
        await withRegistry(
            <Field controlId="size">
                <NativeSelect items={ITEMS} aria-describedby="hint" />
                <Description>Pick one</Description>
            </Field>,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.getAttribute("aria-describedby")!.split(" ")).toEqual([
            "hint",
            byTestId("pf-description-root").id,
        ]);
    });

    it("types the value by multiple", () => {
        const one = <NativeSelect items={ITEMS} defaultValue="s" />;
        const several = (
            <NativeSelect items={ITEMS} multiple defaultValue={["s"]} />
        );
        // @ts-expect-error an array needs `multiple`
        const wrong = <NativeSelect items={ITEMS} defaultValue={["s"]} />;
        // @ts-expect-error `multiple` takes an array
        const wrongMany = <NativeSelect items={ITEMS} multiple value="s" />;
        expect([one, several, wrong, wrongMany]).toHaveLength(4);
    });

    it("lets its own props win inside a Field", async () => {
        await withRegistry(
            <Field disabled>
                <NativeSelect items={ITEMS} disabled={false} id="own" />
            </Field>,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.id).toBe("own");
        expect(select.disabled).toBe(false);
    });

    it("chooses several on the web with multiple", async () => {
        const onValueChange = vi.fn();
        await withRegistry(
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                multiple
                name="size"
                onValueChange={onValueChange}
            />,
        );
        const select = byTestId(ids.select) as HTMLSelectElement;
        expect(select.multiple).toBe(true);
        await interact(() => userEvent.selectOptions(select, ["s", "m"]));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["s", "m"] });
        expect(
            [...select.selectedOptions].map((option) => option.value),
        ).toEqual(["s", "m"]);
    });

    it("toggles checkbox items in the Material menu with multiple, staying open", async () => {
        Platform.OS = "ios";
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const onValueChange = vi.fn();
        await withRegistry(
            <NativeSelect
                aria-label="Size"
                items={[...ITEMS, { value: "x", label: "Huge" }]}
                multiple
                placeholder="None"
                onValueChange={onValueChange}
            />,
        );
        const trigger = byTestId(ids.select);
        expect(trigger.textContent).toBe("None");
        await interact(() => userEvent.click(trigger));
        const item = (label: string) =>
            [...document.querySelectorAll('[role="menuitemcheckbox"]')].find(
                (entry) => entry.textContent === label,
            ) as HTMLElement;
        await interact(() => userEvent.click(item("Huge")));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["x"] });
        await interact(() => userEvent.click(item("Small")));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["s", "x"] });
        expect(item("Small").getAttribute("aria-checked")).toBe("true");
        expect(trigger.textContent).toBe("Small, Huge");
        await interact(() => userEvent.click(item("Huge")));
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["s"] });
        warn.mockRestore();
    });
});

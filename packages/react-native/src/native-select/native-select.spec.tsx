import { testIds } from "@pureform/anatomy";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Platform } from "react-native";

import { NativeSelect } from ".";
import { MISSING_MENU_MESSAGE } from "./native-select";
import { PureformProvider } from "..";
import { presetRegistry } from "../testing/registry";
import type { TestRegistry } from "../testing/registry";
import { byTestId, interact, mount } from "../testing/render";

const ids = testIds.nativeSelect;

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry(["nativeSelect", "menu", "ripple", "button", "iconButton", "list", "listItem", "scrim"]);
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
});

import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NativeSelect } from ".";
import { PureformProvider } from "..";
import { nativeSelectRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.nativeSelect;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={nativeSelectRegistry()}>
            {view}
        </PureformProvider>,
    );

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium", group: "Sizes" },
    { value: "l", label: "Large", group: "Sizes", disabled: true },
];

describe("NativeSelect, ready-made", () => {
    it("renders a native select with its options and groups, and a chevron hidden from assistive technology", async () => {
        withRegistry(
            <NativeSelect aria-label="Size" items={ITEMS} placeholder="Pick" />,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.localName).toBe("select");
        expect(select.getAttribute("aria-label")).toBe("Size");
        expect([...select.options].map((option) => option.value)).toEqual([
            "",
            "s",
            "m",
            "l",
        ]);
        expect(select.querySelectorAll("optgroup")).toHaveLength(1);
        expect(select.options[3]?.disabled).toBe(true);
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.root).contains(select)).toBe(true);
    });

    it("marks the select invalid, required, named and disabled", async () => {
        withRegistry(
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                invalid
                required
                name="size"
                disabled
            />,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.getAttribute("aria-invalid")).toBe("true");
        expect(select.required).toBe(true);
        expect(select.name).toBe("size");
        expect(select.disabled).toBe(true);
    });

    it("shows the default, reports a change, and follows a controlled value", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <>
                <NativeSelect
                    testId="free"
                    aria-label="Free"
                    items={ITEMS}
                    defaultValue="m"
                    onValueChange={onValueChange}
                />
                <NativeSelect
                    testId="held"
                    aria-label="Held"
                    items={ITEMS}
                    value="s"
                />
            </>,
        );
        await settle();
        const free = byTestId<HTMLSelectElement>("free-select");
        const held = byTestId<HTMLSelectElement>("held-select");
        expect(free.value).toBe("m");
        await userEvent.selectOptions(free, "s");
        expect(free.value).toBe("s");
        expect(onValueChange).toHaveBeenLastCalledWith({ value: "s" });
        // Controlled: it goes back to the owner's value.
        await userEvent.selectOptions(held, "m");
        expect(held.value).toBe("s");
    });

    it("reports a form reset with its reason, and puts the select back", async () => {
        const onValueChange = vi.fn();
        withRegistry(
            <form data-testid="form">
                <NativeSelect
                    aria-label="Size"
                    items={ITEMS}
                    defaultValue="m"
                    onValueChange={onValueChange}
                />
            </form>,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        await userEvent.selectOptions(select, "s");
        (byTestId("form") as HTMLFormElement).reset();
        await vi.waitFor(() => expect(select.value).toBe("m"));
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: "m",
                reason: "reset",
            }),
        );
    });

    it("composes from its parts", async () => {
        withRegistry(
            <NativeSelect.Root>
                <NativeSelect.Select aria-label="Size">
                    <NativeSelect.Group label="Sizes">
                        <NativeSelect.Option value="m">
                            Medium
                        </NativeSelect.Option>
                    </NativeSelect.Group>
                </NativeSelect.Select>
                <NativeSelect.Icon>▾</NativeSelect.Icon>
            </NativeSelect.Root>,
        );
        await settle();
        expect(byTestId<HTMLSelectElement>(ids.select).value).toBe("m");
        expect(byTestId(ids.icon).textContent).toBe("▾");
    });
});

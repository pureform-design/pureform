import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NativeSelect } from ".";
import { PureformProvider } from "..";
import { nativeSelectRegistry } from "../__fixtures__/registry";
import { Description, ErrorText, Field, Label } from "../field";
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
    it("takes a function of each option and group in their keys", async () => {
        withRegistry(
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                placeholder="Pick"
                className={{
                    option: ({ index, item }) =>
                        `option-${index}-${item.value}`,
                    icon: "chevron",
                }}
                style={{
                    option: ({ index }) => ({ opacity: index < 0 ? 0.5 : 1 }),
                }}
                slotProps={{
                    option: ({ item }) => ({ title: item.label }),
                    group: ({ index, item }) => ({ title: `${index} ${item}` }),
                }}
                unstyled={{ option: ({ index }) => index === 0 }}
            />,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        const [placeholder, small, medium] = [...select.options];
        expect(placeholder!.classList.contains("option--1-")).toBe(true);
        expect(placeholder!.style.opacity).toBe("0.5");
        expect(small!.className).toBe("option-0-s");
        expect(medium!.classList.contains("option-1-m")).toBe(true);
        expect(medium!.className).not.toBe("option-1-m");
        expect(medium!.title).toBe("Medium");
        expect(select.querySelector("optgroup")!.title).toBe("0 Sizes");
        expect(byTestId(ids.icon).classList.contains("chevron")).toBe(true);
    });

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
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: string;
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
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
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: string;
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
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

describe("NativeSelect, inside a Field", () => {
    it("takes the field's id, states and descriptions; the label names it", async () => {
        withRegistry(
            <Field controlId="size" required disabled>
                <Label>Size</Label>
                <NativeSelect items={ITEMS} />
                <Description>Pick one</Description>
                <ErrorText>Required</ErrorText>
            </Field>,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.id).toBe("size");
        expect(select.labels[0]?.textContent).toContain("Size");
        expect(select.required).toBe(true);
        expect(select.disabled).toBe(true);
        expect(select.getAttribute("aria-invalid")).toBe("true");
        expect(select.getAttribute("aria-describedby")).toBe(
            "size-description size-error",
        );
    });

    it("joins its own aria-describedby with the field's", async () => {
        withRegistry(
            <Field controlId="size">
                <NativeSelect items={ITEMS} aria-describedby="hint" />
                <Description>Pick one</Description>
            </Field>,
        );
        await settle();
        expect(
            byTestId<HTMLSelectElement>(ids.select).getAttribute(
                "aria-describedby",
            ),
        ).toBe("hint size-description");
    });

    it("types the value by multiple", () => {
        const one = <NativeSelect items={ITEMS} defaultValue="s" />;
        const several = (
            <NativeSelect items={ITEMS} multiple defaultValue={["s"]} />
        );
        // @ts-expect-error an array needs `multiple`
        const wrong = <NativeSelect items={ITEMS} defaultValue={["s"]} />;
        const onMany = (details: { value: readonly string[] }) => details;
        const wrongReport = (
            // @ts-expect-error one value reports a string, not an array
            <NativeSelect items={ITEMS} onValueChange={onMany} />
        );
        expect([one, several, wrong, wrongReport]).toHaveLength(4);
    });

    it("keeps its own props over the field's", async () => {
        withRegistry(
            <Field controlId="size" invalid disabled>
                <NativeSelect items={ITEMS} invalid={false} disabled={false} />
            </Field>,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.disabled).toBe(false);
        expect(select.hasAttribute("aria-invalid")).toBe(false);
    });
});

const SIZES = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium" },
    { value: "l", label: "Large" },
];

describe("NativeSelect, multiple", () => {
    it("chooses several options, reporting them as an array", async () => {
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
        withRegistry(
            <NativeSelect
                aria-label="Sizes"
                items={SIZES}
                multiple
                defaultValue={["s"]}
                onValueChange={onValueChange}
            />,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.multiple).toBe(true);
        await userEvent.selectOptions(select, ["s", "l"]);
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["s", "l"],
            }),
        );
    });

    it("submits every chosen value, and resets to the default", async () => {
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
        withRegistry(
            <form data-testid="form">
                <NativeSelect
                    aria-label="Sizes"
                    name="sizes"
                    items={SIZES}
                    multiple
                    defaultValue={["s", "m"]}
                    onValueChange={onValueChange}
                />
            </form>,
        );
        await settle();
        const form = byTestId<HTMLFormElement>("form");
        expect(new FormData(form).getAll("sizes")).toEqual(["s", "m"]);
        const select = byTestId<HTMLSelectElement>(ids.select);
        await userEvent.selectOptions(select, ["l"]);
        form.reset();
        await vi.waitFor(() =>
            expect(new FormData(form).getAll("sizes")).toEqual(["s", "m"]),
        );
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["s", "m"],
                reason: "reset",
            }),
        );
    });

    it("follows a controlled value", async () => {
        withRegistry(
            <NativeSelect
                aria-label="Sizes"
                items={SIZES}
                multiple
                value={["m", "l"]}
            />,
        );
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(
            [...select.selectedOptions].map((option) => option.value),
        ).toEqual(["m", "l"]);
    });
});

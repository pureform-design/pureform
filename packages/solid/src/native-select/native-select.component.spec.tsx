import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { NativeSelect } from ".";
import { PureformProvider } from "..";
import { nativeSelectRegistry } from "../__fixtures__/registry";
import { Description, ErrorText, Field, Label } from "../field";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.nativeSelect;

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={nativeSelectRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "m", label: "Medium", group: "Sizes" },
    { value: "l", label: "Large", group: "Sizes", disabled: true },
];

describe("NativeSelect, ready-made", () => {
    it("takes a function of each option and group in their keys", async () => {
        withRegistry(() => (
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                placeholder="Pick"
                class={{
                    option: ({ index, item }) =>
                        `option-${index}-${item.value}`,
                    icon: "chevron",
                }}
                style={{
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    option: ({ index }) => ({ opacity: index < 0 ? 0.5 : 1 }),
                }}
                slotProps={{
                    option: ({ item }) => ({ title: item.label }),
                    group: ({ index, item }) => ({ title: `${index} ${item}` }),
                }}
                unstyled={{ option: ({ index }) => index === 0 }}
            />
        ));
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
        withRegistry(() => (
            <NativeSelect aria-label="Size" items={ITEMS} placeholder="Pick" />
        ));
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
        withRegistry(() => (
            <NativeSelect
                aria-label="Size"
                items={ITEMS}
                invalid
                required
                name="size"
                disabled
            />
        ));
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
        withRegistry(() => (
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
            </>
        ));
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
        withRegistry(() => (
            <form data-testid="form">
                <NativeSelect
                    aria-label="Size"
                    items={ITEMS}
                    defaultValue="m"
                    onValueChange={onValueChange}
                />
            </form>
        ));
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
        withRegistry(() => (
            <NativeSelect.Root>
                <NativeSelect.Select aria-label="Size">
                    <NativeSelect.Group label="Sizes">
                        <NativeSelect.Option value="m">
                            Medium
                        </NativeSelect.Option>
                    </NativeSelect.Group>
                </NativeSelect.Select>
                <NativeSelect.Icon>▾</NativeSelect.Icon>
            </NativeSelect.Root>
        ));
        await settle();
        expect(byTestId<HTMLSelectElement>(ids.select).value).toBe("m");
        expect(byTestId(ids.icon).textContent).toBe("▾");
    });
});

describe("NativeSelect, multiple", () => {
    const COLORS = [
        { value: "r", label: "Red" },
        { value: "g", label: "Green" },
        { value: "b", label: "Blue" },
    ];

    it("chooses several, reports an array, submits each, and resets to its default", async () => {
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
        withRegistry(() => (
            <form data-testid="form">
                <NativeSelect
                    aria-label="Colors"
                    name="colors"
                    items={COLORS}
                    multiple
                    defaultValue={["b"]}
                    onValueChange={onValueChange}
                />
            </form>
        ));
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        expect(select.multiple).toBe(true);
        expect(select.options[2]?.selected).toBe(true);
        await userEvent.selectOptions(select, ["r", "g"]);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["r", "g"] });
        const form = byTestId<HTMLFormElement>("form");
        expect(new FormData(form).getAll("colors")).toEqual(["r", "g"]);
        form.reset();
        await vi.waitFor(() =>
            expect(
                [...select.selectedOptions].map((option) => option.value),
            ).toEqual(["b"]),
        );
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["b"],
                reason: "reset",
            }),
        );
    });

    it("goes back to the owner's value when controlled, and reports the default on a reset", async () => {
        const onValueChange =
            vi.fn<
                (details: {
                    readonly value: readonly string[];
                    readonly reason?: "reset" | undefined;
                }) => void
            >();
        withRegistry(() => (
            <form data-testid="form">
                <NativeSelect
                    aria-label="Colors"
                    items={COLORS}
                    multiple
                    value={["g"]}
                    defaultValue={["r"]}
                    onValueChange={onValueChange}
                />
            </form>
        ));
        await settle();
        const select = byTestId<HTMLSelectElement>(ids.select);
        const chosen = () =>
            [...select.selectedOptions].map((option) => option.value);
        expect(chosen()).toEqual(["g"]);
        await userEvent.selectOptions(select, ["r", "b"]);
        expect(onValueChange).toHaveBeenLastCalledWith({ value: ["r", "b"] });
        await vi.waitFor(() => expect(chosen()).toEqual(["g"]));
        byTestId<HTMLFormElement>("form").reset();
        await vi.waitFor(() =>
            expect(onValueChange).toHaveBeenLastCalledWith({
                value: ["r"],
                reason: "reset",
            }),
        );
    });
});

describe("NativeSelect, in a Field", () => {
    it("joins its own aria-describedby with the field's", async () => {
        withRegistry(() => (
            <Field controlId="size">
                <NativeSelect
                    items={[{ value: "s", label: "Small" }]}
                    aria-describedby="hint"
                />
                <Description>Pick one</Description>
            </Field>
        ));
        await settle();
        expect(
            byTestId<HTMLSelectElement>(ids.select).getAttribute(
                "aria-describedby",
            ),
        ).toBe("hint size-description");
    });

    it("connects a NativeSelect inside it, its own props winning", async () => {
        withRegistry(() => (
            <>
                <Field controlId="size" required>
                    <Label>Size</Label>
                    <NativeSelect
                        testId="size"
                        items={[{ value: "s", label: "Small" }]}
                    />
                    <Description>Pick one</Description>
                    <ErrorText>Required</ErrorText>
                </Field>
                <Field controlId="other" disabled>
                    <NativeSelect
                        testId="other"
                        id="mine"
                        disabled={false}
                        items={[{ value: "s", label: "Small" }]}
                    />
                </Field>
            </>
        ));
        await settle();
        const select = byTestId<HTMLSelectElement>("size-select");
        const label = byTestId<HTMLLabelElement>(testIds.label.root);
        expect(select.id).toBe("size");
        expect(label.htmlFor).toBe("size");
        expect(select.labels?.[0]).toBe(label);
        expect(select.required).toBe(true);
        expect(select.getAttribute("aria-invalid")).toBe("true");
        expect(select.getAttribute("aria-describedby")).toBe(
            "size-description size-error",
        );
        const other = byTestId<HTMLSelectElement>("other-select");
        expect(other.id).toBe("mine");
        expect(other.disabled).toBe(false);
    });
});

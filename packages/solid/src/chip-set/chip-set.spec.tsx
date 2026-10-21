import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ChipSet } from ".";
import { PureformProvider } from "..";
import { chipSetRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={chipSetRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

const chips = () =>
    [...byTestId(testIds.chipSet.root).children] as HTMLButtonElement[];

describe("ChipSet, ready-made", () => {
    it("renders a wrapping group of chips in the set's variants", async () => {
        withRegistry(() => (
            <ChipSet
                aria-label="Suggestions"
                variant="elevated"
                items={[{ label: "Reply" }, { label: "Forward" }]}
            />
        ));
        await settle();
        const root = byTestId(testIds.chipSet.root);
        expect(root.getAttribute("role")).toBe("group");
        expect(root.getAttribute("aria-label")).toBe("Suggestions");
        expect(root.className).toBe("chip-set");
        expect(chips().map((chip) => chip.className)).toEqual([
            "chip chip--variant-elevated",
            "chip chip--variant-elevated",
        ]);
        expect(chips()[0]?.hasAttribute("aria-pressed")).toBe(false);
    });

    it("keeps its chips on one line with singleLine", async () => {
        withRegistry(() => <ChipSet singleLine items={[{ label: "A" }]} />);
        await settle();
        expect(byTestId(testIds.chipSet.root).className).toBe(
            "chip-set chip-set--singleLine-true",
        );
    });

    it("keeps one filter chip on in a single-select set", async () => {
        const onValueChange = vi.fn();
        withRegistry(() => (
            <ChipSet
                selectable="single"
                defaultValue={["vegan"]}
                onValueChange={onValueChange}
                items={[
                    { value: "vegan", label: "Vegan" },
                    { value: "nut-free", label: "Nut free" },
                ]}
            />
        ));
        await settle();
        const [vegan, nutFree] = chips();
        expect(vegan?.getAttribute("aria-pressed")).toBe("true");
        expect(vegan?.className).toContain("chip--toggle-true");
        expect(nutFree?.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(nutFree!);
        await settle();
        expect(vegan?.getAttribute("aria-pressed")).toBe("false");
        expect(nutFree?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange.mock.calls.at(-1)?.[0]).toMatchObject({
            value: ["nut-free"],
        });
    });

    it("presses several in a multiple-select set, and moves focus with the arrows", async () => {
        withRegistry(() => (
            <ChipSet
                selectable="multiple"
                items={[{ label: "A" }, { label: "B" }, { label: "C" }]}
            />
        ));
        await settle();
        const [a, b, c] = chips();
        await userEvent.click(a!);
        await userEvent.click(c!);
        await settle();
        expect(
            chips().map((chip) => chip.getAttribute("aria-pressed")),
        ).toEqual(["true", "false", "true"]);
        c?.focus();
        await userEvent.keyboard("{ArrowLeft}");
        await settle();
        expect(document.activeElement).toBe(b);
    });
});

describe("ChipSet, composed", () => {
    it("gives its chips the set's variants, under their own", async () => {
        withRegistry(() => (
            <ChipSet.Root color="secondary" variant="elevated">
                <ChipSet.Chip label="Left" variant="outlined" />
                <ChipSet.Chip label="Right" />
            </ChipSet.Root>
        ));
        await settle();
        const [left, right] = chips();
        expect(left?.className).toBe(
            "chip chip--variant-outlined chip--color-secondary",
        );
        expect(right?.className).toBe(
            "chip chip--variant-elevated chip--color-secondary",
        );
    });
});
